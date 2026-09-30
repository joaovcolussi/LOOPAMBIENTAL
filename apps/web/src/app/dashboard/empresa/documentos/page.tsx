'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Recycle,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  api,
  Company,
  CompanyDocument,
  CompanyDocumentType,
  CompanyVerification,
  companyDocumentUrl,
  isAuthenticationError,
} from '../../../../lib/api';
import { SessionActions } from '../../../../components/session-actions';

const documentTypeLabels: Record<CompanyDocumentType, string> = {
  CNPJ_CARD: 'Cartão CNPJ',
  SOCIAL_CONTRACT: 'Contrato social',
  ADDRESS_PROOF: 'Comprovante de endereço',
  OPERATING_LICENSE: 'Alvará de funcionamento',
  ENVIRONMENTAL_LICENSE: 'Licença ambiental',
  OTHER: 'Outro documento',
};

const documentStatusLabels: Record<string, string> = {
  PENDING: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

const verificationStatusLabels: Record<string, string> = {
  PENDING: 'Verificação em análise',
  APPROVED: 'Empresa verificada',
  REJECTED: 'Verificação recusada',
  CANCELLED: 'Verificação cancelada',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompanyDocumentsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [verifications, setVerifications] = useState<CompanyVerification[]>([]);
  const [type, setType] = useState<CompanyDocumentType>('CNPJ_CARD');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh(id: string) {
    const [documentResult, verificationResult] = await Promise.all([
      api.companyDocuments(id),
      api.companyVerifications(id),
    ]);
    setDocuments(documentResult.documents);
    setVerifications(verificationResult.verifications);
  }

  useEffect(() => {
    let active = true;
    api
      .companies()
      .then(async ({ companies: result }) => {
        if (!active) return;
        setCompanies(result);
        const first = result[0]?.id ?? '';
        setCompanyId(first);
        if (first) await refresh(first);
      })
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/empresa/documentos');
        else setError('Não foi possível carregar os documentos da empresa.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function selectCompany(id: string) {
    setCompanyId(id);
    setError('');
    setMessage('');
    try {
      await refresh(id);
    } catch {
      setError('Não foi possível carregar os documentos desta empresa.');
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !file) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.uploadCompanyDocument(companyId, { type, file });
      setFile(null);
      const input = document.getElementById(
        'document-file',
      ) as HTMLInputElement | null;
      if (input) input.value = '';
      await refresh(companyId);
      setMessage('Documento enviado para análise.');
    } catch {
      setError(
        'Não foi possível enviar o documento. Use PDF, JPEG, PNG ou WebP até 10 MB.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(documentId: string) {
    if (!window.confirm('Remover este documento?')) return;
    setError('');
    try {
      await api.deleteCompanyDocument(companyId, documentId);
      await refresh(companyId);
    } catch {
      setError('Não foi possível remover o documento.');
    }
  }

  async function requestVerification() {
    if (!companyId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.requestCompanyVerification(companyId);
      await refresh(companyId);
      setMessage('Verificação solicitada. Aguarde a análise da equipe.');
    } catch {
      setError(
        'Não foi possível solicitar a verificação. É necessário ao menos um documento.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando documentos...</div>
      </main>
    );

  const company = companies.find((item) => item.id === companyId) ?? null;
  const openVerification = verifications.find(
    (verification) => verification.status === 'PENDING',
  );
  const canRequest =
    documents.length > 0 &&
    !openVerification &&
    company?.verification !== 'VERIFIED';

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/dashboard/empresa">
            <ArrowLeft size={15} /> Voltar à empresa
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell">
        <p className="eyebrow">conformidade</p>
        <h1>Documentos e verificação</h1>
        <p className="dashboard-lede">
          Envie os documentos da empresa para conquistar o selo de verificada e
          transmitir mais confiança nas negociações.
        </p>

        {companies.length > 1 && (
          <label className="document-company-select">
            Empresa
            <select
              value={companyId}
              onChange={(event) => selectCompany(event.target.value)}
            >
              {companies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.tradeName || item.legalName}
                </option>
              ))}
            </select>
          </label>
        )}

        {company && (
          <div
            className={`document-verification-status ${
              company.verification === 'VERIFIED' ? 'verified' : ''
            }`}
          >
            <span className="document-verification-icon">
              {company.verification === 'VERIFIED' ? (
                <BadgeCheck size={22} />
              ) : (
                <ShieldCheck size={22} />
              )}
            </span>
            <div>
              <strong>
                {verificationStatusLabels[company.verification] ??
                  company.verification}
              </strong>
              <small>
                {company.verification === 'VERIFIED'
                  ? 'Sua empresa já pode exibir o selo de verificada.'
                  : 'Envie os documentos e solicite a verificação.'}
              </small>
            </div>
            {canRequest && (
              <button
                className="button small"
                type="button"
                disabled={saving}
                onClick={requestVerification}
              >
                Solicitar verificação
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="form-note" role="status">
            {message}
          </p>
        )}

        <form className="proposal-form" onSubmit={upload}>
          <div className="form-row">
            <label>
              Tipo de documento
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as CompanyDocumentType)
                }
              >
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Arquivo
              <input
                id="document-file"
                type="file"
                required
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <span className="form-note">
            PDF, JPEG, PNG ou WebP, até 10 MB. Os documentos ficam privados e só
            são acessados pela sua empresa e pela análise da plataforma.
          </span>
          <button
            className="button"
            type="submit"
            disabled={saving || !file || company?.verification === 'VERIFIED'}
          >
            <Upload size={16} /> {saving ? 'Enviando...' : 'Enviar documento'}
          </button>
        </form>

        <div className="document-list">
          {documents.length === 0 ? (
            <div className="empty-panel">Nenhum documento enviado ainda.</div>
          ) : (
            documents.map((document) => (
              <article className="document-card" key={document.id}>
                <span className="document-icon">
                  <FileText size={18} />
                </span>
                <div className="document-info">
                  <strong>{documentTypeLabels[document.type]}</strong>
                  <small>
                    {document.fileName} · {formatBytes(document.sizeBytes)} ·
                    por {document.uploadedBy.name}
                  </small>
                  {document.reviewNotes && (
                    <small className="document-review">
                      Revisão: {document.reviewNotes}
                    </small>
                  )}
                </div>
                <span
                  className={`admin-user-status ${document.status.toLowerCase()}`}
                >
                  {documentStatusLabels[document.status] ?? document.status}
                </span>
                <div className="document-actions">
                  <a
                    className="secondary-button small"
                    href={companyDocumentUrl(companyId, document.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Baixar
                  </a>
                  {document.status !== 'APPROVED' && (
                    <button
                      className="link-button"
                      type="button"
                      aria-label="Remover documento"
                      onClick={() => remove(document.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        {verifications.length > 0 && (
          <div className="document-history">
            <h2>Histórico de verificação</h2>
            {verifications.map((verification) => (
              <div className="document-history-row" key={verification.id}>
                <span
                  className={`admin-user-status ${verification.status.toLowerCase()}`}
                >
                  {verificationStatusLabels[verification.status] ??
                    verification.status}
                </span>
                <small>
                  Solicitado por {verification.requestedBy.name} em{' '}
                  {new Date(verification.createdAt).toLocaleDateString('pt-BR')}
                </small>
                {verification.reviewNotes && (
                  <small>Observação: {verification.reviewNotes}</small>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
