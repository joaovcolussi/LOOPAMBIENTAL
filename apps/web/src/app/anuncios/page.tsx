'use client';

import { Recycle, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { SessionActions } from '../../components/session-actions';
import { ListingCard as ListingCardView } from '../../components/listing-card';
import { api, ListingCard } from '../../lib/api';

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .favorites()
      .then(({ favorites }) =>
        setFavoriteIds(
          new Set(favorites.map((favorite) => favorite.listing.id)),
        ),
      )
      .catch(() => setFavoriteIds(new Set()));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get('q') ?? '');
    const requestedType = params.get('type');
    if (requestedType === 'BUY' || requestedType === 'SELL')
      setType(requestedType);
    const requestedCategory = params.get('categoryId');
    if (requestedCategory) setCategoryId(requestedCategory);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .listings({
        page,
        pageSize: 12,
        q: query.trim() || undefined,
        type: type === 'ALL' ? undefined : type,
        categoryId: categoryId || undefined,
      })
      .then((result) => {
        if (!active) return;
        setListings(result.data);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages || 1);
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar as oportunidades.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, query, type, categoryId]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (type !== 'ALL') params.set('type', type);
    if (categoryId) params.set('categoryId', categoryId);
    window.history.replaceState(
      null,
      '',
      `/anuncios${params.size ? `?${params}` : ''}`,
    );
  }

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="/">
          <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="nav-actions">
          <SessionActions />
        </div>
      </nav>
      <section className="listing-section shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">mercado industrial B2B</p>
            <h1>Oportunidades de resíduos</h1>
            <p className="section-lede">
              Encontre materiais para comprar ou empresas interessadas em
              adquirir seus resíduos. Abra o detalhe para consultar condições e
              enviar uma proposta.
            </p>
          </div>
          <a className="text-link" href="/">
            Voltar para o início
          </a>
        </div>
        <form className="search-bar" onSubmit={submitSearch}>
          <Search size={19} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar anúncios"
            placeholder="Busque por resíduo, subproduto ou cidade"
          />
          <button type="submit">Buscar</button>
        </form>
        <div className="listing-filters" aria-label="Tipo de oportunidade">
          {[
            ['ALL', 'Todas'],
            ['BUY', 'Quero comprar'],
            ['SELL', 'Quero vender'],
          ].map(([value, label]) => (
            <button
              className={type === value ? 'active' : ''}
              key={value}
              type="button"
              onClick={() => {
                setType(value as 'ALL' | 'BUY' | 'SELL');
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
          <span>{total} oportunidades encontradas</span>
        </div>
        {loading ? (
          <div className="dashboard-loading">Carregando oportunidades...</div>
        ) : error ? (
          <div className="detail-error">
            <h2>{error}</h2>
            <button className="button" type="button" onClick={() => setPage(1)}>
              Tentar novamente
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="empty-panel listing-empty">
            <h2>Nenhuma oportunidade encontrada.</h2>
            <p>Tente buscar por outra categoria, cidade ou material.</p>
          </div>
        ) : (
          <div className="listing-grid">
            {listings.map((listing) => (
              <ListingCardView
                key={listing.id}
                listing={listing}
                initialFavorite={favoriteIds.has(listing.id)}
              />
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="listing-pagination">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
