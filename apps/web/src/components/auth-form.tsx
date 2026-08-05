'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { SessionActions } from './session-actions';

type AuthFormProps = { mode: 'login' | 'register' };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result =
        mode === 'register'
          ? await api.register({ name, email, password })
          : await api.login({ email, password });
      const next = new URLSearchParams(window.location.search).get('next');
      router.push(
        next ||
          (mode === 'login' &&
          (result.user.platformRole === 'ADMIN' ||
            result.user.platformRole === 'MODERATOR')
            ? '/admin'
            : '/dashboard'),
      );
      router.refresh();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'REQUEST_FAILED';
      setError(authErrorMessage(code, mode));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-session-actions">
        <SessionActions mode="auth" />
      </div>
      <a className="brand auth-brand" href="/">
        <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
      </a>
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">
          {mode === 'register' ? 'comece agora' : 'bem-vindo de volta'}
        </p>
        <h1 id="auth-title">
          {mode === 'register' ? 'Crie sua conta.' : 'Entre na sua conta.'}
        </h1>
        <p className="auth-subtitle">
          {mode === 'register'
            ? 'Conecte sua empresa à cadeia de valor dos resíduos industriais.'
            : 'Acesse seus anúncios, propostas e negociações.'}
        </p>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Nome completo
              <input
                required
                minLength={2}
                maxLength={150}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </label>
          )}
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
          <label>
            Senha
            <input
              required
              type="password"
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                mode === 'register' ? 'new-password' : 'current-password'
              }
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {mode === 'login' && (
            <a className="forgot-link" href="/recuperar-senha">
              Esqueci minha senha
            </a>
          )}
          <button className="button auth-submit" disabled={loading}>
            {loading
              ? 'Aguarde...'
              : mode === 'register'
                ? 'Criar conta'
                : 'Entrar'}{' '}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'register'
            ? 'Já possui uma conta?'
            : 'Ainda não possui conta?'}{' '}
          <a href={mode === 'register' ? '/entrar' : '/cadastro'}>
            {mode === 'register' ? 'Entrar' : 'Criar conta'}
          </a>
        </p>
      </section>
    </main>
  );
}

function authErrorMessage(code: string, mode: AuthFormProps['mode']) {
  if (code === 'API_UNAVAILABLE')
    return 'A API não está disponível. Inicie o backend na porta 3001.';
  if (code === 'EMAIL_ALREADY_REGISTERED')
    return 'Este e-mail já está cadastrado. Tente entrar.';
  if (code === 'INVALID_CREDENTIALS') return 'E-mail ou senha inválidos.';
  if (code === 'INVALID_CREDENTIALS_FORMAT')
    return mode === 'register'
      ? 'Informe um nome, e-mail e senha válida.'
      : 'Informe um e-mail e uma senha válida.';
  return 'Não foi possível concluir. Verifique os dados e tente novamente.';
}
