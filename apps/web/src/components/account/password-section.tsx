'use client';

import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';

export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('A confirmação não confere com a nova senha.');
      return;
    }
    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Senha alterada. As outras sessões foram encerradas.');
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === 'INVALID_PASSWORD'
          ? 'Senha atual incorreta ou nova senha inválida (mínimo 8 caracteres).'
          : 'Não foi possível alterar a senha.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="password-title">
      <h2 id="password-title">Senha</h2>
      <form className="stack-form" onSubmit={submit}>
        <label>
          Senha atual
          <input
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label>
          Nova senha
          <input
            required
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label>
          Confirmar nova senha
          <input
            required
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-describedby={error ? 'password-error' : undefined}
          />
        </label>
        {error && (
          <p className="form-error" role="alert" id="password-error">
            {error}
          </p>
        )}
        {message && (
          <p className="form-note" role="status">
            {message}
          </p>
        )}
        <button className="button small" disabled={saving}>
          {saving ? 'Alterando...' : 'Alterar senha'}
        </button>
      </form>
    </section>
  );
}
