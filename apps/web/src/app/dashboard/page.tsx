'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Bookmark,
  Building2,
  Heart,
  MessageCircle,
  Package,
  Plus,
  Recycle,
  Search,
  Star,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  api,
  AuthUser,
  Company,
  Conversation,
  Favorite,
  isAuthenticationError,
  ListingCard,
  Notification,
  Proposal,
} from '../../lib/api';
import { SessionActions } from '../../components/session-actions';
import { formatMoney, formatQuantity } from '../../lib/format';

const listingStatusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_REVIEW: 'Em análise',
  PUBLISHED: 'Publicado',
  PAUSED: 'Pausado',
  NEGOTIATING: 'Em negociação',
  CLOSED: 'Encerrado',
  EXPIRED: 'Expirado',
  REJECTED: 'Rejeitado',
  ARCHIVED: 'Arquivado',
};

const proposalStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  COUNTERED: 'Contraproposta',
  ACCEPTED: 'Aceita',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

const verificationLabels: Record<string, string> = {
  VERIFIED: 'Empresa verificada',
  PENDING: 'Verificação em análise',
  UNVERIFIED: 'Verificação pendente',
  REJECTED: 'Verificação rejeitada',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partialError, setPartialError] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then(async ({ user: result }) => {
        if (!active) return;
        setUser(result);
        let failures = 0;
        const safe = <T,>(promise: Promise<T>, fallback: T) =>
          promise.catch(() => {
            failures += 1;
            return fallback;
          });
        const [
          companyResult,
          listingResult,
          proposalResult,
          notificationResult,
          favoriteResult,
          conversationResult,
        ] = await Promise.all([
          safe(api.companies(), { companies: [] as Company[] }),
          safe(api.myListings(), { listings: [] as ListingCard[] }),
          safe(api.proposals(), { proposals: [] as Proposal[] }),
          safe(api.notifications(), {
            notifications: [] as Notification[],
          }),
          safe(api.favorites(), { favorites: [] as Favorite[] }),
          safe(api.conversations(), {
            conversations: [] as Conversation[],
          }),
        ]);
        if (!active) return;
        if (failures > 0) setPartialError(true);
        setCompanies(companyResult.companies);
        setListings(listingResult.listings);
        setProposals(proposalResult.proposals);
        setNotifications(notificationResult.notifications);
        setFavorites(favoriteResult.favorites);
        setConversations(conversationResult.conversations);
      })
      .catch((caught) => {
        if (isAuthenticationError(caught)) {
          router.replace('/entrar?next=/dashboard');
          return;
        }
        setError('Não foi possível carregar seu painel. Tente novamente.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando seu painel...</div>
      </main>
    );

  if (!user)
    return (
      <main className="dashboard-page">
        <div className="detail-error shell">
          <h1>Não foi possível carregar seu painel.</h1>
          <button
            className="button"
            type="button"
            onClick={() => router.refresh()}
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );

  const companyIds = new Set(companies.map((company) => company.id));
  const primaryCompany = companies[0] ?? null;
  const publishedListings = listings.filter(
    (listing) => listing.status === 'PUBLISHED',
  );
  const pendingListings = listings.filter((listing) =>
    ['DRAFT', 'PENDING_REVIEW', 'REJECTED'].includes(listing.status),
  );
  const receivedProposals = proposals.filter((proposal) =>
    companyIds.has(proposal.listing.companyId),
  );
  const openProposals = receivedProposals.filter((proposal) =>
    ['PENDING', 'COUNTERED'].includes(proposal.status),
  );
  const unreadNotifications = notifications.filter(
    (notification) => !notification.readAt,
  );
  const unreadMessages = conversations.reduce(
    (total, conversation) => total + (conversation.unreadCount ?? 0),
    0,
  );

  const recentListings = [...listings]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);
  const recentProposals = [...proposals]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const kpis = [
    {
      href: '/dashboard/anuncios',
      icon: <Package size={18} />,
      label: 'Anúncios publicados',
      value: publishedListings.length,
      note:
        pendingListings.length > 0
          ? `${pendingListings.length} aguardando publicação`
          : 'Todos ativos',
    },
    {
      href: '/dashboard/propostas',
      icon: <ArrowRight size={18} />,
      label: 'Propostas em aberto',
      value: openProposals.length,
      note: `${receivedProposals.length} recebidas no total`,
    },
    {
      href: '/dashboard/mensagens',
      icon: <MessageCircle size={18} />,
      label: 'Mensagens não lidas',
      value: unreadMessages,
      note: `${conversations.length} conversas ativas`,
    },
    {
      href: '/dashboard/notificacoes',
      icon: <Bell size={18} />,
      label: 'Notificações novas',
      value: unreadNotifications.length,
      note:
        favorites.length > 0
          ? `${favorites.length} anúncios favoritos`
          : 'Tudo em dia',
    },
  ];

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/anuncios">
            <Search size={15} /> Explorar anúncios
          </a>
          {user.platformRole === 'ADMIN' && (
            <a className="back-link" href="/admin">
              Administração
            </a>
          )}
          <SessionActions mode="dashboard" />
        </div>
      </nav>

      <section className="dashboard-content shell dashboard-hub">
        <header className="dashboard-hero">
          <div>
            <p className="eyebrow">painel da empresa</p>
            <h1>Olá, {user.name.split(' ')[0]}.</h1>
            <p className="dashboard-lede">
              Acompanhe anúncios, propostas e conversas da sua operação em um só
              lugar.
            </p>
          </div>
          <a className="button" href="/dashboard/anuncios/novo">
            <Plus size={16} /> Criar anúncio
          </a>
        </header>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {partialError && (
          <p className="form-note" role="status">
            Alguns dados do painel não puderam ser carregados agora.{' '}
            <button
              className="text-link"
              type="button"
              onClick={() => router.refresh()}
            >
              Recarregar
            </button>
          </p>
        )}

        {!primaryCompany ? (
          <div className="dashboard-onboarding">
            <span className="dashboard-onboarding-icon">
              <Building2 size={22} />
            </span>
            <div>
              <h2>Comece cadastrando sua empresa</h2>
              <p>
                Para publicar anúncios e negociar você precisa de uma empresa
                vinculada à sua conta.
              </p>
            </div>
            <a className="button small" href="/dashboard/empresa">
              Configurar empresa <ArrowRight size={15} />
            </a>
          </div>
        ) : (
          <div className="dashboard-company">
            <div>
              <span className="dashboard-company-label">Empresa ativa</span>
              <strong>
                {primaryCompany.tradeName || primaryCompany.legalName}
              </strong>
              <small>
                {[primaryCompany.city, primaryCompany.state]
                  .filter(Boolean)
                  .join(', ') || 'Localização não informada'}
              </small>
            </div>
            <span
              className={`dashboard-verification ${
                primaryCompany.verification === 'VERIFIED' ? 'ok' : ''
              }`}
            >
              {primaryCompany.verification === 'VERIFIED' && (
                <BadgeCheck size={15} />
              )}
              {verificationLabels[primaryCompany.verification] ??
                primaryCompany.verification}
            </span>
            <a className="text-link" href="/dashboard/empresa">
              Gerenciar <ArrowRight size={14} />
            </a>
          </div>
        )}

        <div className="dashboard-kpis">
          {kpis.map((kpi) => (
            <a className="dashboard-kpi" href={kpi.href} key={kpi.label}>
              <span className="dashboard-kpi-icon">{kpi.icon}</span>
              <small>{kpi.label}</small>
              <strong>{kpi.value}</strong>
              <em>{kpi.note}</em>
            </a>
          ))}
        </div>

        {listings.length === 0 && proposals.length === 0 && !primaryCompany ? (
          <div className="dashboard-grid dashboard-steps">
            <article>
              <span className="dashboard-number">01</span>
              <h2>Cadastre sua empresa</h2>
              <p>Adicione os dados e a localização da sua operação.</p>
              <a href="/dashboard/empresa">
                Configurar empresa <ArrowRight size={15} />
              </a>
            </article>
            <article>
              <span className="dashboard-number">02</span>
              <h2>Publique um anúncio</h2>
              <p>Encontre compradores ou fornecedores para seus materiais.</p>
              <a href="/dashboard/anuncios/novo">
                Criar anúncio <ArrowRight size={15} />
              </a>
            </article>
            <article>
              <span className="dashboard-number">03</span>
              <h2>Negocie propostas</h2>
              <p>Receba e envie propostas com histórico e conversa.</p>
              <a href="/dashboard/propostas">
                Ver propostas <ArrowRight size={15} />
              </a>
            </article>
            <article>
              <span className="dashboard-number">04</span>
              <h2>Explore o mercado</h2>
              <p>Acompanhe oportunidades e salve seus favoritos.</p>
              <a href="/anuncios">
                Explorar anúncios <ArrowRight size={15} />
              </a>
            </article>
          </div>
        ) : (
          <div className="dashboard-columns">
            <section className="dashboard-panel">
              <div className="dashboard-panel-head">
                <h2>Seus anúncios recentes</h2>
                <a className="text-link" href="/dashboard/anuncios">
                  Ver todos <ArrowRight size={14} />
                </a>
              </div>
              {recentListings.length === 0 ? (
                <p className="dashboard-empty">
                  Você ainda não publicou anúncios.{' '}
                  <a href="/dashboard/anuncios/novo">Criar o primeiro</a>.
                </p>
              ) : (
                <div className="dashboard-list">
                  {recentListings.map((listing) => (
                    <a
                      className="dashboard-list-item"
                      href={`/dashboard/anuncios/${listing.id}`}
                      key={listing.id}
                    >
                      <span className="dashboard-list-main">
                        <strong>{listing.title}</strong>
                        <small>
                          {formatQuantity(listing.availableQuantity)}{' '}
                          {listing.unit} ·{' '}
                          {listing.unitPrice
                            ? formatMoney(listing.unitPrice, listing.currency)
                            : 'A combinar'}
                        </small>
                      </span>
                      <span
                        className={`admin-user-status ${listing.status.toLowerCase()}`}
                      >
                        {listingStatusLabels[listing.status] ?? listing.status}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-panel-head">
                <h2>Propostas recentes</h2>
                <a className="text-link" href="/dashboard/propostas">
                  Ver todas <ArrowRight size={14} />
                </a>
              </div>
              {recentProposals.length === 0 ? (
                <p className="dashboard-empty">
                  Nenhuma proposta por aqui ainda. Elas aparecem assim que você
                  enviar ou receber uma negociação.
                </p>
              ) : (
                <div className="dashboard-list">
                  {recentProposals.map((proposal) => {
                    const received = companyIds.has(proposal.listing.companyId);
                    return (
                      <a
                        className="dashboard-list-item"
                        href={`/dashboard/propostas/${proposal.id}`}
                        key={proposal.id}
                      >
                        <span className="dashboard-list-main">
                          <strong>{proposal.listing.title}</strong>
                          <small>
                            {received ? 'Recebida de' : 'Enviada para'}{' '}
                            {received
                              ? proposal.proposerCompany.tradeName ||
                                proposal.proposerCompany.legalName
                              : proposal.listing.company.tradeName ||
                                proposal.listing.company.legalName}{' '}
                            ·{' '}
                            {formatMoney(
                              Number(proposal.quantity) *
                                Number(proposal.unitPrice),
                              proposal.currency,
                            )}
                          </small>
                        </span>
                        <span
                          className={`admin-user-status ${proposal.status.toLowerCase()}`}
                        >
                          {proposalStatusLabels[proposal.status] ??
                            proposal.status}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        <nav className="dashboard-shortcuts" aria-label="Atalhos do painel">
          <a href="/dashboard/favoritos">
            <Heart size={17} /> Favoritos
          </a>
          <a href="/dashboard/buscas-salvas">
            <Bookmark size={17} /> Buscas salvas
          </a>
          <a href="/dashboard/notificacoes">
            <Bell size={17} /> Notificações
          </a>
          <a href="/dashboard/mensagens">
            <MessageCircle size={17} /> Mensagens
          </a>
          <a href="/dashboard/pagamentos">
            <ArrowRight size={17} /> Pagamentos
          </a>
          <a href="/dashboard/logistica">
            <ArrowRight size={17} /> Logística
          </a>
          <a href="/dashboard/empresa">
            <Building2 size={17} /> Empresa
          </a>
          <a href="/dashboard/assinatura">
            <ArrowRight size={17} /> Assinatura
          </a>
          <a href="/dashboard/avaliacoes">
            <Star size={17} /> Avaliações
          </a>
        </nav>
      </section>
    </main>
  );
}
