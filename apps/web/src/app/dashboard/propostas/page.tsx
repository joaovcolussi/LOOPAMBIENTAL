'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, isAuthenticationError, Proposal } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';
import { formatMoney, formatQuantity } from '../../../lib/format';

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  COUNTERED: 'Contraproposta',
  ACCEPTED: 'Aceita',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

export default function ProposalsPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    api
      .proposals()
      .then(({ proposals: result }) => setProposals(result))
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/propostas');
        else
          setLoadError(
            'Não foi possível carregar suas propostas. Tente novamente.',
          );
      })
      .finally(() => setLoading(false));
  }, [router]);
  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando propostas...</div>
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
        <p className="eyebrow">negociações</p>
        <h1>Propostas</h1>
        <p className="dashboard-lede">
          Acompanhe as propostas enviadas e recebidas pelas suas empresas.
        </p>
        {loadError && <p className="form-error">{loadError}</p>}
        {proposals.length === 0 ? (
          <div className="empty-panel favorite-empty">
            <p>Nenhuma proposta encontrada.</p>
            <a className="text-link" href="/anuncios">
              Explorar anúncios <ArrowRight size={15} />
            </a>
          </div>
        ) : (
          <div className="favorite-grid">
            {proposals.map((proposal) => (
              <article className="favorite-card" key={proposal.id}>
                <div>
                  <span
                    className={`admin-user-status ${proposal.status.toLowerCase()}`}
                  >
                    {statusLabels[proposal.status] ?? proposal.status}
                  </span>
                  <h2>{proposal.listing.title}</h2>
                  <p>
                    {proposal.proposerCompany.tradeName ||
                      proposal.proposerCompany.legalName}{' '}
                    · {formatQuantity(proposal.quantity)} ·{' '}
                    {formatMoney(proposal.unitPrice, proposal.currency)}
                  </p>
                  <small>
                    {proposal.deal
                      ? `Negociação ${proposal.deal.status}`
                      : 'Aguardando resposta'}
                  </small>
                  <a
                    className="favorite-card-link text-link"
                    href={`/dashboard/propostas/${proposal.id}`}
                  >
                    Visualizar proposta e conversa
                  </a>
                </div>
                <ArrowRight size={17} />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
