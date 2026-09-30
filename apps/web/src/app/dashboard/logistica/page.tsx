'use client';

import { ArrowLeft, MapPin, Recycle, Truck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  Company,
  isAuthenticationError,
  LogisticsRequest,
  Proposal,
} from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';
import { formatMoney, formatQuantity } from '../../../lib/format';
import {
  dealStatusLabels,
  label,
  logisticsQuoteStatusLabels,
  logisticsRequestStatusLabels,
} from '../../../lib/labels';

type DealOption = {
  id: string;
  label: string;
  status: string;
};

export default function LogisticsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LogisticsRequest[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [dealId, setDealId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.logistics(),
      api.proposals(),
      api.companies().catch(() => ({ companies: [] as Company[] })),
    ])
      .then(([logisticsResult, proposalResult, companyResult]) => {
        if (!active) return;
        setRequests(logisticsResult.requests);
        const companyIds = new Set(
          companyResult.companies.map((company) => company.id),
        );
        const options: DealOption[] = proposalResult.proposals
          .filter((proposal) => proposal.deal)
          .map((proposal) => {
            const received = companyIds.has(proposal.listing.companyId);
            const counterpart = received
              ? proposal.proposerCompany.tradeName ||
                proposal.proposerCompany.legalName
              : proposal.listing.company.tradeName ||
                proposal.listing.company.legalName;
            return {
              id: proposal.deal!.id,
              label: `${proposal.listing.title} · ${counterpart}`,
              status: proposal.deal!.status,
            };
          });
        setDeals(options);
        const requestedDealId = new URLSearchParams(window.location.search).get(
          'dealId',
        );
        setDealId(
          requestedDealId &&
            options.some((option) => option.id === requestedDealId)
            ? requestedDealId
            : (options[0]?.id ?? requestedDealId ?? ''),
        );
      })
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/logistica');
        else setMessage('Não foi possível carregar seus dados de logística.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setSending(true);
    try {
      const request = await api.createLogisticsRequest({
        dealId,
        origin,
        destination,
        quantity,
        unit,
      });
      setRequests((current) => [request, ...current]);
      setMessage(
        'Solicitação enviada. A equipe poderá adicionar cotações manuais.',
      );
      setOrigin('');
      setDestination('');
      setQuantity('');
    } catch {
      setMessage(
        'Não foi possível criar a solicitação. Confira a negociação e os dados informados.',
      );
    } finally {
      setSending(false);
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
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/dashboard">
            <ArrowLeft size={15} /> Voltar ao painel
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell">
        <p className="eyebrow">operação</p>
        <h1>Logística</h1>
        <p className="dashboard-lede">
          Solicite transporte e compare cotações manuais para uma negociação
          aceita.
        </p>
        <form className="proposal-form logistics-form" onSubmit={submit}>
          <label>
            Negociação
            {deals.length > 0 ? (
              <select
                required
                value={dealId}
                onChange={(event) => setDealId(event.target.value)}
              >
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.label} ({label(dealStatusLabels, deal.status)})
                  </option>
                ))}
              </select>
            ) : (
              <input
                required
                value={dealId}
                onChange={(event) => setDealId(event.target.value)}
                placeholder="Você ainda não tem negociações aceitas"
              />
            )}
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
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Ex.: 3000"
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
          {message && (
            <p className="form-note" role="status">
              {message}
            </p>
          )}
          <button
            className="button"
            type="submit"
            disabled={sending || !dealId}
          >
            <Truck size={16} /> {sending ? 'Enviando...' : 'Solicitar cotação'}
          </button>
        </form>
        <div className="favorite-grid logistics-list">
          {requests.length === 0 ? (
            <div className="empty-panel">
              Nenhuma solicitação de transporte ainda.
            </div>
          ) : (
            requests.map((request) => (
              <article className="favorite-card" key={request.id}>
                <div>
                  <span className="dashboard-number">
                    {label(logisticsRequestStatusLabels, request.status)}
                  </span>
                  <h2>
                    <MapPin size={16} /> {request.origin} →{' '}
                    {request.destination}
                  </h2>
                  <p>
                    {formatQuantity(request.quantity)} {request.unit} ·{' '}
                    {request.quotes.length} cotação(ões)
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
                        </li>
                      ))}
                    </ul>
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
