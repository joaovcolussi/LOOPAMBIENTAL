'use client';

import { useEffect, useState } from 'react';
import { Check, Recycle, X } from 'lucide-react';
import { api, ModerationCase } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

export default function ModerationPage() {
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .moderationCases()
      .then(({ cases: result }) => setCases(result))
      .catch(() =>
        setError('Acesso restrito ou não foi possível carregar a fila.'),
      )
      .finally(() => setLoading(false));
  }, []);

  async function approve(id: string) {
    await api.approveModeration(id);
    setCases((current) => current.filter((item) => item.id !== id));
  }
  async function reject(item: ModerationCase) {
    const reason = window.prompt('Informe o motivo da rejeição:');
    if (!reason) return;
    await api.rejectModeration(item.id, reason);
    setCases((current) =>
      current.filter((currentItem) => currentItem.id !== item.id),
    );
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando fila...</div>
      </main>
    );
  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="nav-actions">
          <a className="back-link" href="/dashboard">
            Voltar ao painel
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell">
        <p className="eyebrow">administração</p>
        <h1>Fila de moderação</h1>
        <p className="dashboard-lede">
          Revise anúncios antes que apareçam publicamente.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="moderation-list">
          {cases.length === 0 ? (
            <div className="empty-panel">
              Nenhum anúncio aguardando revisão.
            </div>
          ) : (
            cases.map((item) => (
              <article className="moderation-card" key={item.id}>
                <div>
                  <span className="dashboard-number">{item.listing.type}</span>
                  <h2>{item.listing.title}</h2>
                  <p>
                    {item.listing.company.tradeName ||
                      item.listing.company.legalName}{' '}
                    · {item.listing.category.name}
                  </p>
                  <small>
                    Enviado em{' '}
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </small>
                </div>
                <div className="moderation-actions">
                  <button
                    className="approve-button"
                    onClick={() => approve(item.id)}
                  >
                    <Check size={15} /> Aprovar
                  </button>
                  <button
                    className="reject-button"
                    onClick={() => reject(item)}
                  >
                    <X size={15} /> Rejeitar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
