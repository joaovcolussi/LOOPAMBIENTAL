'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Recycle, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { api, InvitationInfo, isAuthenticationError } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

const roleLabels: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!params.token) return;
    api
      .invitation(params.token)
      .then(({ invitation: result }) => setInvitation(result))
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace(`/entrar?next=/convite/${params.token}`);
        else setError('Convite não encontrado ou expirado.');
      })
      .finally(() => setLoading(false));
  }, [params.token, router]);

  async function accept() {
    if (!params.token) return;
    setAccepting(true);
    setError('');
    try {
      await api.acceptInvitation(params.token);
      setDone(true);
    } catch {
      setError('Não foi possível aceitar o convite com esta conta.');
    } finally {
      setAccepting(false);
    }
  }

  if (loading)
    return (
      <main className="auth-page">
        <div className="dashboard-loading">Carregando convite...</div>
      </main>
    );

  return (
    <main className="auth-page">
      <a className="brand auth-brand" href="/">
        <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
      </a>
      <div className="auth-session-actions">
        <SessionActions mode="auth" />
      </div>
      <section className="auth-card" aria-labelledby="invite-title">
        <p className="eyebrow">convite de equipe</p>
        <h1 id="invite-title">
          {done ? 'Convite aceito.' : 'Convite para empresa.'}
        </h1>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {done ? (
          <>
            <p className="auth-subtitle">
              Você agora participa desta empresa. Acesse o painel para começar.
            </p>
            <a className="button auth-submit" href="/dashboard">
              Ir para o painel <ArrowRight size={16} />
            </a>
          </>
        ) : invitation ? (
          <>
            <p className="auth-subtitle">
              <Users size={15} /> Você foi convidado para participar de{' '}
              <strong>{invitation.company.name}</strong> como{' '}
              <strong>{roleLabels[invitation.role] ?? invitation.role}</strong>.
            </p>
            {invitation.status !== 'PENDING' || invitation.expired ? (
              <p className="form-note">
                Este convite não está mais disponível ({invitation.status}
                {invitation.expired ? ', expirado' : ''}).
              </p>
            ) : invitation.emailMatches ? (
              <button
                className="button auth-submit"
                type="button"
                disabled={accepting}
                onClick={accept}
              >
                {accepting ? 'Aceitando...' : 'Aceitar convite'}
              </button>
            ) : (
              <p className="form-note">
                Este convite é para <strong>{invitation.emailMasked}</strong>.
                Entre com a conta desse e-mail para aceitar.
              </p>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
