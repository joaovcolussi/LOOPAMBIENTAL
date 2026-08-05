'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Heart, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, Favorite } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .favorites()
      .then(({ favorites: result }) => setFavorites(result))
      .catch(() => router.replace('/entrar'))
      .finally(() => setLoading(false));
  }, [router]);
  async function remove(id: string) {
    await api.removeFavorite(id);
    setFavorites((current) => current.filter((item) => item.listing.id !== id));
  }
  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando favoritos...</div>
      </main>
    );
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
        <p className="eyebrow">seu radar</p>
        <h1>Favoritos</h1>
        <p className="dashboard-lede">
          Anúncios que você quer acompanhar de perto.
        </p>
        {favorites.length === 0 ? (
          <div className="empty-panel favorite-empty">
            <Heart size={22} />
            <p>Você ainda não salvou nenhum anúncio.</p>
            <a className="text-link" href="/anuncios">
              Explorar anúncios <ArrowRight size={15} />
            </a>
          </div>
        ) : (
          <div className="favorite-grid">
            {favorites.map((item) => (
              <article className="favorite-card" key={item.listing.id}>
                <div>
                  <span className="dashboard-number">
                    {item.listing.type === 'BUY' ? 'Compra' : 'Venda'}
                  </span>
                  <h2>
                    <a href={`/anuncios/${item.listing.slug}`}>
                      {item.listing.title}
                    </a>
                  </h2>
                  <p>
                    {item.listing.company.tradeName ||
                      item.listing.company.legalName}{' '}
                    · {item.listing.category.name}
                  </p>
                  <small>
                    {item.listing.quantity} {item.listing.unit}{' '}
                    {item.listing.city
                      ? `· ${item.listing.city}, ${item.listing.state}`
                      : ''}
                  </small>
                  <a
                    className="text-link favorite-card-link"
                    href={`/anuncios/${item.listing.slug}`}
                  >
                    Ver anúncio <ArrowRight size={15} />
                  </a>
                </div>
                <button
                  aria-label={`Remover ${item.listing.title} dos favoritos`}
                  onClick={() => remove(item.listing.id)}
                >
                  <Heart size={17} fill="currentColor" />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
