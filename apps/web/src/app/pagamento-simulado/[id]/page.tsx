'use client';

import { CheckCircle2, CreditCard, ShieldCheck, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardHeader } from '../../../components/dashboard-header';
import { api, isAuthenticationError, Payment } from '../../../lib/api';
import { formatMoney } from '../../../lib/format';
import {
  label,
  paymentPurposeLabels,
  paymentStatusLabels,
} from '../../../lib/labels';

function paymentTitle(payment: Payment) {
  if (payment.purpose === 'SUBSCRIPTION')
    return `Assinatura ${payment.subscription?.plan.name ?? ''}`.trim();
  if (payment.purpose === 'CONTACT_UNLOCK')
    return `Contato do anúncio “${payment.listing?.title ?? ''}”`;
  return payment.deal?.proposal.listing.title ?? 'Negociação';
}

function returnHref(payment: Payment) {
  if (payment.purpose === 'SUBSCRIPTION') return '/dashboard/assinatura';
  if (payment.purpose === 'CONTACT_UNLOCK' && payment.listing)
    return `/anuncios/${payment.listing.slug}`;
  if (payment.dealId) return `/dashboard/negociacoes/${payment.dealId}`;
  return '/dashboard/pagamentos';
}

export default function SimulatedCheckoutPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<'' | 'approved' | 'rejected'>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.id) return;
    api
      .payment(params.id)
      .then(({ payment: result }) => setPayment(result))
      .catch((caught) => {
        if (isAuthenticationError(caught)) {
          router.replace(`/entrar?next=/pagamento-simulado/${params.id}`);
          return;
        }
        setError('Pagamento não encontrado ou sem permissão de acesso.');
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function settle(outcome: 'approved' | 'rejected') {
    if (!payment) return;
    setActing(outcome);
    setError('');
    try {
      const { payment: updated } = await api.simulatePayment(
        payment.id,
        outcome,
      );
      setPayment(updated);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === 'PAYMENT_ALREADY_SETTLED'
          ? 'Este pagamento já foi processado.'
          : 'Não foi possível processar o pagamento simulado.',
      );
    } finally {
      setActing('');
    }
  }

  return (
    <main className="dashboard-page">
      <DashboardHeader
        backHref="/dashboard/pagamentos"
        backLabel="Pagamentos"
      />
      <section className="dashboard-content shell checkout-page">
        <p className="eyebrow">checkout de demonstração</p>
        <h1>Pagamento simulado</h1>
        <p className="dashboard-lede">
          Este ambiente é apenas para estudo. Escolha o resultado do pagamento
          para testar o fluxo completo — nenhum valor é cobrado.
        </p>
        {loading && <div className="dashboard-loading">Carregando...</div>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {payment && (
          <article className="checkout-card" aria-live="polite">
            <header>
              <CreditCard size={22} aria-hidden="true" />
              <div>
                <small>{label(paymentPurposeLabels, payment.purpose)}</small>
                <h2>{paymentTitle(payment)}</h2>
              </div>
            </header>
            <dl className="checkout-facts">
              <div>
                <dt>Valor</dt>
                <dd className="checkout-amount">
                  {formatMoney(payment.amount, payment.currency)}
                </dd>
              </div>
              <div>
                <dt>Empresa pagadora</dt>
                <dd>
                  {payment.company?.tradeName || payment.company?.legalName}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    className={`status-badge status-${payment.status.toLowerCase()}`}
                  >
                    {label(paymentStatusLabels, payment.status)}
                  </span>
                </dd>
              </div>
            </dl>
            {payment.provider !== 'SIMULATED' ? (
              <p className="form-note">
                Este pagamento usa um provedor real e não pode ser simulado.
              </p>
            ) : payment.status === 'PENDING' ? (
              <div className="checkout-actions">
                <button
                  className="button"
                  type="button"
                  disabled={acting !== ''}
                  onClick={() => settle('approved')}
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {acting === 'approved'
                    ? 'Aprovando...'
                    : 'Aprovar pagamento (teste)'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={acting !== ''}
                  onClick={() => settle('rejected')}
                >
                  <XCircle size={16} aria-hidden="true" />
                  {acting === 'rejected' ? 'Recusando...' : 'Recusar pagamento'}
                </button>
              </div>
            ) : (
              <div className="success-panel">
                <p>
                  {payment.status === 'PAID'
                    ? 'Pagamento aprovado. O benefício já foi aplicado.'
                    : 'Pagamento não aprovado. Você pode tentar novamente a partir da origem da cobrança.'}
                </p>
                <a className="button small" href={returnHref(payment)}>
                  Continuar
                </a>
              </div>
            )}
            <p className="checkout-security">
              <ShieldCheck size={14} aria-hidden="true" /> Sandbox LOOP
              AMBIENTAL · nenhum dado de cartão é solicitado.
            </p>
          </article>
        )}
      </section>
    </main>
  );
}
