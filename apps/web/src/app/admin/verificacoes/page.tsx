'use client';

import { useEffect, useState } from 'react';
import { Check, FileText, Recycle, ShieldCheck, X } from 'lucide-react';
import {
  AdminCompanyVerification,
  api,
  companyDocumentUrl,
} from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

const documentTypeLabels: Record<string, string> = {
  CNPJ_CARD: 'Cartão CNPJ',
  SOCIAL_CONTRACT: 'Contrato social',
  ADDRESS_PROOF: 'Comprovante de endereço',
  OPERATING_LICENSE: 'Alvará de funcionamento',
  ENVIRONMENTAL_LICENSE: 'Licença ambiental',
  OTHER: 'Outro documento',
};

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<
    AdminCompanyVerification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');

  useEffect(() => {
    api
      .adminCompanyVerifications()
      .then(({ verifications: result }) => setVerifications(result))
      .catch(() =>
        setError('Acesso restrito ou não foi possível carregar a fila.'),
      )
      .finally(() => setLoading(false));
  }, []);

  async function approve(id: string) {
    setActingId(id);
    setError('');
    try {
      await api.approveCompanyVerification(id);
      setVerifications((current) => current.filter((item) => item.id !== id));
    } catch {
      setError(
        'Não foi possível aprovar. A verificação pode ter sido decidida por outra pessoa.',
      );
    } finally {
      setActingId('');
    }
  }

  async function reject(item: AdminCompanyVerification) {
    const reason = window.prompt('Informe o motivo da recusa:');
    if (!reason) return;
    setActingId(item.id);
    setError('');
    try {
      await api.rejectCompanyVerification(item.id, reason);
      setVerifications((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
    } catch {
      setError('Não foi possível recusar. Confira o motivo e tente novamente.');
    } finally {
      setActingId('');
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando verificações...</div>
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
        <h1>Verificação de empresas</h1>
        <p className="dashboard-lede">
          Analise os documentos enviados e conceda o selo de empresa verificada.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="moderation-list">
          {verifications.length === 0 ? (
            <div className="empty-panel">
              Nenhuma solicitação de verificação aguardando análise.
            </div>
          ) : (
            verifications.map((item) => (
              <article className="moderation-card" key={item.id}>
                <div>
                  <span className="dashboard-number">
                    <ShieldCheck size={14} /> Verificação
                  </span>
                  <h2>{item.company.tradeName || item.company.legalName}</h2>
                  <p>
                    {item.company.legalName}
                    {item.company.city
                      ? ` · ${item.company.city}, ${item.company.state ?? ''}`
                      : ''}
                  </p>
                  {(item.company.contactName || item.company.contactEmail) && (
                    <p>
                      Responsável: {item.company.contactName || '—'} ·{' '}
                      {item.company.contactEmail || '—'}
                    </p>
                  )}
                  <small>
                    Solicitado por {item.requestedBy.name} em{' '}
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </small>
                  <div className="document-list document-list-admin">
                    {item.company.documents.length === 0 ? (
                      <div className="empty-panel">
                        Nenhum documento anexado.
                      </div>
                    ) : (
                      item.company.documents.map((document) => (
                        <div className="document-card" key={document.id}>
                          <span className="document-icon">
                            <FileText size={18} />
                          </span>
                          <div className="document-info">
                            <strong>
                              {documentTypeLabels[document.type] ??
                                document.type}
                            </strong>
                            <small>{document.fileName}</small>
                          </div>
                          <a
                            className="secondary-button small"
                            href={companyDocumentUrl(
                              item.company.id,
                              document.id,
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Baixar
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="moderation-actions">
                  <button
                    className="approve-button"
                    disabled={actingId === item.id}
                    onClick={() => approve(item.id)}
                  >
                    <Check size={15} /> Aprovar
                  </button>
                  <button
                    className="reject-button"
                    disabled={actingId === item.id}
                    onClick={() => reject(item)}
                  >
                    <X size={15} /> Recusar
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
