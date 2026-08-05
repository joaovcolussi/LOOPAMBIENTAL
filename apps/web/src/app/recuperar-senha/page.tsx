'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, Recycle } from 'lucide-react';
import { api } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Não foi possível solicitar a redefinição.');
    }
  }
  return (
    <main className="auth-page">
      <a className="brand auth-brand" href="/">
        <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
      </a>
      <section className="auth-card">
        <p className="eyebrow">recuperar acesso</p>
        <h1>Esqueceu a senha?</h1>
        {sent ? (
          <p className="auth-subtitle">
            Se o e-mail estiver cadastrado, enviaremos um link de redefinição.
            Em desenvolvimento, consulte a mensagem no Mailpit em{' '}
            <a href="http://localhost:8025" target="_blank" rel="noreferrer">
              localhost:8025
            </a>
            .
          </p>
        ) : (
          <>
            <p className="auth-subtitle">
              Informe seu e-mail para receber as instruções.
            </p>
            <form onSubmit={submit}>
              <label>
                E-mail
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button auth-submit">
                Enviar instruções <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}
        <p className="auth-switch">
          <a href="/entrar">Voltar para entrar</a>
        </p>
      </section>
    </main>
  );
}
