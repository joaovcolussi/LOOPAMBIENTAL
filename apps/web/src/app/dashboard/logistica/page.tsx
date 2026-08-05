'use client';

import { ArrowLeft, MapPin, Recycle, Truck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, LogisticsRequest } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

export default function LogisticsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LogisticsRequest[]>([]);
  const [dealId, setDealId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const requestedDealId = new URLSearchParams(window.location.search).get(
      'dealId',
    );
    if (requestedDealId) setDealId(requestedDealId);
    api
      .logistics()
      .then(({ requests: result }) => setRequests(result))
      .catch(() => router.replace('/entrar'));
  }, [router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
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
        'Não foi possível criar a solicitação. Confira o ID da negociação e seus dados.',
      );
    }
  }
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
            ID da negociação
            <input
              required
              value={dealId}
              onChange={(event) => setDealId(event.target.value)}
              placeholder="UUID da negociação"
            />
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
          <button className="button" type="submit">
            <Truck size={16} /> Solicitar cotação
          </button>
        </form>
        <div className="favorite-grid logistics-list">
          {requests.map((request) => (
            <article className="favorite-card" key={request.id}>
              <div>
                <span className="dashboard-number">{request.status}</span>
                <h2>
                  <MapPin size={16} /> {request.origin} → {request.destination}
                </h2>
                <p>
                  {request.quantity} {request.unit} · {request.quotes.length}{' '}
                  cotação(ões)
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
