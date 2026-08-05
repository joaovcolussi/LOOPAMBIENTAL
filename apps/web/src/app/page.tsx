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

const listings = [
  {
    title: 'Fardos de papelão ondulado',
    slug: 'papelao-ondulado-limpo-demo',
    company: 'Circular Materiais',
    location: 'Campinas, SP',
    quantity: '6 t disponíveis',
    type: 'VENDA',
    tone: 'mint',
    image: '/products/papelao.svg',
  },
  {
    title: 'Compra recorrente de alumínio prensado',
    slug: 'compra-aluminio-prensado-demo',
    company: 'Verde Norte',
    location: 'São Paulo, SP',
    quantity: '8 t mensais',
    type: 'COMPRA',
    tone: 'blue',
    image: '/products/aluminio.svg',
  },
  {
    title: 'PET cristal enfardado pós-consumo',
    slug: 'pet-cristal-enfardado-demo',
    company: 'Circular Materiais',
    location: 'Guarulhos, SP',
    quantity: '12,5 t disponíveis',
    type: 'VENDA',
    tone: 'sand',
    image: '/products/pet.svg',
  },
];

export default function HomePage() {
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
            <span>+ 438 operações</span>
          </div>
        </div>
      </section>

      <section className="stats shell">
        <div>
          <strong>Compra + venda</strong>
          <span>no mesmo marketplace</span>
        </div>
        <div>
          <strong>Propostas</strong>
          <span>com histórico de negociação</span>
        </div>
        <div>
          <strong>Contato protegido</strong>
          <span>conforme a permissão da empresa</span>
        </div>
        <div>
          <strong>Dados técnicos</strong>
          <span>para decidir melhor</span>
        </div>
      </section>

      <section className="market-pulse shell" aria-labelledby="pulse-title">
        <div className="pulse-copy">
          <p className="eyebrow">pulso da cadeia</p>
          <h2 id="pulse-title">Onde a indústria está encontrando valor.</h2>
          <p>
            Uma visão demonstrativa das categorias com maior movimento na rede
            LOOP AMBIENTAL neste ciclo.
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
            <span>movimento por categoria</span>
            <strong>+18,4%</strong>
          </div>
          <div className="chart-bars">
            <div className="chart-row">
              <span>Metais</span>
              <div>
                <i style={{ width: '88%' }} />
              </div>
              <b>88%</b>
            </div>
            <div className="chart-row">
              <span>Plásticos</span>
              <div>
                <i style={{ width: '72%' }} />
              </div>
              <b>72%</b>
            </div>
            <div className="chart-row">
              <span>Papel</span>
              <div>
                <i style={{ width: '61%' }} />
              </div>
              <b>61%</b>
            </div>
            <div className="chart-row">
              <span>Madeira</span>
              <div>
                <i style={{ width: '46%' }} />
              </div>
              <b>46%</b>
            </div>
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
          {listings.map((listing) => (
            <article className="listing" key={listing.title}>
              <div className={`listing-image ${listing.tone}`}>
                <img
                  src={listing.image}
                  alt={`Foto de ${listing.title}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <span className={`listing-type ${listing.type.toLowerCase()}`}>
                  {listing.type}
                </span>
              </div>
              <div className="listing-body">
                <div className="listing-meta">
                  <span>{listing.company}</span>
                  <span className="verified">verificada</span>
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
                  <span>{listing.quantity}</span>
                  <span>
                    <MapPin size={14} />
                    {listing.location}
                  </span>
                </div>
                <div className="listing-footer">
                  <strong>Disponível agora</strong>
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
          ))}
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
