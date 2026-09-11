'use client';

import { ArrowLeft, Recycle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { SessionActions } from '../../../../components/session-actions';
import { api, ListingDetail, listingMediaUrl } from '../../../../lib/api';
import { formatMoney, formatQuantity } from '../../../../lib/format';

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_REVIEW: 'Em análise',
  PUBLISHED: 'Publicado',
  PAUSED: 'Pausado',
  NEGOTIATING: 'Em negociação',
  CLOSED: 'Encerrado',
  REJECTED: 'Rejeitado',
};

type OwnedListing = ListingDetail & { status: string };

export default function OwnedListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<OwnedListing | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function load() {
    return api
      .myListing(params.id)
      .then(({ listing: result }) => setListing(result));
  }

  useEffect(() => {
    if (!params.id) return;
    load()
      .catch(() => router.replace('/dashboard/anuncios'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photos.length) return;
    setSaving(true);
    setMessage('');
    try {
      await api.uploadListingPhotos(params.id, photos);
      await load();
      setPhotos([]);
      setMessage(
        'Fotos adicionadas. Alterações em anúncio publicado voltam para análise.',
      );
    } catch {
      setMessage(
        'Não foi possível adicionar as fotos. Verifique formato, tamanho e limite.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitReview() {
    setSaving(true);
    setMessage('');
    try {
      await api.submitListing(params.id);
      await load();
      setMessage('Anúncio enviado para análise.');
    } catch {
      setMessage('Não foi possível enviar o anúncio para análise.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !listing)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando anúncio...</div>
      </main>
    );

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/dashboard/anuncios">
            <ArrowLeft size={15} /> Voltar aos anúncios
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell owned-listing-detail">
        <p className="eyebrow">prévia do anúncio</p>
        <div className="owned-listing-heading">
          <div>
            <h1>{listing.title}</h1>
            <span
              className={`admin-user-status ${listing.status.toLowerCase()}`}
            >
              {statusLabels[listing.status] ?? listing.status}
            </span>
          </div>
          {listing.status === 'PUBLISHED' && (
            <a className="button small" href={`/anuncios/${listing.slug}`}>
              Abrir página pública
            </a>
          )}
        </div>
        <div className="owned-media-grid">
          {listing.media.map((media) => (
            <img
              key={media.id}
              src={listingMediaUrl(media.id, true)}
              alt={media.altText || listing.title}
            />
          ))}
          {listing.media.length === 0 && (
            <div className="empty-panel">Nenhuma foto adicionada.</div>
          )}
        </div>
        <article className="detail-main-card">
          <div className="detail-price">
            <span>Preço unitário</span>
            <strong>
              {listing.unitPrice
                ? formatMoney(listing.unitPrice, listing.currency)
                : 'A combinar'}
            </strong>
          </div>
          <p className="detail-description">
            {listing.description || 'Sem descrição.'}
          </p>
          <p>
            <strong>
              {formatQuantity(listing.availableQuantity)} {listing.unit}
            </strong>{' '}
            disponíveis
          </p>
          <form className="photo-upload-form" onSubmit={upload}>
            <label>
              Adicionar fotos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) =>
                  setPhotos(Array.from(event.target.files ?? []).slice(0, 5))
                }
              />
            </label>
            <button
              className="secondary-button small"
              disabled={saving || !photos.length}
            >
              Enviar fotos
            </button>
          </form>
          {listing.status === 'DRAFT' && (
            <button
              className="button small"
              type="button"
              disabled={saving}
              onClick={submitReview}
            >
              Enviar para análise
            </button>
          )}
          {message && (
            <p className="form-note" role="status">
              {message}
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
