'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, Recycle } from 'lucide-react';
import { api } from '../../lib/api';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch {
      setError('O link é inválido ou expirou.');
    }
  }
  return (
    <main className="auth-page">
      <a className="brand auth-brand" href="/">
        <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
      </a>
      <section className="auth-card">
        <p className="eyebrow">novo acesso</p>
        <h1>Crie uma nova senha.</h1>
        {done ? (
          <p className="auth-subtitle">
            Senha alterada com sucesso. <a href="/entrar">Entre agora.</a>
          </p>
        ) : (
          <form onSubmit={submit}>
            <label>
              Nova senha
              <input
                required
                minLength={8}
                maxLength={128}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button auth-submit">
              Redefinir senha <ArrowRight size={16} />
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
