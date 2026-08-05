'use client';

import { LogOut, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type SessionActionsProps = { mode?: 'public' | 'dashboard' | 'auth' };

export function SessionActions({ mode = 'public' }: SessionActionsProps) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await api.logout();
    } finally {
      router.replace('/');
      router.refresh();
    }
  }

  if (loading)
    return <span className="session-actions-loading" aria-hidden="true" />;

  if (mode === 'auth' && !authenticated) return null;

  if (mode === 'dashboard' && authenticated)
    return (
      <button
        className="logout-button"
        disabled={loggingOut}
        onClick={logout}
        type="button"
      >
        <LogOut size={16} /> {loggingOut ? 'Encerrando...' : 'Encerrar sessão'}
      </button>
    );

  if (mode === 'dashboard')
    return (
      <a className="login" href="/entrar">
        Entrar
      </a>
    );

  if (authenticated)
    return (
      <>
        <a className="login" href="/dashboard">
          Meu painel
        </a>
        <button
          className="logout-button public-logout-button"
          disabled={loggingOut}
          onClick={logout}
          type="button"
        >
          <LogOut size={15} />
          {loggingOut ? 'Encerrando...' : 'Encerrar sessão'}
        </button>
      </>
    );

  return (
    <>
      <a className="login" href="/entrar">
        Entrar
      </a>
      <a className="button small" href="/cadastro">
        Criar conta <ArrowRight size={16} />
      </a>
    </>
  );
}
