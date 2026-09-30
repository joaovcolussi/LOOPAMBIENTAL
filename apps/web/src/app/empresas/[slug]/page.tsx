import { ArrowLeft, BadgeCheck, MapPin, Recycle, Star } from 'lucide-react';
import { notFound } from 'next/navigation';
import { SessionActions } from '../../../components/session-actions';
import { ListingCard as ListingCardView } from '../../../components/listing-card';
import { CompanyReviews, ListingCard, PublicCompany } from '../../../lib/api';

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

export default async function CompanyPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await fetchJson<{
    company: PublicCompany;
    listings: ListingCard[];
  }>(`/companies/public/${slug}`);

  if (!result) notFound();
  const { company, listings } = result;
  const name = company.tradeName || company.legalName;
  const location = [company.city, company.state].filter(Boolean).join(', ');
  const reviews = await fetchJson<CompanyReviews>(`/companies/${slug}/reviews`);
  const ratingCount = Number(company.ratingCount) || 0;
  const ratingAverage = Number(company.ratingAverage) || 0;

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

      <section className="company-public shell">
        <a className="back-link" href="/anuncios">
          <ArrowLeft size={15} /> Voltar para oportunidades
        </a>
        <div className="company-public-head">
          <div>
            <p className="eyebrow">empresa</p>
            <h1>{name}</h1>
            <p className="detail-company">
              {company.legalName}
              {company.verification === 'VERIFIED' && (
                <span>
                  <BadgeCheck size={15} /> Verificada
                </span>
              )}
            </p>
            {location && (
              <p className="detail-location">
                <MapPin size={16} /> {location}
              </p>
            )}
            {ratingCount > 0 && (
              <p className="company-rating">
                <Star size={16} fill="currentColor" />{' '}
                {ratingAverage.toFixed(1)} de 5 · {ratingCount} avaliação(ões)
              </p>
            )}
          </div>
        </div>
        {company.description && (
          <p className="company-public-description">{company.description}</p>
        )}
        <p className="section-lede">
          {listings.length} anúncio(s) publicado(s) por esta empresa.
        </p>
      </section>

      {reviews && reviews.reviews.length > 0 && (
        <section className="company-reviews shell">
          <h2>Avaliações recebidas</h2>
          <p className="section-lede">
            Média {reviews.summary.average.toFixed(1)} de 5 em{' '}
            {reviews.summary.count} avaliação(ões).
          </p>
          <div className="review-list">
            {reviews.reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-card-head">
                  <div
                    className="review-stars"
                    aria-label={`Nota ${review.rating} de 5`}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        size={15}
                        fill={value <= review.rating ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  <small>
                    {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                  </small>
                </div>
                {review.comment && <p>{review.comment}</p>}
                <small>
                  por{' '}
                  {review.authorCompany.tradeName ||
                    review.authorCompany.legalName}
                </small>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="listing-section shell company-public-listings">
        {listings.length === 0 ? (
          <div className="empty-panel listing-empty">
            <h2>Nenhum anúncio publicado.</h2>
            <p>Esta empresa não possui oportunidades ativas no momento.</p>
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
