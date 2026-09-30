'use client';

import { useEffect, useState } from 'react';
import { api, AdminPlan, AdminSubscriptionRow } from '../../../lib/api';
import { AdminNav } from '../../../components/admin-nav';
import { TableLoadingRow } from '../../../components/table-loading-row';
import { formatMoney } from '../../../lib/format';
import { subscriptionStatusLabels } from '../../../lib/labels';

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>(
    [],
  );
  const [status, setStatus] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminPlans()
      .then(({ plans: result }) => setPlans(result))
      .catch(() => setError('Não foi possível carregar os planos.'));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .adminSubscriptions({ status: status || undefined, pageSize: 25 })
      .then((result) => {
        if (!active) return;
        setSubscriptions(result.subscriptions);
        setCursor(result.pagination.nextCursor);
        setHasMore(result.pagination.hasMore);
        setTotal(result.pagination.total);
      })
      .catch(() => {
        if (active)
          setError(
            'Acesso restrito ou não foi possível carregar as assinaturas.',
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
      const result = await api.adminSubscriptions({
        status: status || undefined,
        cursor,
        pageSize: 25,
      });
      setSubscriptions((current) => [...current, ...result.subscriptions]);
      setCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch {
      setError('Não foi possível carregar mais assinaturas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">administração</p>
        <h1>Assinaturas</h1>
        <p className="dashboard-lede">
          Planos comerciais e assinaturas das empresas. {total} assinatura(s).
        </p>
        <div className="admin-plan-grid">
          {plans.map((plan) => (
            <article className="pricing-card" key={plan.id}>
              <p className="eyebrow">{plan.code}</p>
              <h2>{plan.name}</h2>
              <p className="pricing-value">
                {formatMoney(plan.priceMonthly, plan.currency)}
                <small>/mês</small>
              </p>
              <p>{plan.description || 'Plano comercial da plataforma.'}</p>
              <small>{plan.isActive ? 'Ativo' : 'Inativo'}</small>
            </article>
          ))}
          {plans.length === 0 && (
            <div className="empty-panel">Nenhum plano cadastrado.</div>
          )}
        </div>
        <div className="admin-filter-bar">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="">Todas as assinaturas</option>
            {Object.entries(subscriptionStatusLabels).map(([value, label]) => (
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
                <th>Empresa</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Período atual</th>
              </tr>
            </thead>
            <tbody>
              {loading && subscriptions.length === 0 && (
                <TableLoadingRow colSpan={4} />
              )}
              {subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td>
                    {subscription.company.tradeName ||
                      subscription.company.legalName}
                  </td>
                  <td>
                    {subscription.plan.name}
                    <small>
                      {formatMoney(subscription.plan.priceMonthly, 'BRL')}
                      /mês
                    </small>
                  </td>
                  <td>
                    {subscriptionStatusLabels[subscription.status] ??
                      subscription.status}
                  </td>
                  <td>
                    {subscription.currentPeriodEnd
                      ? `até ${new Date(
                          subscription.currentPeriodEnd,
                        ).toLocaleDateString('pt-BR')}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && subscriptions.length === 0 && (
          <div className="empty-panel">Nenhuma assinatura encontrada.</div>
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
