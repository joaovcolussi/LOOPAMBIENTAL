'use client';

import { ArrowLeft, Recycle, Star } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Company, Proposal, Review } from '../../../../lib/api';
import { formatMoney, formatQuantity } from '../../../../lib/format';
import {
  dealNoteLabels,
  dealStatusLabels,
  label,
  proposalStatusLabels,
} from '../../../../lib/labels';
import { CurrencyInput } from '../../../../components/currency-input';
import { ProposalConversation } from '../../../../components/proposal-conversation';
import { SessionActions } from '../../../../components/session-actions';

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
              {label(proposalStatusLabels, proposal.status)}
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
            {proposal.deal && proposal.deal.status === 'COMPLETED' && (
              <DealReviewSection
                dealId={proposal.deal.id}
                companyIds={[
                  proposal.listing.companyId,
                  proposal.proposerCompanyId,
                ]}
                myCompany={
                  sent ? proposal.proposerCompanyId : proposal.listing.companyId
                }
              />
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
            {proposal.deal && proposal.deal.statusHistory.length > 0 && (
              <section
                className="status-timeline"
                aria-labelledby="deal-history-title"
              >
                <h2 id="deal-history-title">Histórico da negociação</h2>
                <ol>
                  {proposal.deal.statusHistory.map((entry) => (
                    <li key={entry.id}>
                      <span
                        className={`status-dot ${entry.toStatus.toLowerCase()}`}
                        aria-hidden="true"
                      />
                      <div>
                        <strong>
                          {label(dealStatusLabels, entry.toStatus)}
                        </strong>
                        <small>
                          {new Date(entry.createdAt).toLocaleString('pt-BR')}
                          {entry.actor ? ` · ${entry.actor.name}` : ''}
                        </small>
                        {entry.note && (
                          <em>{dealNoteLabels[entry.note] ?? entry.note}</em>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
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

function DealReviewSection({
  dealId,
  companyIds,
  myCompany,
}: {
  dealId: string;
  companyIds: string[];
  myCompany: string;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .dealReviews(dealId)
      .then(({ reviews: result }) => setReviews(result))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [dealId]);

  const myReview = reviews.find(
    (review) => review.authorCompany.id === myCompany,
  );
  const hasMyCompany = companyIds.includes(myCompany);

  async function submit() {
    setSaving(true);
    setMessage('');
    try {
      const created = await api.createReview(dealId, {
        rating,
        comment: comment.trim() || undefined,
        authorCompanyId: myCompany,
      });
      setReviews((current) => [created, ...current]);
      setMessage('Avaliação registrada.');
    } catch {
      setMessage('Não foi possível registrar a avaliação.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="deal-review" aria-labelledby="deal-review-title">
      <h2 id="deal-review-title">Avaliação da negociação</h2>
      {loading ? (
        <p className="form-note">Carregando avaliações...</p>
      ) : myReview ? (
        <p className="form-note">
          Sua avaliação foi registrada com{' '}
          {Array.from({ length: myReview.rating }).map((_, index) => (
            <Star key={index} size={14} fill="currentColor" />
          ))}
        </p>
      ) : hasMyCompany ? (
        <div className="review-form">
          <div className="review-stars" role="radiogroup" aria-label="Nota">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} de 5`}
                className={value <= rating ? 'active' : ''}
                onClick={() => setRating(value)}
              >
                <Star
                  size={18}
                  fill={value <= rating ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
          <label>
            Comentário (opcional)
            <textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Como foi a negociação?"
            />
          </label>
          <button
            className="button small"
            type="button"
            disabled={saving}
            onClick={submit}
          >
            {saving ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </div>
      ) : (
        <p className="form-note">
          Somente as empresas participantes podem avaliar esta negociação.
        </p>
      )}
      {message && (
        <p className="form-note" role="status">
          {message}
        </p>
      )}
      {reviews.length > 0 && (
        <div className="review-list">
          {reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div className="review-card-head">
                <div
                  className="review-stars"
                  aria-label={`Nota ${review.rating} de 5`}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      size={15}
                      fill={value <= review.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <small>
                  {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                </small>
              </div>
              {review.comment && <p>{review.comment}</p>}
              <small>
                por{' '}
                {review.authorCompany.tradeName ||
                  review.authorCompany.legalName}
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
