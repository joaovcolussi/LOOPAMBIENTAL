'use client';

import {
  BarChart3,
  Building2,
  DollarSign,
  FileCheck2,
  Mail,
  Recycle,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminStats, AdminUser, api } from '../../lib/api';
import { SessionActions } from '../../components/session-actions';

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [userError, setUserError] = useState('');
  const [savingUserId, setSavingUserId] = useState('');

  useEffect(() => {
    Promise.all([api.adminStats(), api.adminUsers()])
      .then(([nextStats, nextUsers]) => {
        setStats(nextStats);
        setUsers(nextUsers);
      })
      .catch(() =>
        setError(
          'Acesso restrito ou não foi possível carregar os indicadores.',
        ),
      );
  }, []);

  async function changeRole(
    user: AdminUser,
    platformRole: AdminUser['platformRole'],
  ) {
    if (user.platformRole === platformRole) return;
    const roleLabel =
      platformRole === 'ADMIN'
        ? 'administrador'
        : platformRole === 'MODERATOR'
          ? 'moderador'
          : 'usuário';
    if (!window.confirm(`Conceder acesso de ${roleLabel} para ${user.email}?`))
      return;
    setUserError('');
    setSavingUserId(user.id);
    try {
      const updatedUser = await api.updateAdminUserRole(user.id, platformRole);
      setUsers((current) =>
        current.map((item) =>
          item.id === updatedUser.id ? updatedUser : item,
        ),
      );
    } catch {
      setUserError('Não foi possível atualizar o acesso deste usuário.');
    } finally {
      setSavingUserId('');
    }
  }

  if (!stats && !error)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando indicadores...</div>
      </main>
    );

  if (error || !stats)
    return (
      <main className="dashboard-page">
        <div className="detail-error shell">
          <p className="eyebrow">administração</p>
          <h1>{error}</h1>
          <a className="button" href="/dashboard">
            Voltar ao painel
          </a>
        </div>
      </main>
    );

  const maxDemand = Math.max(
    ...stats.demandByCategory.map((item) => item.proposals),
    1,
  );
  const kpis = [
    {
      label: 'Valor transacionado',
      value: money(stats.kpis.grossTransactionValue),
      icon: DollarSign,
    },
    {
      label: 'Comissão estimada',
      value: `${money(stats.kpis.estimatedCommissionMin)} – ${money(stats.kpis.estimatedCommissionMax)}`,
      icon: BarChart3,
    },
    {
      label: 'Pipeline comercial',
      value: money(stats.kpis.pipelineValue),
      icon: TrendingUp,
    },
    {
      label: 'Oportunidades publicadas',
      value: stats.kpis.publishedListings,
      icon: Recycle,
    },
    {
      label: 'Empresas cadastradas',
      value: stats.kpis.companies,
      icon: Building2,
    },
    { label: 'Usuários', value: stats.kpis.users, icon: Users },
    {
      label: 'Casos para moderar',
      value: stats.kpis.openModeration,
      icon: ShieldCheck,
    },
    {
      label: 'Conversão de propostas',
      value: `${stats.kpis.conversionRate.toFixed(1)}%`,
      icon: FileCheck2,
    },
  ];

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="nav-actions">
          <a className="back-link" href="/admin/moderacao">
            Moderação
          </a>
          <a className="back-link" href="/dashboard">
            Voltar ao painel
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="admin-dashboard shell">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">visão da plataforma</p>
            <h1>Painel de gestão.</h1>
            <p className="dashboard-lede">
              Acompanhe o movimento comercial, a demanda e o potencial de
              receita da LOOP AMBIENTAL.
            </p>
          </div>
          <span className="admin-updated">
            Atualizado em {new Date(stats.generatedAt).toLocaleString('pt-BR')}
          </span>
        </div>
        <div className="admin-kpis">
          {kpis.map(({ label, value, icon: Icon }) => (
            <article className="admin-kpi" key={label}>
              <span>
                <Icon size={18} />
              </span>
              <small>{label}</small>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
        <div className="admin-charts">
          <section className="admin-panel admin-demand">
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">intenção de compra</p>
                <h2>Demanda por categoria</h2>
              </div>
              <BarChart3 size={20} />
            </div>
            {stats.demandByCategory.length === 0 ? (
              <div className="empty-panel">Ainda não há dados de demanda.</div>
            ) : (
              <div className="admin-bars">
                {stats.demandByCategory.map((item) => (
                  <div className="admin-bar-row" key={item.category}>
                    <div>
                      <strong>{item.category}</strong>
                      <span>
                        {item.proposals} propostas · {item.listings} anúncios
                      </span>
                    </div>
                    <div className="admin-bar-track">
                      <i
                        style={{
                          width: `${Math.max((item.proposals / maxDemand) * 100, 5)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">mix comercial</p>
                <h2>Compra x venda</h2>
              </div>
              <Recycle size={20} />
            </div>
            <div className="admin-split">
              <div>
                <strong>
                  {stats.listingsByType.find((item) => item.type === 'BUY')
                    ?.total ?? 0}
                </strong>
                <span>compras</span>
              </div>
              <div>
                <strong>
                  {stats.listingsByType.find((item) => item.type === 'SELL')
                    ?.total ?? 0}
                </strong>
                <span>vendas</span>
              </div>
            </div>
            <div className="admin-status-list">
              {stats.proposalsByStatus.map((item) => (
                <div key={item.status}>
                  <span>{item.status}</span>
                  <b>{item.total}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
        <section className="admin-panel admin-overview">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">operação</p>
              <h2>Status das negociações</h2>
            </div>
            <FileCheck2 size={20} />
          </div>
          <div className="admin-status-grid">
            {stats.dealsByStatus.map((item) => (
              <div key={item.status}>
                <span>{item.status}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-panel admin-users-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">acessos da plataforma</p>
              <h2>Usuários e permissões</h2>
            </div>
            <Users size={20} />
          </div>
          <p className="admin-panel-lede">
            Consulte os e-mails cadastrados e conceda acesso de administrador ou
            moderador conforme a responsabilidade de cada pessoa.
          </p>
          {userError && <p className="form-error">{userError}</p>}
          {users.length === 0 ? (
            <div className="empty-panel">Nenhum usuário cadastrado.</div>
          ) : (
            <div className="admin-users-table-wrap">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>E-mail</th>
                    <th>Status</th>
                    <th>Acesso</th>
                    <th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name}</strong>
                        <span className="admin-user-email-mobile">
                          <Mail size={13} /> {user.email}
                        </span>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span
                          className={`admin-user-status ${user.status.toLowerCase()}`}
                        >
                          {user.status === 'ACTIVE' ? 'Ativo' : user.status}
                        </span>
                      </td>
                      <td>
                        <select
                          aria-label={`Permissão de ${user.email}`}
                          value={user.platformRole}
                          disabled={savingUserId === user.id}
                          onChange={(event) =>
                            void changeRole(
                              user,
                              event.target.value as AdminUser['platformRole'],
                            )
                          }
                        >
                          <option value="USER">Usuário</option>
                          <option value="MODERATOR">Moderador</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </td>
                      <td>
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="admin-disclaimer">
          O valor bruto considera propostas aceitas. O pipeline considera
          propostas pendentes, em contraproposta e aceitas. A comissão exibida é
          uma estimativa entre 5% e 15%; pagamentos, repasses e conciliação
          ainda dependem da integração financeira.
        </p>
      </section>
    </main>
  );
}
