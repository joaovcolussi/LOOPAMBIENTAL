'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  api,
  Company,
  CompanySubscription,
  PlanPublic,
  SubscriptionUsage,
} from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';
import { formatMoney } from '../../../lib/format';

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativa',
  PENDING: 'Pendente',
  PAST_DUE: 'Em atraso',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

function unlockFeature(plan: PlanPublic): string {
  const value = plan.features?.contactUnlocks;
  if (typeof value !== 'number') return 'Desbloqueios de contato inclusos';
  if (value === -1) return 'Desbloqueios de contato ilimitados';
  return `${value} desbloqueios de contato por mês`;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [subscription, setSubscription] = useState<CompanySubscription | null>(
    null,
  );
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.companies(), api.plans()])
      .then(([companiesResult, plansResult]) => {
        if (!active) return;
        setCompanies(companiesResult.companies);
        setCompanyId(companiesResult.companies[0]?.id ?? '');
        setPlans(plansResult.plans);
      })
      .catch((caught) => {
        if (!active) return;
        if (
          caught instanceof Error &&
          caught.message === 'AUTHENTICATION_REQUIRED'
        ) {
          router.replace('/entrar?next=/dashboard/assinatura');
          return;
        }
        setError('Não foi possível carregar os planos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!companyId) {
      setSubscription(null);
      setUsage(null);
      return;
    }
    let active = true;
    api
      .companySubscription(companyId)
      .then((result) => {
        if (!active) return;
        setSubscription(result.subscription);
        setUsage(result.usage);
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar a assinatura.');
      });
    return () => {
      active = false;
    };
  }, [companyId]);

  async function activate(plan: PlanPublic) {
    if (!companyId) return;
    setSaving(plan.id);
    setError('');
    setNotice('');
    try {
      const updated = await api.activateCompanySubscription(companyId, plan.id);
      setSubscription(updated);
      const refreshed = await api.companySubscription(companyId);
      setUsage(refreshed.usage);
      setNotice(`Plano ${plan.name} ativado.`);
    } catch {
      setError('Não foi possível ativar o plano. Verifique sua permissão.');
    } finally {
      setSaving('');
    }
  }

  async function cancel() {
    if (!companyId) return;
    setSaving('cancel');
    setError('');
    setNotice('');
    try {
      await api.cancelCompanySubscription(companyId);
      const refreshed = await api.companySubscription(companyId);
      setSubscription(refreshed.subscription);
      setUsage(refreshed.usage);
      setNotice('Assinatura cancelada.');
    } catch {
      setError('Não foi possível cancelar a assinatura.');
    } finally {
      setSaving('');
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando assinatura...</div>
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
            Voltar ao painel
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell">
        <p className="eyebrow">plano da empresa</p>
        <h1>Assinatura</h1>
        <p className="dashboard-lede">
          Escolha o plano comercial da sua empresa e acompanhe o uso dos
          desbloqueios de contato.
        </p>
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
        {companies.length === 0 ? (
          <div className="empty-panel">
            Cadastre uma empresa para contratar um plano.
          </div>
        ) : (
          <>
            {companies.length > 1 && (
              <div className="admin-filter-bar">
                <label>
                  Empresa
                  <select
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
                  >
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.tradeName || company.legalName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div className="admin-panel">
              {subscription ? (
                <>
                  <h2>
                    Plano atual: {subscription.plan.name}{' '}
                    <BadgeCheck size={16} />
                  </h2>
                  <p>
                    {formatMoney(
                      subscription.plan.priceMonthly,
                      subscription.plan.currency,
                    )}
                    /mês ·{' '}
                    {statusLabels[subscription.status] ?? subscription.status}
                  </p>
                  <p>
                    Desbloqueios de contato usados:{' '}
                    {usage?.contactUnlocks.used ?? 0}
                    {usage?.contactUnlocks.limit !== null &&
                    usage?.contactUnlocks.limit !== undefined
                      ? ` de ${usage.contactUnlocks.limit}`
                      : ' (ilimitados)'}
                  </p>
                  <button
                    className="secondary-button small"
                    type="button"
                    disabled={saving === 'cancel'}
                    onClick={cancel}
                  >
                    Cancelar assinatura
                  </button>
                </>
              ) : (
                <p>Nenhuma assinatura ativa. Escolha um plano abaixo.</p>
              )}
            </div>
            <div className="admin-plan-grid">
              {plans.map((plan) => {
                const current = subscription?.plan.id === plan.id;
                return (
                  <article className="pricing-card" key={plan.id}>
                    <p className="eyebrow">{plan.code}</p>
                    <h2>{plan.name}</h2>
                    <p className="pricing-value">
                      {formatMoney(plan.priceMonthly, plan.currency)}
                      <small>/mês</small>
                    </p>
                    <p>
                      {plan.description || 'Plano comercial da plataforma.'}
                    </p>
                    <small>{unlockFeature(plan)}</small>
                    <button
                      className={`button ${current ? 'secondary-button' : ''}`}
                      type="button"
                      disabled={current || saving === plan.id}
                      onClick={() => activate(plan)}
                    >
                      {current
                        ? 'Plano atual'
                        : saving === plan.id
                          ? 'Ativando...'
                          : 'Assinar'}
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
