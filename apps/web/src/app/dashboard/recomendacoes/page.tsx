'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '../../../components/dashboard-header';
import { ListingCard as ListingCardView } from '../../../components/listing-card';
import { api, isAuthenticationError, Recommendation } from '../../../lib/api';

export default function RecommendationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [signals, setSignals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .recommendations()
      .then((result) => {
        setItems(result.recommendations);
        setSignals(
          result.basedOn.complementaryCategories +
            result.basedOn.favoriteCategories +
            result.basedOn.savedSearchCategories,
        );
      })
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/recomendacoes');
        else setError('Não foi possível carregar recomendações.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="dashboard-page">
      <DashboardHeader />
      <section className="dashboard-content shell">
        <p className="eyebrow">para você</p>
        <h1>Recomendações de ofertas</h1>
        <p className="dashboard-lede">
          Sugestões explicáveis com base no que sua empresa anuncia, nos seus
          favoritos e nas buscas salvas — sem caixa-preta: cada card mostra o
          motivo.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <div className="dashboard-loading">Calculando recomendações...</div>
        ) : items.length === 0 ? (
          <div className="empty-panel favorite-empty">
            <Sparkles size={22} />
            <p>
              Ainda não há sugestões. Publique anúncios, favorite oportunidades
              ou salve buscas para personalizar esta lista.
            </p>
          </div>
        ) : (
          <>
            {signals === 0 && (
              <p className="form-note">
                Mostrando oportunidades recentes; personalize favoritando
                anúncios ou salvando buscas.
              </p>
            )}
            <div className="listing-grid">
              {items.map((item) => (
                <div key={item.listing.id} className="recommendation">
                  <ListingCardView listing={item.listing} />
                  <ul className="plain-list recommendation-reasons">
                    {item.reasons.map((reason) => (
                      <li key={reason}>
                        <small>{reason}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
