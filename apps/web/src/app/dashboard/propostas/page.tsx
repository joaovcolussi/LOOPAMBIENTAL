'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, isAuthenticationError, Proposal } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

export default function ProposalsPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actingId, setActingId] = useState('');
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
  async function pay(dealId: string) {
    setCheckoutError('');
    try {
      const payment = await api.createPaymentCheckout(
        dealId,
        window.crypto.randomUUID(),
      );
      if (payment.checkoutUrl) window.location.assign(payment.checkoutUrl);
    } catch {
      setCheckoutError(
        'Não foi possível criar o checkout. Configure o Mercado Pago e tente novamente.',
      );
    }
  }

  async function actOnProposal(
    proposal: Proposal,
    action: 'accept' | 'reject' | 'counter',
  ) {
    setActionError('');
    setActingId(proposal.id);
    try {
      if (action === 'accept') await api.acceptProposal(proposal.id);
      if (action === 'reject') await api.rejectProposal(proposal.id);
      if (action === 'counter') {
        const quantity = window.prompt(
          'Quantidade da contraproposta:',
          proposal.quantity,
        );
        const unitPrice = window.prompt('Preço unitário:', proposal.unitPrice);
        if (!quantity || !unitPrice) return;
        await api.counterProposal(proposal.id, { quantity, unitPrice });
      }
      const result = await api.proposals();
      setProposals(result.proposals);
    } catch {
      setActionError(
        'Não foi possível atualizar esta proposta com sua empresa.',
      );
    } finally {
      setActingId('');
    }
  }
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
        {checkoutError && <p className="form-error">{checkoutError}</p>}
        {actionError && <p className="form-error">{actionError}</p>}
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
                  <span className="dashboard-number">{proposal.status}</span>
                  <h2>{proposal.listing.title}</h2>
                  <p>
                    {proposal.proposerCompany.tradeName ||
                      proposal.proposerCompany.legalName}{' '}
                    · {proposal.quantity} · {proposal.currency}{' '}
                    {proposal.unitPrice}
                  </p>
                  <small>
                    {proposal.deal
                      ? `Negociação ${proposal.deal.status}`
                      : 'Aguardando resposta'}
                  </small>
                  {(proposal.status === 'PENDING' ||
                    proposal.status === 'COUNTERED') && (
                    <div className="proposal-actions">
                      <button
                        className="button small"
                        type="button"
                        disabled={actingId === proposal.id}
                        onClick={() => void actOnProposal(proposal, 'accept')}
                      >
                        Aceitar
                      </button>
                      <button
                        className="secondary-button small"
                        type="button"
                        disabled={actingId === proposal.id}
                        onClick={() => void actOnProposal(proposal, 'counter')}
                      >
                        Contrapropor
                      </button>
                      <button
                        className="link-button"
                        type="button"
                        disabled={actingId === proposal.id}
                        onClick={() => void actOnProposal(proposal, 'reject')}
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
                {proposal.deal && proposal.deal.status !== 'CANCELLED' && (
                  <>
                    <button
                      className="button small"
                      type="button"
                      onClick={() => void pay(proposal.deal!.id)}
                    >
                      Pagar negociação
                    </button>
                    <a
                      className="text-link"
                      href={`/dashboard/logistica?dealId=${proposal.deal.id}`}
                    >
                      Solicitar logística
                    </a>
                  </>
                )}
                <ArrowRight size={17} />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
