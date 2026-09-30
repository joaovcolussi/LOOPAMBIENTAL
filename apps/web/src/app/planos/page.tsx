import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Recycle,
} from 'lucide-react';
import { SessionActions } from '../../components/session-actions';

export const metadata = { title: 'Planos | LOOP AMBIENTAL' };

const plans = [
  {
    name: 'Explorar',
    price: 'Grátis',
    tagline: 'Para começar a entender o mercado.',
    features: [
      'Perfil de empresa',
      'Anúncios de compra e venda',
      'Busca e favoritos',
      'Propostas e mensagens',
    ],
    cta: 'Criar conta',
    href: '/cadastro',
  },
  {
    name: 'Profissional',
    price: 'Sob consulta',
    tagline: 'Para operações recorrentes.',
    features: [
      'Tudo do Explorar',
      'Verificação de empresa com selo',
      'Buscas salvas e alertas',
      'Relatórios e indicadores',
      'Prioridade no suporte',
    ],
    cta: 'Falar com vendas',
    href: '/como-funciona',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    tagline: 'Para grandes geradores e recicladores.',
    features: [
      'Tudo do Profissional',
      'Múltiplas unidades e usuários',
      'Integrações e API',
      'Condições comerciais dedicadas',
    ],
    cta: 'Falar com vendas',
    href: '/como-funciona',
  },
];

export default function PlansPage() {
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

      <section className="how-hero shell">
        <p className="eyebrow">
          <span /> planos
        </p>
        <h1>Escolha o plano da sua operação circular.</h1>
        <p>
          Comece de graça e evolua conforme sua operação cresce. A plataforma
          cobra comissão sobre operações concluídas, entre 5% e 15%.
        </p>
      </section>

      <section className="pricing-grid shell">
        {plans.map((plan) => (
          <article
            className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}
            key={plan.name}
          >
            {plan.highlighted && (
              <span className="pricing-tag">
                <BadgeCheck size={13} /> Mais completo
              </span>
            )}
            <h2>{plan.name}</h2>
            <strong className="pricing-price">{plan.price}</strong>
            <p>{plan.tagline}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={15} /> {feature}
                </li>
              ))}
            </ul>
            <a
              className={`button ${plan.highlighted ? '' : 'secondary-button'}`}
              href={plan.href}
            >
              {plan.cta} <ArrowRight size={15} />
            </a>
          </article>
        ))}
      </section>

      <section className="business-cta shell">
        <div>
          <p className="eyebrow">sem burocracia</p>
          <h2>Precisa de um plano sob medida?</h2>
        </div>
        <a className="button" href="/empresas">
          <Building2 size={16} /> Falar com a LOOP
        </a>
      </section>
    </main>
  );
}
