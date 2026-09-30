import { ArrowLeft, ArrowRight, Recycle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { SessionActions } from '../../../components/session-actions';
import { ListingCard as ListingCardView } from '../../../components/listing-card';
import { ListingCard } from '../../../lib/api';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await fetchJson<{
    category: { id: string; name: string; slug: string };
    listings: ListingCard[];
  }>(`/categories/${slug}`);

  if (!result) notFound();
  const { category, listings } = result;

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="/">
          <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="nav-links">
          <a href="/como-funciona">Como funciona</a>
          <a href="/anuncios">Anúncios</a>
          <a href="/empresas">Para empresas</a>
        </div>
        <div className="nav-actions">
          <SessionActions />
        </div>
      </nav>
      <section className="listing-section shell">
        <a className="back-link" href="/anuncios">
          <ArrowLeft size={15} /> Todas as oportunidades
        </a>
        <div className="section-heading" style={{ marginTop: 20 }}>
          <div>
            <p className="eyebrow">categoria</p>
            <h1>{category.name}</h1>
            <p className="section-lede">
              {listings.length} anúncio(s) publicados nesta categoria.
            </p>
          </div>
          <a className="text-link" href={`/anuncios?categoryId=${category.id}`}>
            Ver com filtros <ArrowRight size={15} />
          </a>
        </div>
        {listings.length === 0 ? (
          <div className="empty-panel listing-empty">
            <h2>Nenhum anúncio publicado.</h2>
            <p>Explore outras categorias ou volte mais tarde.</p>
          </div>
        ) : (
          <div className="listing-grid">
            {listings.map((listing) => (
              <ListingCardView
                key={listing.id}
                listing={listing}
                showFavorite={false}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
