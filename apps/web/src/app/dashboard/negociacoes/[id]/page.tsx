'use client';

import { CreditCard, MessageCircle, Truck } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '../../../../components/confirm-dialog';
import { DashboardHeader } from '../../../../components/dashboard-header';
import { DealReviewSection } from '../../../../components/deal-review-section';
import {
  api,
  DealAction,
  DealDetail,
  isAuthenticationError,
} from '../../../../lib/api';
import { formatMoney, formatQuantity } from '../../../../lib/format';
import {
  dealActionLabels,
  dealNoteLabel,
  dealSideLabels,
  dealStatusLabels,
  label,
  logisticsRequestStatusLabels,
  paymentStatusLabels,
  shipmentStatusLabels,
} from '../../../../lib/labels';

const PAYABLE = ['OPEN', 'AWAITING_DOCUMENTS', 'AWAITING_PAYMENT'];
const REASON_ACTIONS: DealAction[] = ['dispute', 'cancel'];

const steps = [
  'OPEN',
  'AWAITING_PAYMENT',
  'AWAITING_PICKUP',
  'IN_TRANSIT',
  'DELIVERED',
  'COMPLETED',
];

function companyName(company: { legalName: string; tradeName: string | null }) {
  return company.tradeName || company.legalName;
}

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogAction, setDialogAction] = useState<DealAction | null>(null);

  const load = useCallback(async () => {
    const { deal: result } = await api.deal(params.id);
    setDeal(result);
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    load()
      .catch((caught) => {
        if (isAuthenticationError(caught)) {
          router.replace(`/entrar?next=/dashboard/negociacoes/${params.id}`);
          return;
        }
        setError('Negociação não encontrada ou sem permissão de acesso.');
      })
      .finally(() => setLoading(false));
  }, [load, params.id, router]);

  async function run(action: DealAction, reason?: string) {
    if (!deal) return;
    setActing(action);
    setError('');
    setNotice('');
    try {
      const { deal: updated } = await api.dealAction(deal.id, action, reason);
      setDeal(updated);
      setNotice(`${dealActionLabels[action]}: concluído.`);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : '';
      setError(
        code === 'DEAL_STATUS_CHANGED'
          ? 'A negociação foi atualizada por outra pessoa. Recarregue a página.'
          : code === 'DEAL_ALREADY_PAID'
            ? 'Negociações pagas não podem ser canceladas; abra uma disputa.'
            : 'Não foi possível concluir a ação.',
      );
    } finally {
      setActing('');
      setDialogAction(null);
    }
  }

  async function pay() {
    if (!deal) return;
    setActing('pay');
    setError('');
    try {
      const payment = await api.createPaymentCheckout(
        deal.id,
        window.crypto.randomUUID(),
      );
      if (payment.checkoutUrl) window.location.assign(payment.checkoutUrl);
      else setError('O provedor não retornou um link de pagamento.');
    } catch {
      setError('Não foi possível iniciar o pagamento.');
    } finally {
      setActing('');
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando negociação...</div>
      </main>
    );

  if (!deal)
    return (
      <main className="dashboard-page">
        <DashboardHeader
          backHref="/dashboard/negociacoes"
          backLabel="Negociações"
        />
        <section className="dashboard-content shell">
          <p className="form-error" role="alert">
            {error || 'Negociação não encontrada.'}
          </p>
        </section>
      </main>
    );

  const total =
    Number(deal.proposal.quantity) * Number(deal.proposal.unitPrice);
  const paid = deal.paymentTransactions.some((p) => p.status === 'PAID');
  const pendingPayment = deal.paymentTransactions.find(
    (p) => p.status === 'PENDING' && p.checkoutUrl,
  );
  const canPay =
    deal.side === 'BUYER' && PAYABLE.includes(deal.status) && !paid;
  const myCompanyId =
    deal.side === 'BUYER' ? deal.buyerCompanyId : deal.sellerCompanyId;
  const currentStep = steps.indexOf(deal.status);

  return (
    <main className="dashboard-page">
      <DashboardHeader
        backHref="/dashboard/negociacoes"
        backLabel="Negociações"
      />
      <section className="dashboard-content shell">
        <p className="eyebrow">{label(dealSideLabels, deal.side)}</p>
        <h1>{deal.listing.title}</h1>
        <p className="dashboard-lede">
          {companyName(deal.sellerCompany)} vende para{' '}
          {companyName(deal.buyerCompany)} ·{' '}
          <span className={`status-badge status-${deal.status.toLowerCase()}`}>
            {label(dealStatusLabels, deal.status)}
          </span>
        </p>
        <ol className="deal-progress" aria-label="Etapas da negociação">
          {steps.map((step, index) => (
            <li
              key={step}
              className={
                currentStep === -1
                  ? ''
                  : index < currentStep
                    ? 'done'
                    : index === currentStep
                      ? 'current'
                      : ''
              }
              aria-current={index === currentStep ? 'step' : undefined}
            >
              {label(dealStatusLabels, step)}
            </li>
          ))}
        </ol>
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
        <div className="admin-split">
          <article className="admin-panel">
            <h2>Resumo</h2>
            <dl className="checkout-facts">
              <div>
                <dt>Volume</dt>
                <dd>
                  {formatQuantity(deal.proposal.quantity)} {deal.listing.unit}
                </dd>
              </div>
              <div>
                <dt>Preço unitário</dt>
                <dd>
                  {formatMoney(deal.proposal.unitPrice, deal.proposal.currency)}
                </dd>
              </div>
              <div>
                <dt>Valor total</dt>
                <dd className="checkout-amount">
                  {formatMoney(total, deal.proposal.currency)}
                </dd>
              </div>
            </dl>
            <div className="deal-actions">
              {canPay && (
                <button
                  className="button small"
                  type="button"
                  disabled={acting !== ''}
                  onClick={
                    pendingPayment?.checkoutUrl
                      ? () =>
                          window.location.assign(pendingPayment.checkoutUrl!)
                      : pay
                  }
                >
                  <CreditCard size={15} aria-hidden="true" />
                  {pendingPayment ? 'Continuar pagamento' : 'Pagar negociação'}
                </button>
              )}
              {deal.availableActions.map((action) => (
                <button
                  key={action}
                  className={
                    REASON_ACTIONS.includes(action)
                      ? 'link-button'
                      : 'secondary-button small'
                  }
                  type="button"
                  disabled={acting !== ''}
                  onClick={() =>
                    REASON_ACTIONS.includes(action)
                      ? setDialogAction(action)
                      : run(action)
                  }
                >
                  {acting === action
                    ? 'Processando...'
                    : dealActionLabels[action]}
                </button>
              ))}
            </div>
            <div className="deal-links">
              <a
                className="text-link"
                href={`/dashboard/propostas/${deal.proposal.id}`}
              >
                <MessageCircle size={14} aria-hidden="true" /> Proposta e
                conversa
              </a>
              <a
                className="text-link"
                href={`/dashboard/logistica?dealId=${deal.id}`}
              >
                <Truck size={14} aria-hidden="true" /> Logística e rastreio
              </a>
            </div>
          </article>
          <section className="status-timeline" aria-labelledby="history-title">
            <h2 id="history-title">Histórico imutável</h2>
            <ol>
              {deal.statusHistory.map((entry) => (
                <li key={entry.id}>
                  <span
                    className={`status-dot ${entry.toStatus.toLowerCase()}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{label(dealStatusLabels, entry.toStatus)}</strong>
                    <small>
                      {new Date(entry.createdAt).toLocaleString('pt-BR')}
                      {entry.actor ? ` · ${entry.actor.name}` : ''}
                    </small>
                    {entry.note && <em>{dealNoteLabel(entry.note)}</em>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="admin-split">
          <article className="admin-panel">
            <h2>Pagamentos</h2>
            {deal.paymentTransactions.length === 0 ? (
              <p className="form-note">Nenhum pagamento iniciado.</p>
            ) : (
              <ul className="plain-list">
                {deal.paymentTransactions.map((payment) => (
                  <li key={payment.id}>
                    <strong>
                      {formatMoney(payment.amount, payment.currency)}
                    </strong>{' '}
                    · {label(paymentStatusLabels, payment.status)} ·{' '}
                    {new Date(payment.createdAt).toLocaleString('pt-BR')}
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="admin-panel">
            <h2>Logística</h2>
            {deal.logisticsRequests.length === 0 ? (
              <p className="form-note">Nenhuma solicitação de frete.</p>
            ) : (
              <ul className="plain-list">
                {deal.logisticsRequests.map((request) => (
                  <li key={request.id}>
                    {request.origin} → {request.destination} ·{' '}
                    {label(logisticsRequestStatusLabels, request.status)}
                    {request.shipment && (
                      <>
                        {' '}
                        · rastreio <code>
                          {request.shipment.trackingCode}
                        </code>{' '}
                        ({label(shipmentStatusLabels, request.shipment.status)})
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
        {deal.status === 'COMPLETED' && (
          <DealReviewSection
            dealId={deal.id}
            companyIds={[deal.buyerCompanyId, deal.sellerCompanyId]}
            myCompany={myCompanyId}
          />
        )}
      </section>
      <ConfirmDialog
        open={dialogAction !== null}
        title={dialogAction ? dealActionLabels[dialogAction] : ''}
        description={
          dialogAction === 'cancel'
            ? 'O volume reservado volta para o anúncio. Informe o motivo.'
            : 'A equipe da plataforma vai analisar a disputa. Descreva o problema.'
        }
        tone="danger"
        requireReason
        reasonLabel="Motivo"
        pending={acting !== ''}
        confirmLabel={dialogAction ? dealActionLabels[dialogAction] : ''}
        onConfirm={(reason) => dialogAction && run(dialogAction, reason)}
        onCancel={() => setDialogAction(null)}
      />
    </main>
  );
}
