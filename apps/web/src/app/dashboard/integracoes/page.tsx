'use client';

import { Download, KeyRound, Upload } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { DashboardHeader } from '../../../components/dashboard-header';
import { api, ApiKey, Company, isAuthenticationError } from '../../../lib/api';

type ImportResult = Awaited<ReturnType<typeof api.importListings>>;

export default function IntegrationsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState('');
  const [secret, setSecret] = useState('');
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [csv, setCsv] = useState('');
  const [submitForReview, setSubmitForReview] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [keysError, setKeysError] = useState('');

  useEffect(() => {
    api
      .companies()
      .then(({ companies: list }) => {
        setCompanies(list);
        setCompanyId(list[0]?.id ?? '');
      })
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/integracoes');
        else setError('Não foi possível carregar suas empresas.');
      });
  }, [router]);

  const loadKeys = useCallback(async () => {
    if (!companyId) return;
    try {
      const { keys: list } = await api.apiKeys(companyId);
      setKeys(list);
      setKeysError('');
    } catch {
      setKeys([]);
      setKeysError(
        'Somente proprietários e administradores da empresa gerenciam chaves.',
      );
    }
  }, [companyId]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('key');
    setError('');
    try {
      const created = await api.createApiKey(companyId, keyName);
      setSecret(created.secret);
      setKeyName('');
      await loadKeys();
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === 'API_KEY_LIMIT_REACHED'
          ? 'Limite de 5 chaves ativas atingido. Revogue uma antes.'
          : 'Não foi possível criar a chave.',
      );
    } finally {
      setBusy('');
    }
  }

  async function revoke() {
    if (!revoking) return;
    setBusy('revoke');
    try {
      await api.revokeApiKey(companyId, revoking.id);
      await loadKeys();
    } catch {
      setError('Não foi possível revogar a chave.');
    } finally {
      setBusy('');
      setRevoking(null);
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 512 * 1024) {
      setError('O arquivo CSV deve ter no máximo 512 KB.');
      return;
    }
    setCsv(await file.text());
  }

  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('import');
    setError('');
    setResult(null);
    try {
      setResult(await api.importListings(companyId, csv, submitForReview));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : '';
      setError(
        code.startsWith('CSV_MISSING_COLUMNS')
          ? `Colunas obrigatórias ausentes: ${code.split(':')[1] ?? ''}`
          : code === 'CSV_TOO_MANY_ROWS'
            ? 'Máximo de 100 linhas por importação.'
            : 'Não foi possível importar o CSV.',
      );
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="dashboard-page">
      <DashboardHeader />
      <section className="dashboard-content shell">
        <p className="eyebrow">ERP e automação</p>
        <h1>Integrações e API</h1>
        <p className="dashboard-lede">
          Conecte seu ERP: importe e exporte anúncios em CSV ou use chaves de
          API para consultar anúncios e negociações. Documentação em{' '}
          <a className="text-link" href="/desenvolvedores">
            /desenvolvedores
          </a>
          .
        </p>
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
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!companyId ? (
          <div className="empty-panel">
            Cadastre uma empresa para usar integrações.
          </div>
        ) : (
          <div className="settings-grid">
            <section className="admin-panel" aria-labelledby="keys-title">
              <h2 id="keys-title">
                <KeyRound size={17} aria-hidden="true" /> Chaves de API
              </h2>
              {secret && (
                <div role="status">
                  <p>
                    <strong>Copie a chave agora.</strong> Ela não será exibida
                    novamente.
                  </p>
                  <p className="secret-box">{secret}</p>
                </div>
              )}
              {keysError ? (
                <p className="form-note">{keysError}</p>
              ) : (
                <>
                  <form className="stack-form" onSubmit={createKey}>
                    <label>
                      Nome da integração
                      <input
                        required
                        minLength={2}
                        maxLength={120}
                        value={keyName}
                        onChange={(event) => setKeyName(event.target.value)}
                        placeholder="Ex.: ERP da matriz"
                      />
                    </label>
                    <button className="button small" disabled={busy !== ''}>
                      Gerar chave
                    </button>
                  </form>
                  <ul className="plain-list">
                    {keys.map((key) => (
                      <li key={key.id}>
                        <strong>{key.name}</strong> <code>{key.prefix}…</code>{' '}
                        {key.revokedAt ? (
                          <span className="status-badge status-revoked">
                            Revogada
                          </span>
                        ) : (
                          <button
                            className="link-button"
                            type="button"
                            onClick={() => setRevoking(key)}
                          >
                            Revogar
                          </button>
                        )}
                        <small className="table-subtext">
                          Criada por {key.createdBy.name} em{' '}
                          {new Date(key.createdAt).toLocaleDateString('pt-BR')}
                          {' · '}
                          {key.lastUsedAt
                            ? `último uso ${new Date(key.lastUsedAt).toLocaleString('pt-BR')}`
                            : 'nunca usada'}
                        </small>
                      </li>
                    ))}
                    {keys.length === 0 && (
                      <li>
                        <small>Nenhuma chave criada.</small>
                      </li>
                    )}
                  </ul>
                </>
              )}
            </section>
            <section className="admin-panel" aria-labelledby="csv-title">
              <h2 id="csv-title">
                <Upload size={17} aria-hidden="true" /> Importar anúncios (CSV)
              </h2>
              <p className="form-hint">
                Colunas: tipo (COMPRA/VENDA), titulo, categoria (slug ou nome),
                quantidade, unidade, preco_unitario, cidade, estado, descricao.
                Até 100 linhas; os anúncios entram como rascunho.
              </p>
              <a
                className="text-link"
                href={api.listingsTemplateUrl(companyId)}
              >
                <Download size={14} aria-hidden="true" /> Baixar modelo
              </a>
              <form className="stack-form" onSubmit={importCsv}>
                <label>
                  Arquivo CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => void readFile(event.target.files?.[0])}
                  />
                </label>
                <label>
                  Ou cole o conteúdo
                  <textarea
                    rows={5}
                    value={csv}
                    onChange={(event) => setCsv(event.target.value)}
                  />
                </label>
                <label className="form-check">
                  <input
                    type="checkbox"
                    checked={submitForReview}
                    onChange={(event) =>
                      setSubmitForReview(event.target.checked)
                    }
                  />
                  <span>Enviar direto para análise da moderação</span>
                </label>
                <button
                  className="button small"
                  disabled={busy !== '' || !csv.trim()}
                >
                  {busy === 'import' ? 'Importando...' : 'Importar'}
                </button>
              </form>
              {result && (
                <div role="status">
                  <p>
                    {result.created.length} anúncio(s) criado(s),{' '}
                    {result.errors.length} linha(s) com erro.
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="plain-list">
                      {result.errors.map((item) => (
                        <li key={item.line}>
                          <small>
                            Linha {item.line}: {item.error}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
            <section className="admin-panel" aria-labelledby="export-title">
              <h2 id="export-title">
                <Download size={17} aria-hidden="true" /> Exportar
              </h2>
              <p>Baixe os anúncios da empresa para conciliar no seu ERP.</p>
              <a
                className="secondary-button small"
                href={api.listingsExportUrl(companyId)}
              >
                Exportar anúncios (CSV)
              </a>
              <p>
                Negociações e indicadores ambientais ficam em{' '}
                <a className="text-link" href="/dashboard/relatorios">
                  Relatórios
                </a>
                .
              </p>
            </section>
          </div>
        )}
      </section>
      <ConfirmDialog
        open={revoking !== null}
        title="Revogar chave de API"
        description={`A integração "${revoking?.name ?? ''}" deixará de funcionar imediatamente.`}
        tone="danger"
        confirmLabel="Revogar"
        pending={busy === 'revoke'}
        onConfirm={() => void revoke()}
        onCancel={() => setRevoking(null)}
      />
    </main>
  );
}
