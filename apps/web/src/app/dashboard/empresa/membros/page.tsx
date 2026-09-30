'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Mail, Recycle, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  api,
  AuthUser,
  Company,
  CompanyInvitation,
  CompanyMember,
  isAuthenticationError,
} from '../../../../lib/api';
import { SessionActions } from '../../../../components/session-actions';
import { ConfirmDialog } from '../../../../components/confirm-dialog';
import { memberRoleLabels } from '../../../../lib/labels';

type PendingAction =
  | { type: 'member'; id: string; name: string }
  | { type: 'invitation'; id: string; name: string };

export default function CompanyMembersPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [actionPending, setActionPending] = useState(false);

  async function refresh(id: string, canManage: boolean) {
    const memberResult = await api.companyMembers(id);
    setMembers(memberResult.members);
    if (canManage) {
      try {
        const invitationResult = await api.companyInvitations(id);
        setInvitations(invitationResult.invitations);
      } catch {
        setInvitations([]);
      }
    } else {
      setInvitations([]);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([api.me(), api.companies()])
      .then(async ([meResult, companyResult]) => {
        if (!active) return;
        setUser(meResult.user);
        setCompanies(companyResult.companies);
        const first = companyResult.companies[0]?.id ?? '';
        setCompanyId(first);
        if (first) {
          const membership = await api.companyMembers(first);
          const mine = membership.members.find(
            (member) => member.userId === meResult.user.id,
          );
          await refresh(
            first,
            mine?.role === 'OWNER' || mine?.role === 'ADMIN',
          );
        }
      })
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/empresa/membros');
        else setError('Não foi possível carregar os membros da empresa.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const myMembership = members.find((member) => member.userId === user?.id);
  const canManage =
    myMembership?.role === 'OWNER' || myMembership?.role === 'ADMIN';
  const isOwner = myMembership?.role === 'OWNER';

  async function selectCompany(id: string) {
    setCompanyId(id);
    setError('');
    setMessage('');
    try {
      const membership = await api.companyMembers(id);
      setMembers(membership.members);
      const mine = membership.members.find(
        (member) => member.userId === user?.id,
      );
      await refresh(id, mine?.role === 'OWNER' || mine?.role === 'ADMIN');
    } catch {
      setError('Não foi possível carregar os membros desta empresa.');
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !email.trim()) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.inviteCompanyMember(companyId, { email, role });
      setEmail('');
      await refresh(companyId, true);
      setMessage('Convite enviado. O usuário receberá um e-mail.');
    } catch {
      setError(
        'Não foi possível convidar. Verifique se o e-mail é válido e se a pessoa já não é membro.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    setActionPending(true);
    setError('');
    try {
      if (pendingAction.type === 'member')
        await api.removeCompanyMember(companyId, pendingAction.id);
      else await api.revokeCompanyInvitation(companyId, pendingAction.id);
      await refresh(companyId, true);
      setPendingAction(null);
    } catch {
      setError(
        pendingAction.type === 'member'
          ? 'Não foi possível remover este membro.'
          : 'Não foi possível cancelar o convite.',
      );
    } finally {
      setActionPending(false);
    }
  }

  async function changeRole(userId: string, nextRole: 'ADMIN' | 'MEMBER') {
    try {
      await api.changeCompanyMemberRole(companyId, userId, nextRole);
      await refresh(companyId, true);
    } catch {
      setError('Não foi possível alterar o papel deste membro.');
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando membros...</div>
      </main>
    );

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/dashboard/empresa">
            <ArrowLeft size={15} /> Voltar à empresa
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell">
        <p className="eyebrow">equipe</p>
        <h1>Membros da empresa</h1>
        <p className="dashboard-lede">
          Convide pessoas para operar a empresa na plataforma e defina o papel
          de cada uma.
        </p>

        {companies.length > 1 && (
          <label className="document-company-select">
            Empresa
            <select
              value={companyId}
              onChange={(event) => selectCompany(event.target.value)}
            >
              {companies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.tradeName || item.legalName}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="form-note" role="status">
            {message}
          </p>
        )}

        {canManage && (
          <form className="proposal-form" onSubmit={invite}>
            <div className="form-row">
              <label>
                E-mail do convidado
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="pessoa@empresa.com"
                />
              </label>
              <label>
                Papel
                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as 'ADMIN' | 'MEMBER')
                  }
                >
                  <option value="MEMBER">Membro</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
            </div>
            <button className="button" type="submit" disabled={saving}>
              <UserPlus size={16} /> {saving ? 'Enviando...' : 'Convidar'}
            </button>
          </form>
        )}

        <div className="member-list">
          {members.map((member) => (
            <article className="member-card" key={member.userId}>
              <div className="member-info">
                <strong>{member.user.name}</strong>
                <small>{member.user.email}</small>
              </div>
              {isOwner && member.role !== 'OWNER' ? (
                <select
                  value={member.role}
                  onChange={(event) =>
                    changeRole(
                      member.userId,
                      event.target.value as 'ADMIN' | 'MEMBER',
                    )
                  }
                  aria-label={`Papel de ${member.user.name}`}
                >
                  <option value="MEMBER">Membro</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              ) : (
                <span
                  className={`admin-user-status ${member.role.toLowerCase()}`}
                >
                  {memberRoleLabels[member.role] ?? member.role}
                </span>
              )}
              {canManage &&
                member.role !== 'OWNER' &&
                member.userId !== user?.id &&
                (isOwner || member.role === 'MEMBER') && (
                  <button
                    className="link-button"
                    type="button"
                    aria-label={`Remover ${member.user.name}`}
                    onClick={() =>
                      setPendingAction({
                        type: 'member',
                        id: member.userId,
                        name: member.user.name,
                      })
                    }
                  >
                    <X size={15} />
                  </button>
                )}
            </article>
          ))}
        </div>

        {canManage && invitations.length > 0 && (
          <div className="document-history">
            <h2>Convites pendentes</h2>
            {invitations.map((invitation) => (
              <div className="member-card" key={invitation.id}>
                <span className="member-info">
                  <strong>
                    <Mail size={14} /> {invitation.email}
                  </strong>
                  <small>
                    {memberRoleLabels[invitation.role]} · expira em{' '}
                    {new Date(invitation.expiresAt).toLocaleDateString('pt-BR')}
                  </small>
                </span>
                <button
                  className="link-button"
                  type="button"
                  onClick={() =>
                    setPendingAction({
                      type: 'invitation',
                      id: invitation.id,
                      name: invitation.email,
                    })
                  }
                >
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction?.type === 'member'
            ? 'Remover membro'
            : 'Cancelar convite'
        }
        description={
          pendingAction?.type === 'member'
            ? `${pendingAction.name} perderá o acesso à empresa.`
            : `O convite para ${pendingAction?.name} deixará de funcionar.`
        }
        confirmLabel={
          pendingAction?.type === 'member'
            ? 'Remover membro'
            : 'Cancelar convite'
        }
        tone="danger"
        pending={actionPending}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </main>
  );
}
