import {
  ArrowRight,
  CheckCircle2,
  Factory,
  Leaf,
  MapPin,
  Recycle,
  Search,
  Truck,
} from 'lucide-react';
import { SessionActions } from '../components/session-actions';
import { ListingCard } from '../lib/api';

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
  const [statsResult, listingsResult] = await Promise.all([
    fetchJson<PublicStats>('/stats'),
    fetchJson<{ data: ListingCard[] }>('/listings?pageSize=6'),
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

  const formatQuantity = (listing: ListingCard) => {
    const value = Number(listing.availableQuantity).toLocaleString('pt-BR');
    return `${value} ${listing.unit} disponíveis`;
  };

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="/">
          <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="nav-links">
          <a href="/como-funciona">Como funciona</a>
          <a href="#anuncios">Anúncios</a>
          <a href="/empresas">Para empresas</a>
        </div>
        <div className="nav-actions">
          <SessionActions />
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> marketplace B2B de resíduos industriais
          </p>
          <h1>
            O resíduo de uma indústria pode ser o insumo estratégico de outra.
          </h1>
          <p className="hero-lede">
            Conecte geradores a compradores de resíduos e subprodutos, reduza
            custos de descarte e gere valor para a cadeia produtiva.
          </p>
          <div className="hero-actions">
            <a className="button" href="#anuncios">
              Explorar oportunidades <ArrowRight size={17} />
            </a>
            <a className="text-link" href="/cadastro">
              Quero anunciar <ArrowRight size={16} />
            </a>
          </div>
          <div className="trust">
            <CheckCircle2 size={17} /> Empresas e operações verificadas
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Ilustração de materiais circulares"
        >
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="material-card card-main">
            <span className="card-label">EM DESTAQUE</span>
            <strong>Resíduo PET cristal</strong>
            <span>
              2,4 toneladas <i>•</i> Guarulhos, SP
            </span>
            <b>
              R$ 4,80 <small>/ kg</small>
            </b>
          </div>
          <div className="material-card card-float">
            <Recycle size={18} />
            <strong>ciclo industrial ativo</strong>
            <span>+ {stats.totalListings} operações</span>
          </div>
        </div>
      </section>

      <section className="stats shell">
        <div>
          <strong>{stats.totalListings}</strong>
          <span>anúncios publicados</span>
        </div>
        <div>
          <strong>{stats.buyListings}</strong>
          <span>demanda de compra</span>
        </div>
        <div>
          <strong>{stats.sellListings}</strong>
          <span>oferta de venda</span>
        </div>
        <div>
          <strong>{stats.verifiedCompanies}</strong>
          <span>empresas verificadas</span>
        </div>
      </section>

      <section className="market-pulse shell" aria-labelledby="pulse-title">
        <div className="pulse-copy">
          <p className="eyebrow">pulso da cadeia</p>
          <h2 id="pulse-title">Onde a indústria está encontrando valor.</h2>
          <p>
            Distribuição dos anúncios publicados por categoria na rede LOOP
            AMBIENTAL.
          </p>
          <a className="text-link" href="/anuncios">
            Ver oportunidades ativas <ArrowRight size={16} />
          </a>
        </div>
        <div
          className="pulse-chart"
          role="img"
          aria-label="Movimento por categoria"
        >
          <div className="pulse-chart-header">
            <span>anúncios por categoria</span>
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
                <span>Ainda não há dados.</span>
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
            <p className="eyebrow">impacto que começa na operação</p>
            <h2 id="problems-title">
              Problemas ambientais que a LOOP ajuda a resolver.
            </h2>
          </div>
        </div>
        <div className="problem-grid">
          <article className="problem-card">
            <span className="problem-icon">
              <Truck size={22} />
            </span>
            <h3>Transporte e descarte desnecessários</h3>
            <p>
              Aproximamos oferta e demanda para reduzir deslocamentos sem
              destino comercial e custos de descarte.
            </p>
          </article>
          <article className="problem-card">
            <span className="problem-icon">
              <Factory size={22} />
            </span>
            <h3>Resíduo tratado como perda</h3>
            <p>
              Damos visibilidade a materiais que podem voltar para processos
              produtivos como matéria-prima ou subproduto.
            </p>
          </article>
          <article className="problem-card">
            <span className="problem-icon">
              <Leaf size={22} />
            </span>
            <h3>Baixa rastreabilidade ambiental</h3>
            <p>
              Organizamos empresas, propostas e informações da operação para
              apoiar decisões mais responsáveis e circulares.
            </p>
          </article>
        </div>
      </section>

      <section className="listing-section shell" id="anuncios">
        <div className="section-heading">
          <div>
            <p className="eyebrow">oportunidades recentes</p>
            <h2>Resíduos com valor comercial</h2>
          </div>
          <a className="text-link" href="/anuncios">
            Ver todas as oportunidades <ArrowRight size={16} />
          </a>
        </div>
        <div className="search-bar">
          <Search size={19} />
          <form action="/anuncios" method="get">
            <input
              name="q"
              aria-label="Buscar por material, categoria ou cidade"
              placeholder="Busque por resíduo, subproduto ou cidade"
            />
            <button type="submit">Buscar</button>
          </form>
        </div>
        <div className="listing-grid">
          {listings.length === 0 ? (
            <p className="empty-state">Ainda não há anúncios publicados.</p>
          ) : (
            listings.map((listing) => (
              <article className="listing" key={listing.id}>
                <div
                  className={`listing-image ${
                    listing.type === 'BUY' ? 'blue' : 'mint'
                  }`}
                >
                  <span
                    className={`listing-type ${listing.type.toLowerCase()}`}
                  >
                    {listing.type === 'BUY' ? 'COMPRA' : 'VENDA'}
                  </span>
                </div>
                <div className="listing-body">
                  <div className="listing-meta">
                    <span>
                      {listing.company.tradeName || listing.company.legalName}
                    </span>
                    {listing.company.verification === 'VERIFIED' && (
                      <span className="verified">verificada</span>
                    )}
                  </div>
                  <h3>
                    <a
                      className="listing-title-link"
                      href={`/anuncios/${listing.slug}`}
                    >
                      {listing.title}
                    </a>
                  </h3>
                  <div className="listing-detail">
                    <span>{formatQuantity(listing)}</span>
                    <span>
                      <MapPin size={14} />
                      {listing.city ? `${listing.city}, ${listing.state}` : '—'}
                    </span>
                  </div>
                  <div className="listing-footer">
                    <strong>
                      {listing.unitPrice
                        ? `R$ ${Number(listing.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / ${listing.unit}`
                        : 'Preço sob consulta'}
                    </strong>
                    <a
                      className="listing-arrow"
                      href={`/anuncios/${listing.slug}`}
                      aria-label={`Ver ${listing.title}`}
                    >
                      <ArrowRight size={17} />
                    </a>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="closing shell" id="como-funciona">
        <p className="eyebrow">feito para o mercado real</p>
        <h2>
          Menos descarte.
          <br />
          <em>Mais valor.</em>
        </h2>
        <a className="button" href="/cadastro">
          Começar agora <ArrowRight size={17} />
        </a>
      </section>
      <footer className="footer shell">
        <a className="brand" href="/">
          <Recycle size={20} /> LOOP <span>AMBIENTAL</span>
        </a>
        <span>Mercado circular para negócios melhores.</span>
        <span>© 2026 LOOP AMBIENTAL</span>
      </footer>
    </main>
  );
}
