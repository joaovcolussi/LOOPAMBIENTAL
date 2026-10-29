'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, MailCheck, Recycle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, AuthUser } from '../lib/api';
import { SessionActions } from './session-actions';

type AuthFormProps = { mode: 'login' | 'register' };
const mailpitUrl =
  process.env.NEXT_PUBLIC_MAILPIT_URL ?? 'http://localhost:8025';
type Step = 'form' | 'verify-sent' | 'mfa';

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [challengeToken, setChallengeToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  function finish(user: AuthUser) {
    const requestedNext = new URLSearchParams(window.location.search).get(
      'next',
    );
    // Only allow same-site relative paths to avoid open redirects.
    const next =
      requestedNext &&
      requestedNext.startsWith('/') &&
      !requestedNext.startsWith('//')
        ? requestedNext
        : null;
    router.push(
      next ||
        (mode === 'login' &&
        (user.platformRole === 'ADMIN' || user.platformRole === 'MODERATOR')
          ? '/admin'
          : '/dashboard'),
    );
    router.refresh();
  }

  function fail(caught: unknown) {
    const code = caught instanceof Error ? caught.message : 'REQUEST_FAILED';
    setErrorCode(code);
    setError(authErrorMessage(code, mode));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setErrorCode('');
    setNotice('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const result = await api.register({
          name,
          email,
          password,
          acceptTerms,
        });
        if (result.verificationRequired) setStep('verify-sent');
        else finish(result.user);
        return;
      }
      const result = await api.login({ email, password });
      if (result.mfaRequired) {
        setChallengeToken(result.challengeToken);
        setStep('mfa');
        return;
      }
      finish(result.user);
    } catch (caught) {
      fail(caught);
    } finally {
      setLoading(false);
    }
  }

  async function submitMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.verifyMfa(challengeToken, mfaCode);
      finish(result.user);
    } catch (caught) {
      fail(caught);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setLoading(true);
    setError('');
    try {
      await api.resendVerification(email);
      setNotice(
        'Se o e-mail estiver pendente de verificação, enviamos um novo link.',
      );
    } catch (caught) {
      fail(caught);
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
        {step === 'verify-sent' ? (
          <div className="success-panel" role="status">
            <MailCheck size={26} aria-hidden="true" />
            <h1 id="auth-title">Confirme seu e-mail.</h1>
            <p>
              Enviamos um link de verificação para <strong>{email}</strong>.
              Depois de confirmar, entre com sua senha.
            </p>
            <p className="form-hint">
              No ambiente de demonstração os e-mails chegam ao Mailpit em{' '}
              <a className="text-link" href={mailpitUrl}>
                {mailpitUrl.replace(/^https?:\/\//, '')}
              </a>
              .
            </p>
            {notice && <p className="form-note">{notice}</p>}
            <div className="hero-actions">
              <a className="button" href="/entrar">
                Ir para o login
              </a>
              <button
                className="secondary-button"
                type="button"
                disabled={loading}
                onClick={resend}
              >
                Reenviar e-mail
              </button>
            </div>
          </div>
        ) : step === 'mfa' ? (
          <>
            <p className="eyebrow">verificação em duas etapas</p>
            <h1 id="auth-title">Digite o código do autenticador.</h1>
            <p className="auth-subtitle">
              Use o código de 6 dígitos do seu aplicativo ou um código de
              recuperação.
            </p>
            <form onSubmit={submitMfa}>
              <label>
                Código de verificação
                <input
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={32}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  aria-describedby={error ? 'auth-error' : undefined}
                />
              </label>
              {error && (
                <p className="form-error" role="alert" id="auth-error">
                  {error}
                </p>
              )}
              <button className="button auth-submit" disabled={loading}>
                <ShieldCheck size={16} aria-hidden="true" />
                {loading ? 'Verificando...' : 'Confirmar e entrar'}
              </button>
            </form>
          </>
        ) : (
          <>
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
              {mode === 'register' && (
                <label className="form-check">
                  <input
                    type="checkbox"
                    required
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                  />
                  <span>
                    Li e aceito os{' '}
                    <a className="text-link" href="/termos" target="_blank">
                      termos de uso
                    </a>{' '}
                    e a{' '}
                    <a
                      className="text-link"
                      href="/privacidade"
                      target="_blank"
                    >
                      política de privacidade
                    </a>
                    .
                  </span>
                </label>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p className="form-note" role="status">
                  {notice}
                </p>
              )}
              {errorCode === 'EMAIL_NOT_VERIFIED' && (
                <button
                  className="link-button"
                  type="button"
                  disabled={loading}
                  onClick={resend}
                >
                  Reenviar e-mail de verificação
                </button>
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
          </>
        )}
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
  if (code === 'EMAIL_NOT_VERIFIED')
    return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (code === 'TERMS_NOT_ACCEPTED')
    return 'É preciso aceitar os termos de uso e a política de privacidade.';
  if (code === 'INVALID_MFA_CODE') return 'Código de verificação inválido.';
  if (code === 'INVALID_MFA_CHALLENGE')
    return 'A verificação expirou. Volte e entre novamente.';
  if (code === 'INVALID_CREDENTIALS_FORMAT')
    return mode === 'register'
      ? 'Informe um nome, e-mail e senha válida.'
      : 'Informe um e-mail e uma senha válida.';
  return 'Não foi possível concluir. Verifique os dados e tente novamente.';
}
