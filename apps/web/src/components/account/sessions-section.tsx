'use client';

import { useEffect, useState } from 'react';
import { AccountSession, api } from '../../lib/api';

function deviceLabel(userAgent: string | null) {
  if (!userAgent) return 'Dispositivo desconhecido';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Navegador';
  const system = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/.test(userAgent)
        ? 'iOS'
        : /Mac OS/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'sistema desconhecido';
  return `${browser} em ${system}`;
}

export function SessionsSection() {
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const { sessions: result } = await api.accountSessions();
    setSessions(result);
  }

  useEffect(() => {
    load()
      .catch(() => setError('Não foi possível carregar as sessões.'))
      .finally(() => setLoading(false));
  }, []);

  async function revoke(id: string) {
    setBusy(id);
    setError('');
    try {
      await api.revokeAccountSession(id);
      await load();
    } catch {
      setError('Não foi possível encerrar a sessão.');
    } finally {
      setBusy('');
    }
  }

  async function revokeOthers() {
    setBusy('others');
    setError('');
    try {
      await api.revokeOtherSessions();
      await load();
    } catch {
      setError('Não foi possível encerrar as outras sessões.');
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="sessions-title">
      <h2 id="sessions-title">Sessões ativas</h2>
      {loading ? (
        <p className="form-note">Carregando sessões...</p>
      ) : (
        <ul className="plain-list">
          {sessions.map((session) => (
            <li key={session.id}>
              <strong>{deviceLabel(session.userAgent)}</strong>
              {session.current && ' · esta sessão'}
              <small className="table-subtext">
                Desde {new Date(session.createdAt).toLocaleString('pt-BR')}
                {session.ipAddress ? ` · IP ${session.ipAddress}` : ''}
              </small>
              {!session.current && (
                <button
                  className="link-button"
                  type="button"
                  disabled={busy !== ''}
                  onClick={() => revoke(session.id)}
                >
                  Encerrar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {sessions.length > 1 && (
        <button
          className="secondary-button small"
          type="button"
          disabled={busy !== ''}
          onClick={revokeOthers}
        >
          Encerrar todas as outras sessões
        </button>
      )}
    </section>
  );
}
