'use client';

import { LocateFixed, Recycle, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { SessionActions } from '../../components/session-actions';
import { ListingCard as ListingCardView } from '../../components/listing-card';
import { SaveSearchButton } from '../../components/save-search-button';
import { api, ListingCard, ListingFacets } from '../../lib/api';

const emptyFacets: ListingFacets = { categories: [], types: [], states: [] };
const RADIUS_OPTIONS = [25, 50, 100, 250, 500];

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [facets, setFacets] = useState<ListingFacets>(emptyFacets);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [categoryId, setCategoryId] = useState('');
  const [state, setState] = useState('');
  const [verified, setVerified] = useState(false);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [radiusKm, setRadiusKm] = useState(100);
  const [geoError, setGeoError] = useState('');
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
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
    const initialQuery = params.get('q') ?? '';
    setQuery(initialQuery);
    setQueryInput(initialQuery);
    const requestedType = params.get('type');
    if (requestedType === 'BUY' || requestedType === 'SELL')
      setType(requestedType);
    const requestedCategory = params.get('categoryId');
    if (requestedCategory) setCategoryId(requestedCategory);
    const requestedState = params.get('state');
    if (requestedState) setState(requestedState.toUpperCase());
    if (params.get('verified') === 'true') setVerified(true);
    const lat = Number(params.get('latitude'));
    const lng = Number(params.get('longitude'));
    if (Number.isFinite(lat) && Number.isFinite(lng) && params.get('latitude'))
      setCoords({ latitude: lat, longitude: lng });
    const requestedRadius = Number(params.get('radiusKm'));
    if (Number.isFinite(requestedRadius) && requestedRadius > 0)
      setRadiusKm(requestedRadius);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .listings({
        pageSize: 12,
        q: query.trim() || undefined,
        type: type === 'ALL' ? undefined : type,
        categoryId: categoryId || undefined,
        state: state || undefined,
        verified: verified || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        radiusKm: coords ? radiusKm : undefined,
        sort: coords ? 'distance' : undefined,
      })
      .then((result) => {
        if (!active) return;
        setListings(result.data);
        setFacets(result.facets);
        setTotal(result.pagination.total);
        setCursor(result.pagination.nextCursor);
        setHasMore(result.pagination.hasMore);
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
  }, [query, type, categoryId, state, verified, coords, radiusKm, reloadKey]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const result = await api.listings({
        pageSize: 12,
        q: query.trim() || undefined,
        type: type === 'ALL' ? undefined : type,
        categoryId: categoryId || undefined,
        state: state || undefined,
        verified: verified || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        radiusKm: coords ? radiusKm : undefined,
        sort: coords ? 'distance' : undefined,
        cursor,
      });
      setListings((current) => [...current, ...result.data]);
      setCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch {
      setError('Não foi possível carregar mais oportunidades.');
    } finally {
      setLoadingMore(false);
    }
  }

  function syncUrl(next: {
    q?: string;
    type?: string;
    categoryId?: string;
    state?: string;
    verified?: boolean;
    coords?: { latitude: number; longitude: number } | null;
    radiusKm?: number;
  }) {
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (next.type && next.type !== 'ALL') params.set('type', next.type);
    if (next.categoryId) params.set('categoryId', next.categoryId);
    if (next.state) params.set('state', next.state);
    if (next.verified) params.set('verified', 'true');
    if (next.coords) {
      params.set('latitude', String(next.coords.latitude));
      params.set('longitude', String(next.coords.longitude));
      params.set('radiusKm', String(next.radiusKm ?? radiusKm));
    }
    window.history.replaceState(
      null,
      '',
      `/anuncios${params.size ? `?${params}` : ''}`,
    );
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = queryInput.trim();
    setQuery(nextQuery);
    syncUrl({
      q: nextQuery,
      type,
      categoryId,
      state,
      verified,
      coords,
    });
  }

  function toggleType(nextType: 'ALL' | 'BUY' | 'SELL') {
    setType(nextType);
    syncUrl({ q: query, type: nextType, categoryId, state, verified, coords });
  }

  function toggleCategory(nextCategoryId: string) {
    const next = nextCategoryId === categoryId ? '' : nextCategoryId;
    setCategoryId(next);
    syncUrl({ q: query, type, categoryId: next, state, verified, coords });
  }

  function toggleState(nextState: string) {
    const next = nextState === state ? '' : nextState;
    setState(next);
    syncUrl({ q: query, type, categoryId, state: next, verified, coords });
  }

  function toggleVerified() {
    const next = !verified;
    setVerified(next);
    syncUrl({ q: query, type, categoryId, state, verified: next, coords });
  }

  function useMyLocation() {
    setGeoError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Geolocalização não disponível neste navegador.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        };
        setCoords(next);
        syncUrl({ q: query, type, categoryId, state, verified, coords: next });
      },
      () => setGeoError('Não foi possível obter sua localização.'),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function changeRadius(nextRadius: number) {
    setRadiusKm(nextRadius);
    if (coords)
      syncUrl({
        q: query,
        type,
        categoryId,
        state,
        verified,
        coords,
        radiusKm: nextRadius,
      });
  }

  function clearLocation() {
    setCoords(null);
    syncUrl({ q: query, type, categoryId, state, verified, coords: null });
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
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            aria-label="Buscar anúncios"
            placeholder="Busque por resíduo, subproduto ou cidade"
          />
          <button type="submit">Buscar</button>
        </form>
        <SaveSearchButton
          filters={{
            q: query.trim() || undefined,
            type: type === 'ALL' ? undefined : type,
            categoryId: categoryId || undefined,
            state: state || undefined,
          }}
        />
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
              onClick={() => toggleType(value as 'ALL' | 'BUY' | 'SELL')}
            >
              {label}
            </button>
          ))}
          <button
            className={verified ? 'active' : ''}
            type="button"
            onClick={toggleVerified}
          >
            Empresas verificadas
          </button>
          <span>{total} oportunidades encontradas</span>
        </div>
        <div className="listing-geo" aria-label="Filtro por distância">
          <button
            type="button"
            className={`geo-button ${coords ? 'active' : ''}`}
            onClick={coords ? clearLocation : useMyLocation}
          >
            <LocateFixed size={15} />{' '}
            {coords ? 'Remover distância' : 'Usar minha localização'}
          </button>
          {coords && (
            <label>
              Raio
              <select
                value={radiusKm}
                onChange={(event) => changeRadius(Number(event.target.value))}
                aria-label="Raio de busca"
              >
                {RADIUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} km
                  </option>
                ))}
              </select>
            </label>
          )}
          {coords && <span className="geo-note">Ordenado por distância</span>}
          {geoError && (
            <span className="form-error" role="alert">
              {geoError}
            </span>
          )}
        </div>
        {(facets.categories.length > 0 || facets.states.length > 0) && (
          <div className="listing-facets" aria-label="Filtros rápidos">
            {facets.categories.map((facet) => (
              <button
                key={facet.id}
                type="button"
                className={categoryId === facet.id ? 'active' : ''}
                onClick={() => toggleCategory(facet.id)}
              >
                {facet.name} ({facet.total})
              </button>
            ))}
            {facets.states.map((facet) => (
              <button
                key={facet.value}
                type="button"
                className={state === facet.value ? 'active' : ''}
                onClick={() => toggleState(facet.value)}
              >
                {facet.value} ({facet.total})
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <div className="dashboard-loading">Carregando oportunidades...</div>
        ) : error ? (
          <div className="detail-error">
            <h2>{error}</h2>
            <button
              className="button"
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
            >
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
        {hasMore && !loading && (
          <div className="listing-pagination">
            <button type="button" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
