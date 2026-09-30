'use client';

import { useEffect, useState } from 'react';
import { Recycle, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, PendingReview } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

export default function ReviewsPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDeal, setActiveDeal] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api
      .pendingReviews()
      .then(({ pending: result }) => setPending(result))
      .catch((caught) => {
        if (
          caught instanceof Error &&
          caught.message === 'AUTHENTICATION_REQUIRED'
        ) {
          router.replace('/entrar?next=/dashboard/avaliacoes');
          return;
        }
        setError('Não foi possível carregar as avaliações pendentes.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  function startReview(item: PendingReview) {
    setActiveDeal(item.dealId);
    setRating(5);
    setComment('');
    setError('');
    setNotice('');
  }

  async function submit(item: PendingReview) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.createReview(item.dealId, {
        rating,
        comment: comment.trim() || undefined,
        authorCompanyId: item.authorCompany.id,
      });
      setPending((current) =>
        current.filter((entry) => entry.dealId !== item.dealId),
      );
      setActiveDeal('');
      setNotice('Avaliação registrada. Obrigado!');
    } catch {
      setError('Não foi possível registrar a avaliação.');
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando avaliações...</div>
      </main>
    );

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
        <p className="eyebrow">reputação</p>
        <h1>Avaliações</h1>
        <p className="dashboard-lede">
          Avalie as empresas parceiras após concluir uma negociação.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="form-note" role="status">
            {notice}
          </p>
        )}
        {pending.length === 0 ? (
          <div className="empty-panel">
            Nenhuma avaliação pendente. Conclua uma negociação para avaliar a
            outra parte.
          </div>
        ) : (
          <div className="reviews-pending">
            {pending.map((item) => {
              const isActive = activeDeal === item.dealId;
              return (
                <article
                  className="favorite-card"
                  key={`${item.dealId}-${item.authorCompany.id}`}
                >
                  <div>
                    <span className="dashboard-number">
                      {item.listing.title}
                    </span>
                    <h2>
                      Avaliar{' '}
                      {item.reviewedCompany.tradeName ||
                        item.reviewedCompany.legalName}
                    </h2>
                    <p>
                      Como{' '}
                      <strong>
                        {item.authorCompany.tradeName ||
                          item.authorCompany.legalName}
                      </strong>{' '}
                      · concluída em{' '}
                      {new Date(item.completedAt).toLocaleDateString('pt-BR')}
                    </p>
                    {isActive ? (
                      <div className="review-form">
                        <div
                          className="review-stars"
                          role="radiogroup"
                          aria-label="Nota"
                        >
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={rating === value}
                              aria-label={`${value} de 5`}
                              className={value <= rating ? 'active' : ''}
                              onClick={() => setRating(value)}
                            >
                              <Star
                                size={18}
                                fill={value <= rating ? 'currentColor' : 'none'}
                              />
                            </button>
                          ))}
                        </div>
                        <label>
                          Comentário (opcional)
                          <textarea
                            rows={3}
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            placeholder="Como foi a negociação?"
                          />
                        </label>
                        <div className="moderation-actions">
                          <button
                            className="button small"
                            type="button"
                            disabled={saving}
                            onClick={() => submit(item)}
                          >
                            {saving ? 'Enviando...' : 'Enviar avaliação'}
                          </button>
                          <button
                            className="secondary-button small"
                            type="button"
                            disabled={saving}
                            onClick={() => setActiveDeal('')}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="button small"
                        type="button"
                        onClick={() => startReview(item)}
                      >
                        Avaliar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
