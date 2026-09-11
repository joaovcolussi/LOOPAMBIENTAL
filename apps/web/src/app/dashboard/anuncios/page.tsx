'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, AuthUser, ListingCard } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';
import { ListingCard as ListingCardView } from '../../../components/listing-card';

const statusLabels: Record<string, string> = {
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

export default function ListingsDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createdMessage, setCreatedMessage] = useState(false);

  useEffect(() => {
    setCreatedMessage(
      new URLSearchParams(window.location.search).get('created') === 'review',
    );
    let active = true;
    api
      .me()
      .then((result) => {
        setUser(result.user);
        return api.myListings();
      })
      .then(({ listings: result }) => {
        if (active) setListings(result);
      })
      .catch(() => router.replace('/entrar'))
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
        <div className="dashboard-loading">Carregando anúncios...</div>
      </main>
    );
  if (!user) return null;

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/dashboard">
            Voltar ao painel
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell">
        <p className="eyebrow">seus anúncios</p>
        <h1>Anúncios</h1>
        <p className="dashboard-lede">
          Gerencie seus materiais publicados e rascunhos.
        </p>
        <a className="button" href="/dashboard/anuncios/novo">
          Criar anúncio <ArrowRight size={15} />
        </a>
        {createdMessage && (
          <p className="success-panel" role="status">
            Anúncio enviado para análise. Ele já aparece abaixo para sua empresa
            e ficará público após a aprovação.
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        {listings.length === 0 ? (
          <div className="empty-panel" style={{ marginTop: 24 }}>
            <h2>Nenhum anúncio ainda.</h2>
            <p>Crie seu primeiro anúncio para começar a negociar.</p>
          </div>
        ) : (
          <div className="listing-grid dashboard-listing-grid">
            {listings.map((listing) => (
              <div className="dashboard-listing-card" key={listing.id}>
                <span
                  className={`admin-user-status ${listing.status.toLowerCase()}`}
                >
                  {statusLabels[listing.status] ?? listing.status}
                </span>
                <ListingCardView
                  listing={listing}
                  showFavorite={false}
                  ownerView
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
