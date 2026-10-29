'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, AuthUser, ListingCard } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';
import { ListingCard as ListingCardView } from '../../../components/listing-card';
import { listingStatusLabels } from '../../../lib/labels';

export default function ListingsDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createdMessage, setCreatedMessage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

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
      .then(({ listings: result, pagination }) => {
        if (!active) return;
        setListings(result);
        setNextCursor(pagination.nextCursor);
      })
      .catch(() => router.replace('/entrar'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const { listings: result, pagination } = await api.myListings(nextCursor);
      setListings((current) => [...current, ...result]);
      setNextCursor(pagination.nextCursor);
    } catch {
      setError('Não foi possível carregar mais anúncios.');
    } finally {
      setLoadingMore(false);
    }
  }

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
                  {listingStatusLabels[listing.status] ?? listing.status}
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
        {nextCursor && (
          <button
            className="secondary-button admin-load-more"
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? 'Carregando...' : 'Carregar mais anúncios'}
          </button>
        )}
      </section>
    </main>
  );
}
