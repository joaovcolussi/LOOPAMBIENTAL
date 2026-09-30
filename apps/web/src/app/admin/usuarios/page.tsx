'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, AdminUser } from '../../../lib/api';
import { AdminNav } from '../../../components/admin-nav';
import { TableLoadingRow } from '../../../components/table-loading-row';

const roleLabels: Record<string, string> = {
  USER: 'Usuário',
  MODERATOR: 'Moderador',
  ADMIN: 'Administrador',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativo',
  PENDING: 'Pendente',
  BLOCKED: 'Bloqueado',
  DELETED: 'Excluído',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [queryInput, setQueryInput] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .adminResourceUsers({
        q: q || undefined,
        platformRole: role || undefined,
        status: status || undefined,
        pageSize: 25,
      })
      .then((result) => {
        if (!active) return;
        setUsers(result.users);
        setCursor(result.pagination.nextCursor);
        setHasMore(result.pagination.hasMore);
        setTotal(result.pagination.total);
      })
      .catch(() => {
        if (active)
          setError('Acesso restrito ou não foi possível carregar os usuários.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, role, status]);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await api.adminResourceUsers({
        q: q || undefined,
        platformRole: role || undefined,
        status: status || undefined,
        cursor,
        pageSize: 25,
      });
      setUsers((current) => [...current, ...result.users]);
      setCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch {
      setError('Não foi possível carregar mais usuários.');
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQ(queryInput.trim());
  }

  async function changeRole(
    user: AdminUser,
    platformRole: AdminUser['platformRole'],
  ) {
    setSavingId(user.id);
    setError('');
    try {
      const updated = await api.updateAdminUserRole(user.id, platformRole);
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch {
      setError('Não foi possível atualizar o papel deste usuário.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">administração</p>
        <h1>Usuários</h1>
        <p className="dashboard-lede">
          Consulte contas, status e papéis de plataforma. {total} usuário(s).
        </p>
        <form className="admin-filter-bar" onSubmit={submitSearch}>
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar usuários"
          />
          <button className="button small" type="submit">
            Buscar
          </button>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            aria-label="Filtrar por papel"
          >
            <option value="">Todos os papéis</option>
            <option value="USER">Usuário</option>
            <option value="MODERATOR">Moderador</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="PENDING">Pendente</option>
            <option value="BLOCKED">Bloqueado</option>
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
                <th>Usuário</th>
                <th>Status</th>
                <th>E-mail verificado</th>
                <th>Papel</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 && <TableLoadingRow colSpan={5} />}
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.name}
                    <small>{user.email}</small>
                  </td>
                  <td>{statusLabels[user.status] ?? user.status}</td>
                  <td>{user.emailVerifiedAt ? 'Sim' : 'Não'}</td>
                  <td>
                    <select
                      value={user.platformRole}
                      disabled={savingId === user.id}
                      onChange={(event) =>
                        changeRole(
                          user,
                          event.target.value as AdminUser['platformRole'],
                        )
                      }
                      aria-label={`Papel de ${user.name}`}
                    >
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && users.length === 0 && (
          <div className="empty-panel">Nenhum usuário encontrado.</div>
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
