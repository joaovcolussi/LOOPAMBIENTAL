'use client';

import { FormEvent, useState } from 'react';
import { AccountProfile, api } from '../../lib/api';

type Setup = { secret: string; otpauthUrl: string };

export function MfaSection({
  profile,
  onChanged,
}: {
  profile: AccountProfile;
  onChanged: () => void;
}) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setBusy(true);
    setError('');
    try {
      setSetup(await api.startMfaSetup());
    } catch {
      setError('Não foi possível iniciar a configuração.');
    } finally {
      setBusy(false);
    }
  }

  async function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.enableMfa(code);
      setRecoveryCodes(result.recoveryCodes);
      setSetup(null);
      setCode('');
      onChanged();
    } catch {
      setError('Código inválido. Confira o horário do seu dispositivo.');
    } finally {
      setBusy(false);
    }
  }

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.disableMfa(password, code);
      setPassword('');
      setCode('');
      setRecoveryCodes([]);
      onChanged();
    } catch {
      setError('Senha ou código inválido.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="mfa-title">
      <h2 id="mfa-title">Verificação em duas etapas (MFA)</h2>
      <p className="form-hint">
        Protege o login com um código temporário de um aplicativo autenticador
        (Google Authenticator, Microsoft Authenticator, 1Password etc.).
        Recomendado para administradores.
      </p>
      {recoveryCodes.length > 0 && (
        <div role="status">
          <p>
            <strong>Guarde estes códigos de recuperação.</strong> Cada um pode
            ser usado uma única vez se você perder o autenticador. Eles não
            serão exibidos novamente.
          </p>
          <ul className="recovery-codes secret-box">
            {recoveryCodes.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </div>
      )}
      {profile.mfaEnabledAt ? (
        <form className="stack-form" onSubmit={disable}>
          <p className="form-note">
            Ativa desde{' '}
            {new Date(profile.mfaEnabledAt).toLocaleDateString('pt-BR')} ·{' '}
            {profile.mfaRecoveryCodesRemaining} códigos de recuperação
            restantes.
          </p>
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
            Código do autenticador
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="secondary-button small" disabled={busy}>
            Desativar MFA
          </button>
        </form>
      ) : setup ? (
        <form className="stack-form" onSubmit={enable}>
          <p>
            1. Adicione a conta no autenticador usando a chave abaixo (ou{' '}
            <a className="text-link" href={setup.otpauthUrl}>
              abra no app do celular
            </a>
            ).
          </p>
          <p className="secret-box" aria-label="Chave secreta">
            {setup.secret.match(/.{1,4}/g)?.join(' ')}
          </p>
          <label>
            2. Digite o código de 6 dígitos gerado
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              aria-describedby={error ? 'mfa-error' : undefined}
            />
          </label>
          {error && (
            <p className="form-error" role="alert" id="mfa-error">
              {error}
            </p>
          )}
          <button className="button small" disabled={busy}>
            {busy ? 'Verificando...' : 'Ativar MFA'}
          </button>
        </form>
      ) : (
        <>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button small"
            type="button"
            disabled={busy}
            onClick={start}
          >
            Configurar autenticador
          </button>
        </>
      )}
    </section>
  );
}
