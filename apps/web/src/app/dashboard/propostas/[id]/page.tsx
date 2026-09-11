'use client';

import { ArrowLeft, Recycle } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Company, Proposal } from '../../../../lib/api';
import { formatMoney, formatQuantity } from '../../../../lib/format';
import { CurrencyInput } from '../../../../components/currency-input';
import { ProposalConversation } from '../../../../components/proposal-conversation';
import { SessionActions } from '../../../../components/session-actions';

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  COUNTERED: 'Contraproposta',
  ACCEPTED: 'Aceita',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

export default function ProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  async function pay() {
    if (!proposal?.deal) return;
    setActing(true);
    setError('');
    try {
      const payment = await api.createPaymentCheckout(
        proposal.deal.id,
        window.crypto.randomUUID(),
      );
      if (payment.checkoutUrl) window.location.assign(payment.checkoutUrl);
      else setError('O provedor não retornou um link de pagamento.');
    } catch {
      setError('Não foi possível iniciar o pagamento desta negociação.');
    } finally {
      setActing(false);
    }
  }

  async function load() {
    const [{ proposal: result }, { companies: companyResult }] =
      await Promise.all([api.proposal(params.id), api.companies()]);
    setProposal(result);
    setCompanies(companyResult);
    setQuantity(result.quantity);
    setUnitPrice(result.unitPrice);
    setNotes(result.notes ?? '');
  }

  useEffect(() => {
    if (!params.id) return;
    load()
      .catch(() => router.replace('/dashboard/propostas'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function act(action: 'accept' | 'reject' | 'cancel') {
    if (!proposal) return;
    setActing(true);
    setError('');
    try {
      if (action === 'accept') await api.acceptProposal(proposal.id);
      if (action === 'reject') await api.rejectProposal(proposal.id);
      if (action === 'cancel') await api.cancelProposal(proposal.id);
      await load();
    } catch {
      setError(
        'Não foi possível atualizar a proposta com sua permissão atual.',
      );
    } finally {
      setActing(false);
    }
  }

  async function counter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proposal) return;
    setActing(true);
    setError('');
    try {
      await api.counterProposal(proposal.id, { quantity, unitPrice, notes });
      await load();
    } catch {
      setError('Confira a quantidade e o valor da contraproposta.');
    } finally {
      setActing(false);
    }
  }

  if (loading || !proposal)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando proposta...</div>
      </main>
    );

  const companyIds = new Set(companies.map((company) => company.id));
  const received = companyIds.has(proposal.listing.companyId);
  const sent = companyIds.has(proposal.proposerCompanyId);

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/dashboard/propostas">
            <ArrowLeft size={15} /> Voltar às propostas
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell proposal-detail-page">
        <p className="eyebrow">proposta comercial</p>
        <div className="proposal-detail-heading">
          <div>
            <h1>{proposal.listing.title}</h1>
            <span
              className={`admin-user-status ${proposal.status.toLowerCase()}`}
            >
              {statusLabels[proposal.status] ?? proposal.status}
            </span>
          </div>
          <span>{received ? 'Proposta recebida' : 'Proposta enviada'}</span>
        </div>
        <div className="proposal-detail-grid">
          <article className="detail-main-card">
            <div className="proposal-kpis">
              <div>
                <span>Quantidade</span>
                <strong>{formatQuantity(proposal.quantity)}</strong>
              </div>
              <div>
                <span>Valor unitário</span>
                <strong>
                  {formatMoney(proposal.unitPrice, proposal.currency)}
                </strong>
              </div>
              <div>
                <span>Valor estimado</span>
                <strong>
                  {formatMoney(
                    Number(proposal.quantity) * Number(proposal.unitPrice),
                    proposal.currency,
                  )}
                </strong>
              </div>
            </div>
            <p className="detail-description">
              {proposal.notes || 'Nenhuma observação informada.'}
            </p>
            {proposal.status === 'PENDING' && received && (
              <form className="proposal-form" onSubmit={counter}>
                <h2>Responder proposta</h2>
                <div className="form-row">
                  <label>
                    Quantidade
                    <input
                      required
                      inputMode="decimal"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(event.target.value.replace(',', '.'))
                      }
                    />
                  </label>
                  <label>
                    Valor unitário
                    <CurrencyInput
                      required
                      value={unitPrice}
                      onChange={setUnitPrice}
                    />
                  </label>
                </div>
                <label>
                  Condições
                  <textarea
                    rows={3}
                    maxLength={5000}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
                <div className="proposal-actions">
                  <button
                    className="button small"
                    type="button"
                    disabled={acting}
                    onClick={() => act('accept')}
                  >
                    Aceitar
                  </button>
                  <button className="secondary-button small" disabled={acting}>
                    Enviar contraproposta
                  </button>
                  <button
                    className="link-button"
                    type="button"
                    disabled={acting}
                    onClick={() => act('reject')}
                  >
                    Rejeitar
                  </button>
                </div>
              </form>
            )}
            {proposal.status === 'COUNTERED' && sent && !received && (
              <div className="proposal-actions">
                <button
                  className="button small"
                  type="button"
                  disabled={acting}
                  onClick={() => act('accept')}
                >
                  Aceitar contraproposta
                </button>
                <button
                  className="link-button"
                  type="button"
                  disabled={acting}
                  onClick={() => act('reject')}
                >
                  Rejeitar contraproposta
                </button>
              </div>
            )}
            {proposal.status === 'PENDING' && sent && !received && (
              <button
                className="link-button"
                type="button"
                disabled={acting}
                onClick={() => act('cancel')}
              >
                Cancelar proposta
              </button>
            )}
            {proposal.deal && proposal.deal.status !== 'CANCELLED' && (
              <div className="deal-actions">
                <button
                  className="button small"
                  type="button"
                  disabled={acting}
                  onClick={pay}
                >
                  Pagar negociação
                </button>
                <a
                  className="secondary-button small"
                  href={`/dashboard/logistica?dealId=${proposal.deal.id}`}
                >
                  Solicitar logística
                </a>
              </div>
            )}
            {proposal.revisions.length > 0 && (
              <div className="proposal-history">
                <h2>Histórico</h2>
                {proposal.revisions.map((revision) => (
                  <div key={revision.id}>
                    <time>
                      {new Date(revision.createdAt).toLocaleString('pt-BR')}
                    </time>
                    <strong>
                      {formatQuantity(revision.quantity)} por{' '}
                      {formatMoney(revision.unitPrice, proposal.currency)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </article>
          <ProposalConversation proposalId={proposal.id} />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
