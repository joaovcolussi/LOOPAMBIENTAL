'use client';

import { MapPin, Truck } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  DealSummary,
  isAuthenticationError,
  LogisticsRequest,
} from '../../../lib/api';
import { DashboardHeader } from '../../../components/dashboard-header';
import { ShipmentTracking } from '../../../components/shipment-tracking';
import { formatMoney, formatQuantity } from '../../../lib/format';
import {
  dealStatusLabels,
  label,
  logisticsQuoteStatusLabels,
  logisticsRequestStatusLabels,
} from '../../../lib/labels';

function counterpartName(deal: DealSummary) {
  const company =
    deal.side === 'BUYER' ? deal.sellerCompany : deal.buyerCompany;
  return company.tradeName || company.legalName;
}

export default function LogisticsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LogisticsRequest[]>([]);
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [dealId, setDealId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [pickupWindow, setPickupWindow] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const reload = useCallback(async () => {
    const { requests: result } = await api.logistics();
    setRequests(result);
  }, []);

  useEffect(() => {
    Promise.all([api.logistics(), api.deals({ status: 'active' })])
      .then(([logisticsResult, dealResult]) => {
        setRequests(logisticsResult.requests);
        setDeals(dealResult.deals);
        const requested = new URLSearchParams(window.location.search).get(
          'dealId',
        );
        const selected =
          dealResult.deals.find((deal) => deal.id === requested) ??
          dealResult.deals[0];
        if (selected) {
          setDealId(selected.id);
          setQuantity(String(Number(selected.proposal.quantity)));
          setUnit(selected.listing.unit);
        }
      })
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/logistica');
        else setError('Não foi possível carregar seus dados de logística.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  function chooseDeal(id: string) {
    setDealId(id);
    const deal = deals.find((item) => item.id === id);
    if (deal) {
      setQuantity(String(Number(deal.proposal.quantity)));
      setUnit(deal.listing.unit);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setBusy('create');
    try {
      await api.createLogisticsRequest({
        dealId,
        origin,
        destination,
        quantity: quantity.replace(',', '.'),
        unit,
        pickupWindow: pickupWindow || undefined,
      });
      await reload();
      setMessage(
        'Solicitação enviada. Aguarde cotações ou gere cotações simuladas.',
      );
      setOrigin('');
      setDestination('');
      setPickupWindow('');
    } catch {
      setError(
        'Não foi possível criar a solicitação. Confira a negociação e os dados informados.',
      );
    } finally {
      setBusy('');
    }
  }

  async function run(key: string, action: () => Promise<unknown>, ok: string) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await action();
      await reload();
      setMessage(ok);
    } catch {
      setError('Não foi possível concluir a ação de logística.');
    } finally {
      setBusy('');
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando logística...</div>
      </main>
    );

  return (
    <main className="dashboard-page">
      <DashboardHeader />
      <section className="dashboard-content shell">
        <p className="eyebrow">operação</p>
        <h1>Logística</h1>
        <p className="dashboard-lede">
          Solicite frete para uma negociação, compare cotações, contrate a
          transportadora e acompanhe o rastreio. A entrega atualiza a negociação
          automaticamente.
        </p>
        {deals.length === 0 ? (
          <div className="empty-panel">
            Você ainda não tem negociações em andamento. Aceite uma proposta
            para solicitar transporte.
          </div>
        ) : (
          <form className="proposal-form logistics-form" onSubmit={submit}>
            <label>
              Negociação
              <select
                required
                value={dealId}
                onChange={(event) => chooseDeal(event.target.value)}
              >
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.listing.title} · {counterpartName(deal)} (
                    {label(dealStatusLabels, deal.status)})
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Origem
                <input
                  required
                  value={origin}
                  onChange={(event) => setOrigin(event.target.value)}
                  placeholder="Endereço de coleta"
                />
              </label>
              <label>
                Destino
                <input
                  required
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Endereço de entrega"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Quantidade
                <input
                  required
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>
              <label>
                Unidade
                <input
                  required
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                />
              </label>
            </div>
            <label>
              Janela de coleta (opcional)
              <input
                maxLength={160}
                value={pickupWindow}
                onChange={(event) => setPickupWindow(event.target.value)}
                placeholder="Ex.: dias úteis, das 8h às 16h"
              />
            </label>
            <button
              className="button"
              type="submit"
              disabled={busy !== '' || !dealId}
            >
              <Truck size={16} />{' '}
              {busy === 'create' ? 'Enviando...' : 'Solicitar cotação'}
            </button>
          </form>
        )}
        {message && (
          <p className="form-note" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="favorite-grid logistics-list">
          {requests.length === 0 ? (
            <div className="empty-panel">
              Nenhuma solicitação de transporte ainda.
            </div>
          ) : (
            requests.map((request) => (
              <article className="favorite-card" key={request.id}>
                <div>
                  <span
                    className={`status-badge status-${request.status.toLowerCase()}`}
                  >
                    {label(logisticsRequestStatusLabels, request.status)}
                  </span>
                  <h2>
                    <MapPin size={16} /> {request.origin} →{' '}
                    {request.destination}
                  </h2>
                  <p>
                    {request.deal?.listing.title
                      ? `${request.deal.listing.title} · `
                      : ''}
                    {formatQuantity(request.quantity)} {request.unit}
                  </p>
                  {request.quotes.length > 0 && (
                    <ul className="logistics-quotes">
                      {request.quotes.map((quote) => (
                        <li key={quote.id}>
                          <strong>{quote.carrierName}</strong>{' '}
                          {formatMoney(quote.amount, quote.currency)}
                          {quote.estimatedDays
                            ? ` · ${quote.estimatedDays} dia(s)`
                            : ''}
                          {' · '}
                          {label(logisticsQuoteStatusLabels, quote.status)}
                          {request.status === 'QUOTED' &&
                            quote.status === 'ACTIVE' && (
                              <button
                                className="link-button"
                                type="button"
                                disabled={busy !== ''}
                                onClick={() =>
                                  run(
                                    quote.id,
                                    () =>
                                      api.acceptLogisticsQuote(
                                        request.id,
                                        quote.id,
                                      ),
                                    'Cotação contratada. A coleta foi agendada.',
                                  )
                                }
                              >
                                Contratar
                              </button>
                            )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {['REQUESTED', 'QUOTED'].includes(request.status) &&
                    request.quotes.length < 3 && (
                      <button
                        className="secondary-button small"
                        type="button"
                        disabled={busy !== ''}
                        onClick={() =>
                          run(
                            `quotes-${request.id}`,
                            () => api.simulateLogisticsQuotes(request.id),
                            'Cotações simuladas geradas.',
                          )
                        }
                      >
                        Gerar cotações simuladas
                      </button>
                    )}
                  {request.shipment && (
                    <>
                      <ShipmentTracking shipment={request.shipment} />
                      {!['DELIVERED', 'CANCELLED'].includes(
                        request.shipment.status,
                      ) && (
                        <button
                          className="secondary-button small"
                          type="button"
                          disabled={busy !== ''}
                          onClick={() =>
                            run(
                              `event-${request.id}`,
                              () =>
                                api.simulateShipmentEvent(request.shipment!.id),
                              'Rastreio atualizado.',
                            )
                          }
                        >
                          Simular próximo evento de rastreio
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
