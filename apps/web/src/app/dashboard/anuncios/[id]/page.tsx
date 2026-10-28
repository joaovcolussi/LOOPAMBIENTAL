'use client';

import { ArrowLeft, Recycle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { SessionActions } from '../../../../components/session-actions';
import {
  api,
  ListingDetail,
  ListingDocument,
  listingDocumentUrl,
  listingMediaUrl,
} from '../../../../lib/api';
import {
  ListingDocumentList,
  ListingDocumentPicker,
  MAX_LISTING_DOCUMENTS,
  PendingListingDocument,
} from '../../../../components/listing-documents';
import { formatMoney, formatQuantity } from '../../../../lib/format';
import {
  listingReasonLabels,
  listingStatusLabels,
} from '../../../../lib/labels';

type OwnedListing = ListingDetail & { status: string };

export default function OwnedListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<OwnedListing | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [removingId, setRemovingId] = useState('');

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

  async function addDocument(document: PendingListingDocument) {
    setSaving(true);
    setMessage('');
    try {
      await api.uploadListingDocument(params.id, document);
      await load();
      setMessage(
        listing?.status === 'PUBLISHED'
          ? 'Laudo anexado. O anúncio voltou para análise da moderação.'
          : 'Laudo anexado.',
      );
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : '';
      setMessage(
        code === 'DOCUMENT_LIMIT_EXCEEDED'
          ? `Limite de ${MAX_LISTING_DOCUMENTS} laudos por anúncio atingido.`
          : code === 'INVALID_DOCUMENT_VALIDITY'
            ? 'Data de validade inválida.'
            : 'Não foi possível anexar o laudo. Envie PDF, JPEG, PNG ou WebP de até 10 MB.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeDocument(document: ListingDocument) {
    if (!window.confirm(`Remover o laudo "${document.fileName}"?`)) return;
    setRemovingId(document.id);
    setMessage('');
    try {
      await api.removeListingDocument(params.id, document.id);
      await load();
      setMessage('Laudo removido.');
    } catch {
      setMessage('Não foi possível remover o laudo.');
    } finally {
      setRemovingId('');
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
              {listingStatusLabels[listing.status] ?? listing.status}
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
          <section
            className="listing-document-section"
            aria-labelledby="documents-title"
          >
            <h2 id="documents-title">Laudos e documentos técnicos</h2>
            <ListingDocumentList
              documents={listing.documents}
              hrefFor={(id) => listingDocumentUrl(id, true)}
              onRemove={
                listing.status !== 'CLOSED' && listing.status !== 'ARCHIVED'
                  ? removeDocument
                  : undefined
              }
              removingId={removingId}
            />
            {listing.status !== 'CLOSED' && listing.status !== 'ARCHIVED' && (
              <ListingDocumentPicker
                disabled={saving}
                remaining={MAX_LISTING_DOCUMENTS - listing.documents.length}
                submitLabel="Anexar laudo"
                onAdd={addDocument}
              />
            )}
          </section>
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
        {listing.statusHistory.length > 0 && (
          <section className="status-timeline" aria-labelledby="history-title">
            <h2 id="history-title">Histórico de status</h2>
            <ol>
              {listing.statusHistory.map((entry) => (
                <li key={entry.id}>
                  <span
                    className={`status-dot ${entry.toStatus.toLowerCase()}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>
                      {listingStatusLabels[entry.toStatus] ?? entry.toStatus}
                    </strong>
                    <small>
                      {new Date(entry.createdAt).toLocaleString('pt-BR')}
                      {entry.actor ? ` · ${entry.actor.name}` : ''}
                    </small>
                    {entry.reason && (
                      <em>
                        {listingReasonLabels[entry.reason] ?? entry.reason}
                      </em>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </section>
    </main>
  );
}
