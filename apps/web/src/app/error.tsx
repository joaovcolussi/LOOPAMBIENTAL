'use client';

import { Recycle } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the error identifier for support without exposing internals to users.
    console.error('Application error', error.digest ?? error.message);
  }, [error]);

  return (
    <main className="detail-page">
      <nav className="nav shell">
        <a className="brand" href="/">
          <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
        </a>
      </nav>
      <section className="detail-error shell">
        <p className="eyebrow">algo deu errado</p>
        <h1>Não conseguimos carregar esta página.</h1>
        <p className="section-lede">
          Tente novamente. Se o problema continuar, entre em contato com o
          suporte.
        </p>
        <button className="button" type="button" onClick={reset}>
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
