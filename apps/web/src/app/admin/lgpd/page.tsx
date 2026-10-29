'use client';

import { useEffect, useState } from 'react';
import { AdminNav } from '../../../components/admin-nav';
import { api } from '../../../lib/api';

type Requests = Awaited<ReturnType<typeof api.adminDataRequests>>['requests'];

const typeLabels: Record<string, string> = {
  EXPORT: 'Exportação de dados',
  DELETION: 'Exclusão / anonimização',
};
const statusLabels: Record<string, string> = {
  COMPLETED: 'Concluída',
  REJECTED: 'Recusada',
};

export default function AdminLgpdPage() {
  const [requests, setRequests] = useState<Requests>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminDataRequests()
      .then((result) => setRequests(result.requests))
      .catch(() => setError('Acesso restrito ou falha ao carregar.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">privacidade</p>
        <h1>Solicitações LGPD</h1>
        <p className="dashboard-lede">
          Registro das solicitações de titulares (exportação e exclusão). A
          exclusão anonimiza a conta e mantém o histórico comercial exigido por
          lei.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <div className="dashboard-loading">Carregando...</div>
        ) : requests.length === 0 ? (
          <div className="empty-panel">Nenhuma solicitação registrada.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Titular</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Observação</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td>{item.user.name}</td>
                    <td>{typeLabels[item.type] ?? item.type}</td>
                    <td>
                      <span
                        className={`status-badge status-${item.status === 'COMPLETED' ? 'completed' : 'failed'}`}
                      >
                        {statusLabels[item.status] ?? item.status}
                      </span>
                    </td>
                    <td>{item.notes ?? '—'}</td>
                    <td>{new Date(item.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
