'use client';

import { ArrowLeft, CreditCard, Recycle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Payment } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

const statusLabels: Record<string, string> = {
  INITIATED: 'Iniciado',
  PENDING: 'Aguardando pagamento',
  PAID: 'Pago',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Estornado',
};

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .payments()
      .then(({ payments: result }) => setPayments(result))
      .catch(() => router.replace('/entrar'))
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
        <p className="eyebrow">financeiro</p>
        <h1>Pagamentos</h1>
        <p className="dashboard-lede">
          Acompanhe checkouts e pagamentos das suas negociações.
        </p>
        {payments.length === 0 ? (
          <div className="empty-panel favorite-empty">
            <CreditCard size={22} />
            <p>Nenhum pagamento iniciado.</p>
          </div>
        ) : (
          <div className="favorite-grid">
            {payments.map((payment) => (
              <article className="favorite-card" key={payment.id}>
                <div>
                  <span className="dashboard-number">
                    {statusLabels[payment.status] || payment.status}
                  </span>
                  <h2>{payment.deal.proposal.listing.title}</h2>
                  <p>
                    {payment.currency} {payment.amount} · {payment.provider}
                  </p>
                  <small>
                    {new Date(payment.createdAt).toLocaleString('pt-BR')}
                  </small>
                </div>
                {payment.checkoutUrl && payment.status === 'PENDING' && (
                  <a className="button small" href={payment.checkoutUrl}>
                    Continuar
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
