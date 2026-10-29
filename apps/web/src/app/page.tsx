import {
  ArrowRight,
  CheckCircle2,
  Factory,
  Leaf,
  Recycle,
  Search,
  Truck,
} from 'lucide-react';
import { SessionActions } from '../components/session-actions';
import { ListingCard } from '../lib/api';
import { ListingCard as ListingCardView } from '../components/listing-card';
import { RecyclingCarousel } from '../components/recycling-carousel';
import { LanguageSwitcher } from '../components/language-switcher';
import { HomeCarouselSlide } from '../lib/api';
import { getTranslations } from 'next-intl/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type PublicStats = {
  totalListings: number;
  buyListings: number;
  sellListings: number;
  verifiedCompanies: number;
  demandByCategory: {
    id: string;
    name: string;
    slug: string;
    listings: number;
  }[];
};

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const t = await getTranslations('home');
  const nav = await getTranslations('nav');
  const [statsResult, listingsResult, carouselResult] = await Promise.all([
    fetchJson<PublicStats>('/stats'),
    fetchJson<{ data: ListingCard[] }>('/listings?pageSize=6'),
    fetchJson<{ slides: HomeCarouselSlide[] }>('/home-carousel/slides'),
  ]);

  const stats = statsResult ?? {
    totalListings: 0,
    buyListings: 0,
    sellListings: 0,
    verifiedCompanies: 0,
    demandByCategory: [],
  };
  const listings = listingsResult?.data ?? [];

  const maxDemand = Math.max(
    ...stats.demandByCategory.map((item) => item.listings),
    1,
  );

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="/">
          <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="nav-links">
          <a href="/como-funciona">{nav('howItWorks')}</a>
          <a href="#anuncios">{nav('listings')}</a>
          <a href="/planos">{nav('plans')}</a>
          <a href="/empresas">{nav('forCompanies')}</a>
          <a href="/desenvolvedores">{nav('developers')}</a>
        </div>
        <div className="nav-actions">
          <SessionActions />
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> {t('eyebrow')}
          </p>
          <h1>{t('title')}</h1>
          <p className="hero-lede">{t('lede')}</p>
          <div className="hero-actions">
            <a className="button" href="#anuncios">
              {t('explore')} <ArrowRight size={17} />
            </a>
            <a className="text-link" href="/cadastro">
              {t('advertise')} <ArrowRight size={16} />
            </a>
          </div>
          <div className="trust">
            <CheckCircle2 size={17} /> {t('trust')}
          </div>
        </div>
        <div className="hero-art">
          <RecyclingCarousel customSlides={carouselResult?.slides ?? []} />
        </div>
      </section>

      <section className="stats shell">
        <div>
          <strong>{stats.totalListings}</strong>
          <span>{t('statsPublished')}</span>
        </div>
        <div>
          <strong>{stats.buyListings}</strong>
          <span>{t('statsBuy')}</span>
        </div>
        <div>
          <strong>{stats.sellListings}</strong>
          <span>{t('statsSell')}</span>
        </div>
        <div>
          <strong>{stats.verifiedCompanies}</strong>
          <span>{t('statsVerified')}</span>
        </div>
      </section>

      <section className="market-pulse shell" aria-labelledby="pulse-title">
        <div className="pulse-copy">
          <p className="eyebrow">{t('pulseEyebrow')}</p>
          <h2 id="pulse-title">{t('pulseTitle')}</h2>
          <p>{t('pulseBody')}</p>
          <a className="text-link" href="/anuncios">
            {t('pulseLink')} <ArrowRight size={16} />
          </a>
        </div>
        <div className="pulse-chart" role="img" aria-label={t('pulseAria')}>
          <div className="pulse-chart-header">
            <span>{t('pulseChart')}</span>
            <strong>{stats.totalListings}</strong>
          </div>
          <div className="chart-bars">
            {stats.demandByCategory.slice(0, 5).map((item) => (
              <div className="chart-row" key={item.id}>
                <span>{item.name}</span>
                <div>
                  <i
                    style={{
                      width: `${Math.max((item.listings / maxDemand) * 100, 5)}%`,
                    }}
                  />
                </div>
                <b>{item.listings}</b>
              </div>
            ))}
            {stats.demandByCategory.length === 0 && (
              <div className="chart-row">
                <span>{t('pulseEmpty')}</span>
                <div>
                  <i style={{ width: '5%' }} />
                </div>
                <b>0</b>
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        className="environment-problems shell"
        aria-labelledby="problems-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('problemsEyebrow')}</p>
            <h2 id="problems-title">{t('problemsTitle')}</h2>
          </div>
        </div>
        <div className="problem-grid">
          <article className="problem-card">
            <span className="problem-icon">
              <Truck size={22} />
            </span>
            <h3>{t('problem1Title')}</h3>
            <p>{t('problem1Body')}</p>
          </article>
          <article className="problem-card">
            <span className="problem-icon">
              <Factory size={22} />
            </span>
            <h3>{t('problem2Title')}</h3>
            <p>{t('problem2Body')}</p>
          </article>
          <article className="problem-card">
            <span className="problem-icon">
              <Leaf size={22} />
            </span>
            <h3>{t('problem3Title')}</h3>
            <p>{t('problem3Body')}</p>
          </article>
        </div>
      </section>

      <section className="listing-section shell" id="anuncios">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('recentEyebrow')}</p>
            <h2>{t('recentTitle')}</h2>
          </div>
          <a className="text-link" href="/anuncios">
            {t('recentAll')} <ArrowRight size={16} />
          </a>
        </div>
        <div className="search-bar">
          <Search size={19} />
          <form action="/anuncios" method="get">
            <input
              name="q"
              aria-label={t('searchAria')}
              placeholder={t('searchPlaceholder')}
            />
            <button type="submit">{t('searchButton')}</button>
          </form>
        </div>
        <div className="listing-grid">
          {listings.length === 0 ? (
            <p className="empty-state">{t('empty')}</p>
          ) : (
            listings.map((listing) => (
              <ListingCardView
                key={listing.id}
                listing={listing}
                showFavorite={false}
              />
            ))
          )}
        </div>
      </section>

      <section className="closing shell" id="como-funciona">
        <p className="eyebrow">{t('closingEyebrow')}</p>
        <h2>
          {t('closingLine1')}
          <br />
          <em>{t('closingLine2')}</em>
        </h2>
        <a className="button" href="/cadastro">
          {t('start')} <ArrowRight size={17} />
        </a>
      </section>
      <footer className="footer shell">
        <a className="brand" href="/">
          <Recycle size={20} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="footer-links">
          <a href="/planos">{nav('plans')}</a>
          <a href="/desenvolvedores">{nav('developers')}</a>
          <a href="/termos">{t('footerTerms')}</a>
          <a href="/privacidade">{t('footerPrivacy')}</a>
        </div>
        <LanguageSwitcher compact />
        <span>{t('footerTagline')}</span>
        <span>© 2026 LOOP AMBIENTAL</span>
      </footer>
    </main>
  );
}
