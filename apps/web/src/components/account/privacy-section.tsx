'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccountProfile, api } from '../../lib/api';

const consentLabels: Record<string, string> = {
  TERMS: 'Termos de uso',
  PRIVACY: 'Política de privacidade',
};

export function PrivacySection({
  profile,
  onChange,
}: {
  profile: AccountProfile;
  onChange: (profile: AccountProfile) => void;
}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const latest = (type: 'TERMS' | 'PRIVACY') =>
    profile.consents.find((consent) => consent.type === type);
  const outdated =
    latest('TERMS')?.version !== profile.currentLegalVersions.terms ||
    latest('PRIVACY')?.version !== profile.currentLegalVersions.privacy;

  async function accept() {
    setBusy(true);
    setError('');
    try {
      const { user } = await api.acceptCurrentTerms();
      onChange(user);
      setMessage('Aceite registrado com data e versão.');
    } catch {
      setError('Não foi possível registrar o aceite.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.deleteAccount(password, confirmation);
      router.replace('/?conta=removida');
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : '';
      setError(
        code === 'TRANSFER_COMPANY_OWNERSHIP_FIRST'
          ? 'Você é o único proprietário de uma empresa com outros membros. Transfira a propriedade antes de excluir a conta.'
          : code === 'INVALID_PASSWORD'
            ? 'Senha incorreta.'
            : code === 'DELETE_CONFIRMATION_REQUIRED'
              ? 'Digite EXCLUIR para confirmar.'
              : 'Não foi possível excluir a conta.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="admin-panel" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Privacidade e LGPD</h2>
        <ul className="plain-list">
          {(['TERMS', 'PRIVACY'] as const).map((type) => {
            const consent = latest(type);
            return (
              <li key={type}>
                <strong>{consentLabels[type]}</strong>
                <small className="table-subtext">
                  {consent
                    ? `Versão ${consent.version} aceita em ${new Date(consent.acceptedAt).toLocaleString('pt-BR')}`
                    : 'Sem aceite registrado'}
                </small>
              </li>
            );
          })}
        </ul>
        {outdated && (
          <div className="pending-checkout">
            <p>Há uma nova versão dos termos ou da política de privacidade.</p>
            <button
              className="button small"
              type="button"
              disabled={busy}
              onClick={accept}
            >
              Ler e aceitar a versão atual
            </button>
          </div>
        )}
        <p>
          Você pode baixar uma cópia dos seus dados pessoais em formato JSON
          (portabilidade, art. 18 da LGPD).
        </p>
        <a className="secondary-button small" href={api.dataExportUrl()}>
          Exportar meus dados
        </a>
        {message && (
          <p className="form-note" role="status">
            {message}
          </p>
        )}
      </section>
      <section
        className="admin-panel danger-zone"
        aria-labelledby="delete-title"
      >
        <h2 id="delete-title">Excluir conta</h2>
        <p>
          Seus dados pessoais serão anonimizados e todas as sessões encerradas.
          Propostas, negociações, mensagens e registros de auditoria permanecem
          por obrigação legal, sem identificar você.
        </p>
        <form className="stack-form" onSubmit={remove}>
          <label>
            Senha atual
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Digite EXCLUIR para confirmar
            <input
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              aria-describedby={error ? 'delete-error' : undefined}
            />
          </label>
          {error && (
            <p className="form-error" role="alert" id="delete-error">
              {error}
            </p>
          )}
          <button
            className="danger-button"
            disabled={busy || confirmation !== 'EXCLUIR'}
          >
            Excluir minha conta
          </button>
        </form>
      </section>
    </>
  );
}
