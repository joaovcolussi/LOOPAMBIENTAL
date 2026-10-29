'use client';

import { FormEvent, useState } from 'react';
import { AccountProfile, api } from '../../lib/api';

export function ProfileSection({
  profile,
  onChange,
}: {
  profile: AccountProfile;
  onChange: (profile: AccountProfile) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { user } = await api.updateAccount({ name });
      onChange(user);
      setMessage('Perfil atualizado.');
    } catch {
      setError('Informe um nome entre 2 e 150 caracteres.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="profile-title">
      <h2 id="profile-title">Perfil</h2>
      <form className="stack-form" onSubmit={submit}>
        <label>
          Nome completo
          <input
            required
            minLength={2}
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'profile-error' : undefined}
          />
        </label>
        <label>
          E-mail
          <input value={profile.email} readOnly aria-readonly="true" />
        </label>
        <p className="form-hint">
          {profile.emailVerifiedAt
            ? `E-mail verificado em ${new Date(profile.emailVerifiedAt).toLocaleDateString('pt-BR')}.`
            : 'E-mail ainda não verificado.'}
        </p>
        {error && (
          <p className="form-error" role="alert" id="profile-error">
            {error}
          </p>
        )}
        {message && (
          <p className="form-note" role="status">
            {message}
          </p>
        )}
        <button className="button small" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </form>
    </section>
  );
}
