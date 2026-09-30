'use client';

import { useEffect, useState } from 'react';
import { Check, Flag, Recycle, X } from 'lucide-react';
import { api, Report } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

const reasonLabels: Record<string, string> = {
  COUNTERFEIT: 'Material falso ou adulterado',
  PRODUCT_QUALITY: 'Qualidade diferente do anunciado',
  MISLEADING: 'Informação enganosa',
  CONTACT_ABUSE: 'Uso indevido de contato',
  SPAM: 'Spam ou propaganda',
  ILLEGAL: 'Atividade ilegal',
  HAZARDOUS: 'Resíduo perigoso sem controle',
  UNDOCUMENTED: 'Documentação ausente',
  OTHER: 'Outro',
};

const targetLabels: Record<string, string> = {
  LISTING: 'Anúncio',
  COMPANY: 'Empresa',
  USER: 'Usuário',
  MESSAGE: 'Mensagem',
};

function targetSummary(report: Report) {
  if (report.listing) return report.listing.title;
  if (report.company)
    return report.company.tradeName || report.company.legalName;
  if (report.reportedUser) return report.reportedUser.name;
  if (report.message) return report.message.body.slice(0, 120);
  return 'Alvo não identificado';
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');

  useEffect(() => {
    api
      .adminReports()
      .then(({ reports: result }) => setReports(result))
      .catch(() =>
        setError('Acesso restrito ou não foi possível carregar as denúncias.'),
      )
      .finally(() => setLoading(false));
  }, []);

  async function resolve(item: Report, status: 'RESOLVED' | 'DISMISSED') {
    const notes = window.prompt(
      status === 'RESOLVED'
        ? 'Descreva a resolução:'
        : 'Motivo para arquivar (opcional):',
    );
    if (status === 'RESOLVED' && !notes) return;
    setActingId(item.id);
    setError('');
    try {
      await api.resolveReport(item.id, {
        status,
        notes: notes ?? undefined,
      });
      setReports((current) => current.filter((r) => r.id !== item.id));
    } catch {
      setError('Não foi possível atualizar a denúncia. Tente novamente.');
    } finally {
      setActingId('');
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando denúncias...</div>
      </main>
    );

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/admin">
            Voltar à gestão
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell">
        <p className="eyebrow">administração</p>
        <h1>Denúncias</h1>
        <p className="dashboard-lede">
          Revise denúncias de anúncios, empresas, usuários e mensagens.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="moderation-list">
          {reports.length === 0 ? (
            <div className="empty-panel">Nenhuma denúncia pendente.</div>
          ) : (
            reports.map((item) => (
              <article className="moderation-card" key={item.id}>
                <div>
                  <span className="dashboard-number">
                    <Flag size={14} /> {targetLabels[item.targetType]} ·{' '}
                    {reasonLabels[item.reason] ?? item.reason}
                  </span>
                  <h2>{targetSummary(item)}</h2>
                  {item.details && <p>{item.details}</p>}
                  <p>
                    Denunciado por {item.reporter.name} ({item.reporter.email})
                  </p>
                  <small>
                    Recebida em{' '}
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </small>
                </div>
                <div className="moderation-actions">
                  <button
                    className="approve-button"
                    disabled={actingId === item.id}
                    onClick={() => resolve(item, 'RESOLVED')}
                  >
                    <Check size={15} /> Resolver
                  </button>
                  <button
                    className="reject-button"
                    disabled={actingId === item.id}
                    onClick={() => resolve(item, 'DISMISSED')}
                  >
                    <X size={15} /> Arquivar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
