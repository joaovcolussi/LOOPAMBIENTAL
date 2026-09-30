'use client';

import { useEffect, useState } from 'react';
import { api, AdminAuditLog } from '../../../lib/api';
import { AdminNav } from '../../../components/admin-nav';
import { TableLoadingRow } from '../../../components/table-loading-row';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [actionInput, setActionInput] = useState('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
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
      .adminAuditLogs({
        action: action || undefined,
        resourceType: resourceType || undefined,
        pageSize: 30,
      })
      .then((result) => {
        if (!active) return;
        setLogs(result.auditLogs);
        setCursor(result.pagination.nextCursor);
        setHasMore(result.pagination.hasMore);
        setTotal(result.pagination.total);
      })
      .catch(() => {
        if (active)
          setError('Acesso restrito ou não foi possível carregar a auditoria.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [action, resourceType]);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await api.adminAuditLogs({
        action: action || undefined,
        resourceType: resourceType || undefined,
        cursor,
        pageSize: 30,
      });
      setLogs((current) => [...current, ...result.auditLogs]);
      setCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch {
      setError('Não foi possível carregar mais registros.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">administração</p>
        <h1>Auditoria</h1>
        <p className="dashboard-lede">
          Histórico de ações administrativas e de moderação. {total}{' '}
          registro(s).
        </p>
        <form
          className="admin-filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            setAction(actionInput.trim());
          }}
        >
          <input
            value={actionInput}
            onChange={(event) => setActionInput(event.target.value)}
            placeholder="Buscar por ação (ex.: COMPANY_VERIFIED)"
            aria-label="Buscar por ação"
          />
          <button className="button small" type="submit">
            Buscar
          </button>
          <select
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value)}
            aria-label="Filtrar por recurso"
          >
            <option value="">Todos os recursos</option>
            <option value="USER">Usuário</option>
            <option value="COMPANY">Empresa</option>
            <option value="LISTING">Anúncio</option>
            <option value="PLATFORM_SETTING">Configuração</option>
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
                <th>Ação</th>
                <th>Recurso</th>
                <th>Ator</th>
                <th>Detalhes</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 && <TableLoadingRow colSpan={5} />}
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.action}</td>
                  <td>
                    {log.resourceType}
                    <small>{log.resourceId ?? '—'}</small>
                  </td>
                  <td>{log.actor ? log.actor.name : 'Sistema'}</td>
                  <td>
                    {log.metadata
                      ? Object.entries(log.metadata)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(' · ')
                      : '—'}
                  </td>
                  <td>{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && logs.length === 0 && (
          <div className="empty-panel">Nenhum registro de auditoria.</div>
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
