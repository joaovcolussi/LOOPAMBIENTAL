'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { api, ModerationCase, moderationMediaUrl } from '../../../lib/api';
import { AdminNav } from '../../../components/admin-nav';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { formatMoney, formatQuantity } from '../../../lib/format';
import { label, listingTypeLabels } from '../../../lib/labels';

export default function ModerationPage() {
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');
  const [rejectTarget, setRejectTarget] = useState<ModerationCase | null>(null);

  useEffect(() => {
    api
      .moderationCases()
      .then(({ cases: result }) => setCases(result))
      .catch(() =>
        setError('Acesso restrito ou não foi possível carregar a fila.'),
      )
      .finally(() => setLoading(false));
  }, []);

  async function approve(id: string) {
    setActingId(id);
    setError('');
    try {
      await api.approveModeration(id);
      setCases((current) => current.filter((item) => item.id !== id));
    } catch {
      setError(
        'Não foi possível aprovar. O caso pode ter sido decidido por outra pessoa.',
      );
    } finally {
      setActingId('');
    }
  }
  async function confirmReject(reason: string) {
    const item = rejectTarget;
    if (!item) return;
    setActingId(item.id);
    setError('');
    try {
      await api.rejectModeration(item.id, reason);
      setCases((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
      setRejectTarget(null);
    } catch {
      setError(
        'Não foi possível rejeitar. Confira o motivo ou atualize a fila.',
      );
    } finally {
      setActingId('');
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando fila...</div>
      </main>
    );
  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">administração</p>
        <h1>Fila de moderação</h1>
        <p className="dashboard-lede">
          Revise anúncios antes que apareçam publicamente.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="moderation-list">
          {cases.length === 0 ? (
            <div className="empty-panel">
              Nenhum anúncio aguardando revisão.
            </div>
          ) : (
            cases.map((item) => (
              <article className="moderation-card" key={item.id}>
                <div>
                  {item.listing.media.length > 0 && (
                    <div className="moderation-media-grid">
                      {item.listing.media.map((media) => (
                        <img
                          className="moderation-thumbnail"
                          key={media.id}
                          src={moderationMediaUrl(media.id)}
                          alt={media.altText || item.listing.title}
                        />
                      ))}
                    </div>
                  )}
                  <span className="dashboard-number">
                    {label(listingTypeLabels, item.listing.type)}
                  </span>
                  <h2>{item.listing.title}</h2>
                  <p>
                    {item.listing.company.tradeName ||
                      item.listing.company.legalName}{' '}
                    · {item.listing.category.name}
                  </p>
                  <p>
                    {item.listing.description || 'Sem descrição adicional.'}
                  </p>
                  <div className="moderation-facts">
                    <span>
                      {formatQuantity(item.listing.quantity)}{' '}
                      {item.listing.unit}
                    </span>
                    <span>
                      {item.listing.unitPrice
                        ? formatMoney(
                            item.listing.unitPrice,
                            item.listing.currency,
                          )
                        : 'Preço a combinar'}
                    </span>
                    <span>
                      {item.listing.city
                        ? `${item.listing.city}, ${item.listing.state}`
                        : 'Local não informado'}
                    </span>
                    <span>
                      {item.listing.riskClassification === 'HAZARDOUS'
                        ? 'Resíduo perigoso'
                        : 'Resíduo não perigoso/não informado'}
                    </span>
                    <span>
                      {item.listing.requiresDocuments
                        ? 'Exige documentos'
                        : 'Sem exigência documental'}
                    </span>
                    <span>
                      {item.listing.ownTransport
                        ? 'Possui transporte próprio'
                        : 'Sem transporte próprio informado'}
                    </span>
                  </div>
                  <small>
                    Enviado em{' '}
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </small>
                </div>
                <div className="moderation-actions">
                  <button
                    className="approve-button"
                    disabled={actingId === item.id}
                    onClick={() => approve(item.id)}
                  >
                    <Check size={15} /> Aprovar
                  </button>
                  <button
                    className="reject-button"
                    disabled={actingId === item.id}
                    onClick={() => setRejectTarget(item)}
                  >
                    <X size={15} /> Rejeitar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Rejeitar anúncio"
        description={
          rejectTarget
            ? `Informe o motivo da rejeição de “${rejectTarget.listing.title}”. O motivo fica registrado para a empresa.`
            : undefined
        }
        confirmLabel="Rejeitar anúncio"
        tone="danger"
        requireReason
        reasonLabel="Motivo da rejeição"
        reasonPlaceholder="Descreva o que precisa ser corrigido"
        pending={Boolean(rejectTarget) && actingId === rejectTarget?.id}
        onConfirm={confirmReject}
        onCancel={() => setRejectTarget(null)}
      />
    </main>
  );
}
