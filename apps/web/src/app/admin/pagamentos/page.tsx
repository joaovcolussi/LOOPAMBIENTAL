'use client';

import { useEffect, useState } from 'react';
import { api, AdminPaymentRow } from '../../../lib/api';
import { AdminNav } from '../../../components/admin-nav';
import { TableLoadingRow } from '../../../components/table-loading-row';
import { formatMoney } from '../../../lib/format';
import { paymentStatusLabels } from '../../../lib/labels';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [status, setStatus] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .adminPayments({ status: status || undefined, pageSize: 25 })
      .then((result) => {
        if (!active) return;
        setPayments(result.payments);
        setCursor(result.pagination.nextCursor);
        setHasMore(result.pagination.hasMore);
        setTotal(result.pagination.total);
      })
      .catch(() => {
        if (active)
          setError(
            'Acesso restrito ou não foi possível carregar os pagamentos.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status]);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await api.adminPayments({
        status: status || undefined,
        cursor,
        pageSize: 25,
      });
      setPayments((current) => [...current, ...result.payments]);
      setCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch {
      setError('Não foi possível carregar mais pagamentos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">administração</p>
        <h1>Pagamentos</h1>
        <p className="dashboard-lede">
          Transações das negociações. {total} pagamento(s).
        </p>
        <div className="admin-filter-bar">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Negociação</th>
                <th>Empresa</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Provedor</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {loading && payments.length === 0 && (
                <TableLoadingRow colSpan={6} />
              )}
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    {payment.deal.proposal.listing.title}
                    <small>{payment.provider}</small>
                  </td>
                  <td>
                    {payment.company.tradeName || payment.company.legalName}
                  </td>
                  <td>{formatMoney(payment.amount, payment.currency)}</td>
                  <td>
                    {paymentStatusLabels[payment.status] ?? payment.status}
                  </td>
                  <td>{payment.externalId ? 'Externo' : 'Local'}</td>
                  <td>
                    {new Date(payment.createdAt).toLocaleDateString('pt-BR')}
                    <small>
                      {payment.paidAt
                        ? `Pago em ${new Date(payment.paidAt).toLocaleDateString('pt-BR')}`
                        : 'Não pago'}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && payments.length === 0 && (
          <div className="empty-panel">Nenhum pagamento encontrado.</div>
        )}
        {hasMore && (
          <div className="admin-load-more">
            <button
              className="secondary-button"
              type="button"
              disabled={loading}
              onClick={loadMore}
            >
              {loading ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
