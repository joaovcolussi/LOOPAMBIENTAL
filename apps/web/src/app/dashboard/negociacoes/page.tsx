'use client';

import { Handshake } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { DashboardHeader } from '../../../components/dashboard-header';
import {
  api,
  CursorPagination,
  DealStatus,
  DealSummary,
  isAuthenticationError,
} from '../../../lib/api';
import { formatMoney, formatQuantity } from '../../../lib/format';
import { dealSideLabels, dealStatusLabels, label } from '../../../lib/labels';

const filters = [
  { value: 'active', label: 'Em andamento' },
  { value: 'closed', label: 'Encerradas' },
  { value: '', label: 'Todas' },
];

function companyName(company: { legalName: string; tradeName: string | null }) {
  return company.tradeName || company.legalName;
}

function DealsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? 'active';
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [counts, setCounts] = useState<Partial<Record<DealStatus, number>>>({});
  const [pagination, setPagination] = useState<CursorPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (cursor?: string) => {
      const result = await api.deals({
        status: status || undefined,
        cursor,
      });
      setDeals((current) =>
        cursor ? [...current, ...result.deals] : result.deals,
      );
      setCounts(result.countsByStatus);
      setPagination(result.pagination);
    },
    [status],
  );

  useEffect(() => {
    setLoading(true);
    setError('');
    load()
      .catch((caught) => {
        if (isAuthenticationError(caught)) {
          router.replace('/entrar?next=/dashboard/negociacoes');
          return;
        }
        setError('Não foi possível carregar as negociações.');
      })
      .finally(() => setLoading(false));
  }, [load, router]);

  async function loadMore() {
    if (!pagination?.nextCursor) return;
    setLoadingMore(true);
    try {
      await load(pagination.nextCursor);
    } catch {
      setError('Não foi possível carregar mais negociações.');
    } finally {
      setLoadingMore(false);
    }
  }

  const activeTotal = Object.entries(counts)
    .filter(([key]) => !['COMPLETED', 'CANCELLED'].includes(key))
    .reduce((total, [, value]) => total + (value ?? 0), 0);

  return (
    <main className="dashboard-page">
      <DashboardHeader />
      <section className="dashboard-content shell">
        <p className="eyebrow">pós-proposta</p>
        <h1>Negociações</h1>
        <p className="dashboard-lede">
          Propostas aceitas viram negociações. Acompanhe documentos, pagamento,
          coleta, entrega e conclusão de cada uma.
        </p>
        <div className="dashboard-kpis compact-kpis">
          <div className="dashboard-kpi">
            <span>Em andamento</span>
            <strong>{activeTotal}</strong>
          </div>
          <div className="dashboard-kpi">
            <span>Concluídas</span>
            <strong>{counts.COMPLETED ?? 0}</strong>
          </div>
          <div className="dashboard-kpi">
            <span>Em disputa</span>
            <strong>{counts.DISPUTED ?? 0}</strong>
          </div>
        </div>
        <nav className="admin-tabs" aria-label="Filtrar negociações">
          {filters.map((filter) => (
            <a
              key={filter.value || 'all'}
              aria-current={status === filter.value ? 'page' : undefined}
              className={status === filter.value ? 'active' : ''}
              href={`/dashboard/negociacoes${filter.value ? `?status=${filter.value}` : '?status='}`}
            >
              {filter.label}
            </a>
          ))}
        </nav>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <div className="dashboard-loading">Carregando negociações...</div>
        ) : deals.length === 0 ? (
          <div className="empty-panel favorite-empty">
            <Handshake size={22} />
            <p>
              Nenhuma negociação aqui ainda. Aceite uma proposta em{' '}
              <a className="text-link" href="/dashboard/propostas">
                Propostas
              </a>{' '}
              para iniciar uma.
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Anúncio</th>
                  <th>Contraparte</th>
                  <th>Volume</th>
                  <th>Valor total</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const counterpart =
                    deal.side === 'BUYER'
                      ? deal.sellerCompany
                      : deal.buyerCompany;
                  const total =
                    Number(deal.proposal.quantity) *
                    Number(deal.proposal.unitPrice);
                  return (
                    <tr key={deal.id}>
                      <td>
                        <strong>{deal.listing.title}</strong>
                        <small className="table-subtext">
                          {label(dealSideLabels, deal.side)} · desde{' '}
                          {new Date(deal.createdAt).toLocaleDateString('pt-BR')}
                        </small>
                      </td>
                      <td>{companyName(counterpart)}</td>
                      <td>
                        {formatQuantity(deal.proposal.quantity)}{' '}
                        {deal.listing.unit}
                      </td>
                      <td>{formatMoney(total, deal.proposal.currency)}</td>
                      <td>
                        <span
                          className={`status-badge status-${deal.status.toLowerCase()}`}
                        >
                          {label(dealStatusLabels, deal.status)}
                        </span>
                      </td>
                      <td>
                        <a
                          className="text-link"
                          href={`/dashboard/negociacoes/${deal.id}`}
                        >
                          Abrir
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination?.hasMore && (
          <button
            className="secondary-button admin-load-more"
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </button>
        )}
      </section>
    </main>
  );
}

export default function DealsPage() {
  return (
    <Suspense
      fallback={
        <main className="dashboard-page">
          <div className="dashboard-loading">Carregando negociações...</div>
        </main>
      }
    >
      <DealsList />
    </Suspense>
  );
}
