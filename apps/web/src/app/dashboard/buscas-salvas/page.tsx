'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, isAuthenticationError, SavedSearch } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

const frequencyLabels: Record<string, string> = {
  NONE: 'Sem alerta',
  DAILY: 'Alerta diário',
  WEEKLY: 'Alerta semanal',
};

function filterSummary(search: SavedSearch) {
  const parts: string[] = [];
  if (search.filters.q) parts.push(`“${search.filters.q}”`);
  if (search.filters.type)
    parts.push(search.filters.type === 'BUY' ? 'Compra' : 'Venda');
  if (search.filters.state) parts.push(search.filters.state);
  return parts.length > 0 ? parts.join(' · ') : 'Todos os anúncios';
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resultsFor, setResultsFor] = useState<string | null>(null);
  const [results, setResults] = useState<
    { id: string; title: string; slug: string }[]
  >([]);

  const load = useCallback(async () => {
    const { savedSearches } = await api.savedSearches();
    setSearches(savedSearches);
  }, []);

  useEffect(() => {
    load()
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/buscas-salvas');
        else setError('Não foi possível carregar suas buscas salvas.');
      })
      .finally(() => setLoading(false));
  }, [load, router]);

  async function toggle(search: SavedSearch) {
    setError('');
    try {
      await api.updateSavedSearch(search.id, { isActive: !search.isActive });
      await load();
    } catch {
      setError('Não foi possível atualizar a busca.');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Remover esta busca salva?')) return;
    try {
      await api.deleteSavedSearch(id);
      await load();
    } catch {
      setError('Não foi possível remover a busca.');
    }
  }

  async function showResults(id: string) {
    setError('');
    setResultsFor(id);
    try {
      const result = await api.savedSearchResults(id);
      setResults(result.data);
    } catch {
      setError('Não foi possível carregar os resultados.');
      setResults([]);
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando buscas salvas...</div>
      </main>
    );

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/dashboard">
            <ArrowLeft size={15} /> Voltar ao painel
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell">
        <p className="eyebrow">seu radar</p>
        <h1>Buscas salvas</h1>
        <p className="dashboard-lede">
          Guarde filtros e receba avisos quando surgirem novos anúncios
          compatíveis.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {searches.length === 0 ? (
          <div className="empty-panel favorite-empty">
            <Bookmark size={22} />
            <p>Você ainda não salvou nenhuma busca.</p>
            <a className="text-link" href="/anuncios">
              Explorar anúncios <ArrowRight size={15} />
            </a>
          </div>
        ) : (
          <div className="favorite-grid">
            {searches.map((search) => (
              <article className="favorite-card" key={search.id}>
                <div>
                  <span className="dashboard-number">
                    {frequencyLabels[search.frequency] ?? search.frequency}
                    {search.isActive ? '' : ' · pausada'}
                  </span>
                  <h2>{search.name}</h2>
                  <p>{filterSummary(search)}</p>
                  <small>
                    Criada em{' '}
                    {new Date(search.createdAt).toLocaleDateString('pt-BR')}
                    {search.lastProcessedAt
                      ? ` · último alerta ${new Date(
                          search.lastProcessedAt,
                        ).toLocaleDateString('pt-BR')}`
                      : ''}
                  </small>
                  <div className="saved-search-actions">
                    <button
                      className="secondary-button small"
                      type="button"
                      onClick={() => toggle(search)}
                    >
                      {search.isActive ? 'Pausar alertas' : 'Ativar alertas'}
                    </button>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => showResults(search.id)}
                    >
                      Ver resultados
                    </button>
                    <button
                      className="link-button saved-search-remove"
                      type="button"
                      aria-label={`Remover ${search.name}`}
                      onClick={() => remove(search.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {resultsFor === search.id && (
                    <ul className="saved-search-results">
                      {results.length === 0 ? (
                        <li>Nenhum anúncio publicado no momento.</li>
                      ) : (
                        results.map((listing) => (
                          <li key={listing.id}>
                            <a href={`/anuncios/${listing.slug}`}>
                              {listing.title}
                            </a>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
