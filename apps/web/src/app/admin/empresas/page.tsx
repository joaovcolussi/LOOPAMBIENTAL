'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, AdminCompanyRow } from '../../../lib/api';
import { AdminNav } from '../../../components/admin-nav';
import { TableLoadingRow } from '../../../components/table-loading-row';
import {
  companyStatusLabels,
  verificationStatusLabels,
} from '../../../lib/labels';

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompanyRow[]>([]);
  const [queryInput, setQueryInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [verification, setVerification] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .adminCompanies({
        q: q || undefined,
        status: status || undefined,
        verification: verification || undefined,
        pageSize: 25,
      })
      .then((result) => {
        if (!active) return;
        setCompanies(result.companies);
        setCursor(result.pagination.nextCursor);
        setHasMore(result.pagination.hasMore);
        setTotal(result.pagination.total);
      })
      .catch(() => {
        if (active)
          setError('Acesso restrito ou não foi possível carregar as empresas.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, status, verification]);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await api.adminCompanies({
        q: q || undefined,
        status: status || undefined,
        verification: verification || undefined,
        cursor,
        pageSize: 25,
      });
      setCompanies((current) => [...current, ...result.companies]);
      setCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch {
      setError('Não foi possível carregar mais empresas.');
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQ(queryInput.trim());
  }

  async function changeStatus(
    company: AdminCompanyRow,
    nextStatus: 'ACTIVE' | 'BLOCKED',
  ) {
    setActingId(company.id);
    setError('');
    try {
      const updated = await api.updateAdminCompanyStatus(
        company.id,
        nextStatus,
      );
      setCompanies((current) =>
        current.map((item) =>
          item.id === company.id ? { ...item, status: updated.status } : item,
        ),
      );
    } catch {
      setError('Não foi possível atualizar o status da empresa.');
    } finally {
      setActingId('');
    }
  }

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">administração</p>
        <h1>Empresas</h1>
        <p className="dashboard-lede">
          Acompanhe o cadastro e a verificação das empresas. {total} empresa(s).
        </p>
        <form className="admin-filter-bar" onSubmit={submitSearch}>
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Buscar por razão social, nome fantasia ou cidade"
            aria-label="Buscar empresas"
          />
          <button className="button small" type="submit">
            Buscar
          </button>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativa</option>
            <option value="PENDING">Pendente</option>
            <option value="BLOCKED">Bloqueada</option>
          </select>
          <select
            value={verification}
            onChange={(event) => setVerification(event.target.value)}
            aria-label="Filtrar por verificação"
          >
            <option value="">Todas as verificações</option>
            <option value="UNVERIFIED">Não verificada</option>
            <option value="PENDING">Em análise</option>
            <option value="VERIFIED">Verificada</option>
            <option value="REJECTED">Recusada</option>
          </select>
        </form>
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
                <th>Status</th>
                <th>Verificação</th>
                <th>Equipe / anúncios</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && companies.length === 0 && (
                <TableLoadingRow colSpan={5} />
              )}
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>
                    {company.tradeName || company.legalName}
                    <small>
                      {company.tradeName ? company.legalName : '—'}
                      {company.city
                        ? ` · ${company.city}${company.state ? `/${company.state}` : ''}`
                        : ''}
                    </small>
                  </td>
                  <td>
                    {companyStatusLabels[company.status] ?? company.status}
                  </td>
                  <td>
                    {verificationStatusLabels[company.verification] ??
                      company.verification}
                  </td>
                  <td>
                    {company._count.members} membro(s)
                    <small>{company._count.listings} anúncio(s)</small>
                  </td>
                  <td>
                    <div className="moderation-actions">
                      <button
                        className="approve-button"
                        type="button"
                        disabled={
                          actingId === company.id || company.status === 'ACTIVE'
                        }
                        onClick={() => changeStatus(company, 'ACTIVE')}
                      >
                        Ativar
                      </button>
                      <button
                        className="reject-button"
                        type="button"
                        disabled={
                          actingId === company.id ||
                          company.status === 'BLOCKED'
                        }
                        onClick={() => changeStatus(company, 'BLOCKED')}
                      >
                        Bloquear
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && companies.length === 0 && (
          <div className="empty-panel">Nenhuma empresa encontrada.</div>
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
