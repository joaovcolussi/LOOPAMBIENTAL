import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Handshake,
  Search,
} from 'lucide-react';
import { SessionActions } from '../../components/session-actions';

export const metadata = { title: 'Para empresas | LOOP AMBIENTAL' };

const benefits = [
  {
    icon: Search,
    title: 'Encontre novos fornecedores',
    text: 'Pesquise materiais por categoria, localização, quantidade e disponibilidade.',
  },
  {
    icon: Handshake,
    title: 'Negocie com contexto',
    text: 'Receba propostas, converse com os participantes e acompanhe cada etapa.',
  },
  {
    icon: BadgeCheck,
    title: 'Opere com mais confiança',
    text: 'Veja empresas verificadas e mantenha um histórico organizado das negociações.',
  },
];

export default function CompaniesPage() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="/">
          <Building2 size={22} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="nav-links">
          <a href="/como-funciona">Como funciona</a>
          <a href="/anuncios">Anúncios</a>
        </div>
        <div className="nav-actions">
          <SessionActions />
        </div>
      </nav>

      <section className="business-hero shell">
        <div>
          <p className="eyebrow">
            <span /> para empresas
          </p>
          <h1>Transforme excedentes em novas oportunidades.</h1>
          <p className="business-lede">
            A LOOP AMBIENTAL conecta sua operação a compradores, fornecedores e
            parceiros para transformar resíduos industriais em ativos
            comercializáveis.
          </p>
          <div className="business-actions">
            <a className="button" href="/cadastro">
              Criar conta empresarial <ArrowRight size={17} />
            </a>
            <a className="text-link" href="/anuncios">
              Ver oportunidades <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <div className="business-panel" aria-label="Resumo da plataforma">
          <div className="business-panel-top">
            <span>visão da operação</span>
            <BadgeCheck size={20} />
          </div>
          <strong>Uma rede para cada etapa do seu resíduo industrial.</strong>
          <p className="business-panel-note">
            Conecte oferta e demanda com uma comissão de 5% a 15% por operação
            concluída.
          </p>
          <div className="business-metrics">
            <div>
              <b>Compra + venda</b>
              <span>no mesmo marketplace</span>
            </div>
            <div>
              <b>Propostas</b>
              <span>com histórico organizado</span>
            </div>
          </div>
        </div>
      </section>

      <section className="business-benefits shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">feito para a rotina real</p>
            <h2>Menos fricção para movimentar materiais.</h2>
          </div>
        </div>
        <div className="business-grid">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article className="business-card" key={benefit.title}>
                <Icon size={24} />
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="business-steps shell" id="como-funciona">
        <div>
          <p className="eyebrow">como funciona</p>
          <h2>Da necessidade ao negocio fechado.</h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <strong>Crie o perfil da empresa</strong>
              <p>Apresente sua operação e informe onde atua.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Anuncie ou encontre materiais</strong>
              <p>
                Publique uma oferta de compra ou venda com os detalhes certos.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Negocie e acompanhe</strong>
              <p>Centralize propostas, mensagens e próximos passos.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="business-cta shell">
        <div>
          <p className="eyebrow">próximo passo</p>
          <h2>Comece a construir sua rede circular.</h2>
        </div>
        <a className="button" href="/cadastro">
          Começar agora <ArrowRight size={17} />
        </a>
      </section>
    </main>
  );
}
