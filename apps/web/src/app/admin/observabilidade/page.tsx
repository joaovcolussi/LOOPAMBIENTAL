'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminNav } from '../../../components/admin-nav';
import { api } from '../../../lib/api';
import {
  filePurposeLabels,
  fileScanStatusLabels,
  label,
} from '../../../lib/labels';

type Overview = Awaited<ReturnType<typeof api.adminObservability>>;
type Files = Awaited<ReturnType<typeof api.adminFiles>>;

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}min`;
}

export default function AdminObservabilityPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [files, setFiles] = useState<Files | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [overviewResult, filesResult] = await Promise.all([
        api.adminObservability(),
        api.adminFiles(),
      ]);
      setOverview(overviewResult);
      setFiles(filesResult);
      setError('');
    } catch {
      setError('Acesso restrito ou API indisponível.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">operação</p>
        <h1>Observabilidade</h1>
        <p className="dashboard-lede">
          Métricas da instância da API (atualiza a cada 15 s), fila de eventos
          (outbox) e varredura de arquivos enviados. Métricas no formato
          Prometheus em <code>/api/v1/metrics</code>.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="secondary-button small"
          type="button"
          disabled={refreshing}
          onClick={() => void load()}
        >
          {refreshing ? 'Atualizando...' : 'Atualizar agora'}
        </button>
        {overview && (
          <>
            <div className="report-kpis">
              <article>
                <span>Requisições</span>
                <strong>{overview.totalRequests}</strong>
                <small>
                  desde {formatUptime(overview.uptimeSeconds)} atrás
                </small>
              </article>
              <article>
                <span>Erros 5xx</span>
                <strong>{overview.totalErrors}</strong>
                <small>
                  {overview.totalRequests
                    ? (
                        (overview.totalErrors / overview.totalRequests) *
                        100
                      ).toFixed(2)
                    : '0.00'}
                  % das requisições
                </small>
              </article>
              <article>
                <span>Conexões em tempo real</span>
                <strong>{overview.realtimeConnections}</strong>
                <small>streams SSE abertos</small>
              </article>
              <article>
                <span>Memória (RSS)</span>
                <strong>{overview.memory.rssMb} MB</strong>
                <small>heap {overview.memory.heapUsedMb} MB</small>
              </article>
              <article>
                <span>Outbox pendente</span>
                <strong>
                  {(overview.outbox.PENDING ?? 0) +
                    (overview.outbox.PROCESSING ?? 0)}
                </strong>
                <small>{overview.outbox.FAILED ?? 0} com falha</small>
              </article>
              <article>
                <span>Pagamentos</span>
                <strong>
                  {overview.paymentProvider === 'MERCADO_PAGO'
                    ? 'Mercado Pago'
                    : 'Simulado'}
                </strong>
                <small>ambiente {overview.environment}</small>
              </article>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <caption className="sr-only">Rotas mais acessadas</caption>
                <thead>
                  <tr>
                    <th>Rota</th>
                    <th>Requisições</th>
                    <th>Erros</th>
                    <th>Média</th>
                    <th>p95 (aprox.)</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.routes.slice(0, 15).map((route) => (
                    <tr key={`${route.method} ${route.route}`}>
                      <td>
                        <code>
                          {route.method} {route.route}
                        </code>
                      </td>
                      <td>{route.count}</td>
                      <td>{route.errors}</td>
                      <td>{route.averageMs} ms</td>
                      <td>≤ {route.p95Ms} ms</td>
                    </tr>
                  ))}
                  {overview.routes.length === 0 && (
                    <tr>
                      <td colSpan={5}>Sem tráfego registrado ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {overview.failedEvents.length > 0 && (
              <section className="admin-panel">
                <h2>Eventos com falha</h2>
                <ul className="plain-list">
                  {overview.failedEvents.map((event) => (
                    <li key={event.id}>
                      <strong>{event.type}</strong> · {event.attempts}{' '}
                      tentativas
                      <small className="table-subtext">
                        {event.lastError ?? 'sem detalhe'}
                      </small>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        {files && (
          <section className="admin-panel">
            <h2>Arquivos e varredura</h2>
            <p className="form-hint">
              Limpos: {files.summary.CLEAN ?? 0} · Bloqueados:{' '}
              {files.summary.INFECTED ?? 0}. Teste o bloqueio enviando o arquivo
              EICAR como laudo.
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Enviado por</th>
                    <th>Tamanho</th>
                    <th>Varredura</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {files.files.slice(0, 30).map((file) => (
                    <tr key={file.id}>
                      <td>
                        {label(filePurposeLabels, file.purpose)}
                        <small className="table-subtext">
                          {file.mimeType} ·{' '}
                          {file.accessLevel === 'PUBLIC'
                            ? 'público'
                            : 'privado'}{' '}
                          · sha256 {file.sha256.slice(0, 12)}…
                        </small>
                      </td>
                      <td>{file.owner.name}</td>
                      <td>{Math.round(file.sizeBytes / 1024)} KB</td>
                      <td>
                        <span
                          className={`status-badge status-${file.scanStatus.toLowerCase()}`}
                        >
                          {label(fileScanStatusLabels, file.scanStatus)}
                        </span>
                        {file.scanDetails && (
                          <small className="table-subtext">
                            {file.scanDetails}
                          </small>
                        )}
                      </td>
                      <td>
                        {new Date(file.createdAt).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                  {files.files.length === 0 && (
                    <tr>
                      <td colSpan={5}>Nenhum arquivo registrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
