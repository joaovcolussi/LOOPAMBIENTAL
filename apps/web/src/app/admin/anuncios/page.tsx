'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, AdminListingRow } from '../../../lib/api';
import { AdminNav } from '../../../components/admin-nav';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { TableLoadingRow } from '../../../components/table-loading-row';
import { listingStatusLabels, listingTypeLabels } from '../../../lib/labels';

export default function AdminListingsPage() {
  const [listings, setListings] = useState<AdminListingRow[]>([]);
  const [queryInput, setQueryInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');
  const [takeDownTarget, setTakeDownTarget] = useState<AdminListingRow | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .adminListings({
        q: q || undefined,
        status: status || undefined,
        type: type || undefined,
        pageSize: 25,
      })
      .then((result) => {
        if (!active) return;
        setListings(result.listings);
        setCursor(result.pagination.nextCursor);
        setHasMore(result.pagination.hasMore);
        setTotal(result.pagination.total);
      })
      .catch(() => {
        if (active)
          setError('Acesso restrito ou não foi possível carregar os anúncios.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, status, type]);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await api.adminListings({
        q: q || undefined,
        status: status || undefined,
        type: type || undefined,
        cursor,
        pageSize: 25,
      });
      setListings((current) => [...current, ...result.listings]);
      setCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch {
      setError('Não foi possível carregar mais anúncios.');
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQ(queryInput.trim());
  }

  async function confirmTakeDown(reason: string) {
    const listing = takeDownTarget;
    if (!listing) return;
    setActingId(listing.id);
    setError('');
    try {
      await api.adminTakeDownListing(listing.id, reason.trim());
      setListings((current) =>
        current.map((item) =>
          item.id === listing.id ? { ...item, status: 'ARCHIVED' } : item,
        ),
      );
      setTakeDownTarget(null);
    } catch {
      setError('Não foi possível remover o anúncio.');
    } finally {
      setActingId('');
    }
  }

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">administração</p>
        <h1>Anúncios</h1>
        <p className="dashboard-lede">
          Todos os anúncios da plataforma, em qualquer status. {total}{' '}
          anúncio(s).
        </p>
        <form className="admin-filter-bar" onSubmit={submitSearch}>
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Buscar por título ou descrição"
            aria-label="Buscar anúncios"
          />
          <button className="button small" type="submit">
            Buscar
          </button>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            {Object.entries(listingStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filtrar por tipo"
          >
            <option value="">Compra e venda</option>
            <option value="BUY">Compra</option>
            <option value="SELL">Venda</option>
          </select>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Anúncio</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Local</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && listings.length === 0 && (
                <TableLoadingRow colSpan={5} />
              )}
              {listings.map((listing) => (
                <tr key={listing.id}>
                  <td>
                    <a href={`/anuncios/${listing.slug}`}>{listing.title}</a>
                    <small>
                      {listing.company.tradeName || listing.company.legalName} ·{' '}
                      {listing.category.name}
                    </small>
                  </td>
                  <td>{listingTypeLabels[listing.type] ?? listing.type}</td>
                  <td>
                    {listingStatusLabels[listing.status] ?? listing.status}
                  </td>
                  <td>
                    {listing.city
                      ? `${listing.city}${listing.state ? `/${listing.state}` : ''}`
                      : '—'}
                  </td>
                  <td>
                    <button
                      className="reject-button"
                      type="button"
                      disabled={
                        actingId === listing.id || listing.status === 'ARCHIVED'
                      }
                      onClick={() => setTakeDownTarget(listing)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && listings.length === 0 && (
          <div className="empty-panel">Nenhum anúncio encontrado.</div>
        )}
        {hasMore && (
          <div className="admin-load-more">
            <button
              className="secondary-button"
              type="button"
              disabled={loading}
              onClick={loadMore}
            >
              {loading ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}
      </section>
      <ConfirmDialog
        open={Boolean(takeDownTarget)}
        title="Remover anúncio"
        description={
          takeDownTarget
            ? `O anúncio “${takeDownTarget.title}” será arquivado e deixará de aparecer na busca.`
            : undefined
        }
        confirmLabel="Remover anúncio"
        tone="danger"
        requireReason
        reasonLabel="Motivo da remoção"
        reasonPlaceholder="Ex.: conteúdo irregular ou denúncia confirmada"
        pending={Boolean(takeDownTarget) && actingId === takeDownTarget?.id}
        onConfirm={confirmTakeDown}
        onCancel={() => setTakeDownTarget(null)}
      />
    </main>
  );
}
