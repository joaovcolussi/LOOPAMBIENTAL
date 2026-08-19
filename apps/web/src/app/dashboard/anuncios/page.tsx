'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, AuthUser, ListingCard } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_REVIEW: 'Em análise',
  PUBLISHED: 'Publicado',
  PAUSED: 'Pausado',
  NEGOTIATING: 'Em negociação',
  CLOSED: 'Encerrado',
  EXPIRED: 'Expirado',
  REJECTED: 'Rejeitado',
  ARCHIVED: 'Arquivado',
};

export default function ListingsDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((result) => {
        setUser(result.user);
        return api.myListings();
      })
      .then(({ listings: result }) => {
        if (active) setListings(result);
      })
      .catch(() => router.replace('/entrar'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando anúncios...</div>
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
          Criar anúncio <ArrowRight size={15} />
        </a>
        {error && <p className="form-error">{error}</p>}
        {listings.length === 0 ? (
          <div className="empty-panel" style={{ marginTop: 24 }}>
            <h2>Nenhum anúncio ainda.</h2>
            <p>Crie seu primeiro anúncio para começar a negociar.</p>
          </div>
        ) : (
          <div className="admin-users-table-wrap" style={{ marginTop: 24 }}>
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Quantidade</th>
                  <th>Preço</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td>
                      <strong>{listing.title}</strong>
                    </td>
                    <td>{listing.type === 'BUY' ? 'Compra' : 'Venda'}</td>
                    <td>{listing.category.name}</td>
                    <td>
                      {listing.availableQuantity} {listing.unit}
                    </td>
                    <td>
                      {listing.unitPrice
                        ? `R$ ${Number(listing.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td>
                      <span
                        className={`admin-user-status ${listing.status.toLowerCase()}`}
                      >
                        {statusLabels[listing.status] ?? listing.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
