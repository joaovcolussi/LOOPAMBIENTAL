import { ArrowLeft, Recycle } from 'lucide-react';

export const metadata = { title: 'Página não encontrada | LOOP AMBIENTAL' };

export default function NotFound() {
  return (
    <main className="detail-page">
      <nav className="nav shell">
        <a className="brand" href="/">
          <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
        </a>
      </nav>
      <section className="detail-error shell">
        <p className="eyebrow">erro 404</p>
        <h1>Não encontramos esta página.</h1>
        <p className="section-lede">
          O endereço pode ter sido movido, encerrado ou nunca existiu.
        </p>
        <a className="button" href="/">
          <ArrowLeft size={16} /> Voltar para o início
        </a>
      </section>
    </main>
  );
}
