import {
  ArrowRight,
  BadgeCheck,
  Building2,
  MessageCircle,
  PackageSearch,
} from 'lucide-react';
import { SessionActions } from '../../components/session-actions';

export const metadata = { title: 'Como funciona | LOOP AMBIENTAL' };

const steps = [
  {
    number: '01',
    icon: Building2,
    title: 'Crie sua conta e empresa',
    text: 'Informe seus dados, apresente sua empresa e defina se você compra, vende ou faz os dois.',
  },
  {
    number: '02',
    icon: PackageSearch,
    title: 'Encontre ou publique materiais',
    text: 'Use filtros por material, categoria e localização ou crie um anúncio com quantidade e condições.',
  },
  {
    number: '03',
    icon: MessageCircle,
    title: 'Converse e envie propostas',
    text: 'Negocie valores, volumes e prazos em um espaço organizado com os participantes da operação.',
  },
  {
    number: '04',
    icon: BadgeCheck,
    title: 'Feche com mais confiança',
    text: 'Acompanhe a proposta aceita, os próximos passos e o histórico da negociação.',
  },
];

export default function HowItWorksPage() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="/">
          LOOP <span>AMBIENTAL</span>
        </a>
        <div className="nav-actions">
          <SessionActions />
        </div>
      </nav>

      <section className="how-hero shell">
        <p className="eyebrow">
          <span /> simples para começar
        </p>
        <h1>Do material parado ao negocio em movimento.</h1>
        <p>
          A LOOP AMBIENTAL aproxima empresas que precisam comprar de empresas
          que possuem resíduos e subprodutos para vender, com contexto
          suficiente para uma conversa mais objetiva.
        </p>
      </section>

      <section className="how-steps shell">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <article className="how-step" key={step.number}>
              <div className="how-step-icon">
                <Icon size={23} />
              </div>
              <span>{step.number}</span>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </article>
          );
        })}
      </section>

      <section className="how-audience shell">
        <article>
          <p className="eyebrow">para quem vende</p>
          <h2>De mais visibilidade ao seu excedente.</h2>
          <p>
            Apresente o material, receba interessados e organize as propostas
            sem depender de planilhas ou conversas espalhadas.
          </p>
          <a className="text-link" href="/cadastro">
            Quero anunciar <ArrowRight size={16} />
          </a>
        </article>
        <article>
          <p className="eyebrow">para quem compra</p>
          <h2>Encontre o insumo certo para sua operação.</h2>
          <p>
            Compare ofertas, filtre por região e converse com empresas que já
            estão preparadas para negociar.
          </p>
          <a className="text-link" href="/anuncios">
            Explorar anúncios <ArrowRight size={16} />
          </a>
        </article>
      </section>

      <section className="how-cta shell">
        <div>
          <p className="eyebrow">pronto para começar?</p>
          <h2>Participe da nova cadeia de valor industrial.</h2>
        </div>
        <a className="button" href="/cadastro">
          Criar minha conta <ArrowRight size={17} />
        </a>
      </section>
    </main>
  );
}
