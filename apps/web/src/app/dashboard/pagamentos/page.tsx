'use client';

import { CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, isAuthenticationError, Payment } from '../../../lib/api';
import { DashboardHeader } from '../../../components/dashboard-header';
import { formatMoney } from '../../../lib/format';
import {
  label,
  paymentProviderLabels,
  paymentPurposeLabels,
  paymentStatusLabels,
} from '../../../lib/labels';

function paymentTitle(payment: Payment) {
  if (payment.purpose === 'SUBSCRIPTION')
    return `Plano ${payment.subscription?.plan.name ?? ''}`.trim();
  if (payment.purpose === 'CONTACT_UNLOCK')
    return payment.listing?.title ?? 'Desbloqueio de contato';
  return payment.deal?.proposal.listing.title ?? 'Negociação';
}

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .payments()
      .then(({ payments: result }) => setPayments(result))
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/pagamentos');
        else setError('Não foi possível carregar os pagamentos.');
      })
      .finally(() => setLoading(false));
  }, [router]);
  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando pagamentos...</div>
      </main>
    );
  return (
    <main className="dashboard-page">
      <DashboardHeader />
      <section className="dashboard-content shell">
        <p className="eyebrow">financeiro</p>
        <h1>Pagamentos</h1>
        <p className="dashboard-lede">
          Acompanhe cobranças de negociações, assinaturas e desbloqueios de
          contato da sua empresa.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {payments.length === 0 && !error ? (
          <div className="empty-panel favorite-empty">
            <CreditCard size={22} />
            <p>Nenhum pagamento iniciado.</p>
          </div>
        ) : (
          <div className="favorite-grid">
            {payments.map((payment) => (
              <article className="favorite-card" key={payment.id}>
                <div>
                  <span
                    className={`status-badge status-${payment.status.toLowerCase()}`}
                  >
                    {label(paymentStatusLabels, payment.status)}
                  </span>
                  <h2>{paymentTitle(payment)}</h2>
                  <p>
                    {label(paymentPurposeLabels, payment.purpose)} ·{' '}
                    {formatMoney(payment.amount, payment.currency)}
                  </p>
                  <small>
                    {label(paymentProviderLabels, payment.provider)} ·{' '}
                    {new Date(payment.createdAt).toLocaleString('pt-BR')}
                  </small>
                </div>
                {payment.checkoutUrl && payment.status === 'PENDING' && (
                  <a className="button small" href={payment.checkoutUrl}>
                    Continuar pagamento
                  </a>
                )}
                {payment.dealId && (
                  <a
                    className="text-link"
                    href={`/dashboard/negociacoes/${payment.dealId}`}
                  >
                    Ver negociação
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
