'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AdminNav } from '../../../components/admin-nav';
import { ShipmentTracking } from '../../../components/shipment-tracking';
import { api, LogisticsRequest } from '../../../lib/api';
import { formatMoney, formatQuantity } from '../../../lib/format';
import {
  label,
  logisticsRequestStatusLabels,
  shipmentStatusLabels,
} from '../../../lib/labels';

const NEXT_STATUSES: Record<string, string[]> = {
  SCHEDULED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'DELIVERED'],
  IN_TRANSIT: ['DELIVERED'],
};

function QuoteForm({
  request,
  onDone,
}: {
  request: LogisticsRequest;
  onDone: (message: string) => void;
}) {
  const [carrierName, setCarrierName] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.adminAddLogisticsQuote(request.id, {
        carrierName,
        amount: amount.replace(',', '.'),
        estimatedDays: days ? Number(days) : undefined,
      });
      setCarrierName('');
      setAmount('');
      setDays('');
      onDone('Cotação registrada.');
    } catch {
      setError('Confira transportadora, valor (ex.: 850,00) e prazo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-filter-bar" onSubmit={submit}>
      <label>
        Transportadora
        <input
          required
          maxLength={200}
          value={carrierName}
          onChange={(event) => setCarrierName(event.target.value)}
        />
      </label>
      <label>
        Valor (R$)
        <input
          required
          inputMode="decimal"
          pattern="[0-9]+([.,][0-9]{1,2})?"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <label>
        Prazo (dias)
        <input
          type="number"
          min={1}
          max={364}
          value={days}
          onChange={(event) => setDays(event.target.value)}
        />
      </label>
      <button className="button small" disabled={saving}>
        Adicionar cotação
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export default function AdminLogisticsPage() {
  const [requests, setRequests] = useState<LogisticsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const { requests: result } = await api.adminLogistics();
    setRequests(result);
  }, []);

  useEffect(() => {
    load()
      .catch(() => setError('Acesso restrito ou falha ao carregar.'))
      .finally(() => setLoading(false));
  }, [load]);

  async function addEvent(shipmentId: string, status: string) {
    setBusy(shipmentId);
    setError('');
    try {
      await api.adminShipmentEvent(shipmentId, { status });
      await load();
      setNotice('Evento de rastreio registrado.');
    } catch {
      setError('Transição de rastreio inválida.');
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">operação</p>
        <h1>Logística</h1>
        <p className="dashboard-lede">
          Registre cotações de transportadoras parceiras e atualize o rastreio
          das remessas contratadas.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="form-note" role="status">
            {notice}
          </p>
        )}
        {loading ? (
          <div className="dashboard-loading">Carregando...</div>
        ) : requests.length === 0 ? (
          <div className="empty-panel">Nenhuma solicitação de frete.</div>
        ) : (
          <div className="moderation-list">
            {requests.map((request) => (
              <article className="admin-panel" key={request.id}>
                <h2>
                  {request.deal?.listing.title ?? 'Negociação'} ·{' '}
                  <span
                    className={`status-badge status-${request.status.toLowerCase()}`}
                  >
                    {label(logisticsRequestStatusLabels, request.status)}
                  </span>
                </h2>
                <p>
                  {request.origin} → {request.destination} ·{' '}
                  {formatQuantity(request.quantity)} {request.unit}
                  {request.requestedBy
                    ? ` · solicitado por ${request.requestedBy.name}`
                    : ''}
                </p>
                {request.quotes.length > 0 && (
                  <ul className="plain-list">
                    {request.quotes.map((quote) => (
                      <li key={quote.id}>
                        {quote.carrierName} ·{' '}
                        {formatMoney(quote.amount, quote.currency)}
                        {quote.estimatedDays
                          ? ` · ${quote.estimatedDays} dia(s)`
                          : ''}{' '}
                        · {quote.status}
                      </li>
                    ))}
                  </ul>
                )}
                {['REQUESTED', 'QUOTED'].includes(request.status) && (
                  <QuoteForm
                    request={request}
                    onDone={(message) => {
                      setNotice(message);
                      void load();
                    }}
                  />
                )}
                {request.shipment && (
                  <>
                    <ShipmentTracking shipment={request.shipment} />
                    <div className="deal-actions">
                      {(NEXT_STATUSES[request.shipment.status] ?? []).map(
                        (status) => (
                          <button
                            key={status}
                            className="secondary-button small"
                            type="button"
                            disabled={busy !== ''}
                            onClick={() =>
                              addEvent(request.shipment!.id, status)
                            }
                          >
                            Marcar: {label(shipmentStatusLabels, status)}
                          </button>
                        ),
                      )}
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
