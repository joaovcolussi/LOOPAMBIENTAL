import { Recycle } from 'lucide-react';
import { SessionActions } from '../../../components/session-actions';

export default function ListingsDashboardPage() {
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
        <p className="eyebrow">seus anúncios</p>
        <h1>Anúncios</h1>
        <p className="dashboard-lede">
          Gerencie seus materiais publicados e rascunhos.
        </p>
        <a className="button" href="/dashboard/anuncios/novo">
          Criar anúncio
        </a>
      </section>
    </main>
  );
}
