'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, AuthUser } from '../../lib/api';
import { SessionActions } from '../../components/session-actions';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((result) => setUser(result.user))
      .catch(() => router.replace('/entrar'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando seu painel...</div>
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
          <a className="back-link" href="/anuncios">
            Explorar anúncios
          </a>
          {(user.platformRole === 'ADMIN' ||
            user.platformRole === 'MODERATOR') && (
            <a className="back-link" href="/admin">
              Administração
            </a>
          )}
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell">
        <p className="eyebrow">painel da empresa</p>
        <h1>Olá, {user.name.split(' ')[0]}.</h1>
        <p className="dashboard-lede">
          Sua conta está pronta. O próximo passo é cadastrar sua empresa para
          começar a negociar.
        </p>
        <div className="dashboard-grid">
          <article>
            <span className="dashboard-number">01</span>
            <h2>Cadastre sua empresa</h2>
            <p>Adicione os dados e a localização da sua operação.</p>
            <a href="/dashboard/empresa">
              Configurar empresa <ArrowRight size={15} />
            </a>
          </article>
          <article>
            <span className="dashboard-number">05</span>
            <h2>Converse com parceiros</h2>
            <p>Troque mensagens dentro da plataforma.</p>
            <a href="/dashboard/mensagens">
              Abrir mensagens <ArrowRight size={15} />
            </a>
          </article>
          <article>
            <span className="dashboard-number">04</span>
            <h2>Negocie propostas</h2>
            <p>Veja as oportunidades comerciais da sua empresa.</p>
            <a href="/dashboard/propostas">
              Ver propostas <ArrowRight size={15} />
            </a>
          </article>
          <article>
            <span className="dashboard-number">02</span>
            <h2>Publique um anúncio</h2>
            <p>Encontre compradores ou fornecedores para seus materiais.</p>
            <a href="/dashboard/anuncios/novo">
              Criar anúncio <ArrowRight size={15} />
            </a>
          </article>
          <article>
            <span className="dashboard-number">03</span>
            <h2>Salve seus favoritos</h2>
            <p>Acompanhe anúncios interessantes em um só lugar.</p>
            <a href="/dashboard/favoritos">
              Ver favoritos <ArrowRight size={15} />
            </a>
          </article>
          <article>
            <span className="dashboard-number">06</span>
            <h2>Acompanhe atualizações</h2>
            <p>Receba avisos sobre propostas e mensagens.</p>
            <a href="/dashboard/notificacoes">
              Ver notificações <ArrowRight size={15} />
            </a>
          </article>
          <article>
            <span className="dashboard-number">07</span>
            <h2>Pagamentos</h2>
            <p>Acompanhe checkouts e pagamentos das negociações.</p>
            <a href="/dashboard/pagamentos">
              Ver pagamentos <ArrowRight size={15} />
            </a>
          </article>
          <article>
            <span className="dashboard-number">08</span>
            <h2>Logística</h2>
            <p>Solicite transporte e compare cotações manuais.</p>
            <a href="/dashboard/logistica">
              Abrir logística <ArrowRight size={15} />
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}
