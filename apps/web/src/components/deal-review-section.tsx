'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, Review } from '../lib/api';

export function DealReviewSection({
  dealId,
  companyIds,
  myCompany,
}: {
  dealId: string;
  companyIds: string[];
  myCompany: string;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .dealReviews(dealId)
      .then(({ reviews: result }) => setReviews(result))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [dealId]);

  const myReview = reviews.find(
    (review) => review.authorCompany.id === myCompany,
  );
  const hasMyCompany = companyIds.includes(myCompany);

  async function submit() {
    setSaving(true);
    setMessage('');
    try {
      const created = await api.createReview(dealId, {
        rating,
        comment: comment.trim() || undefined,
        authorCompanyId: myCompany,
      });
      setReviews((current) => [created, ...current]);
      setMessage('Avaliação registrada.');
    } catch {
      setMessage('Não foi possível registrar a avaliação.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="deal-review" aria-labelledby="deal-review-title">
      <h2 id="deal-review-title">Avaliação da negociação</h2>
      {loading ? (
        <p className="form-note">Carregando avaliações...</p>
      ) : myReview ? (
        <p className="form-note">
          Sua avaliação foi registrada com{' '}
          {Array.from({ length: myReview.rating }).map((_, index) => (
            <Star key={index} size={14} fill="currentColor" />
          ))}
        </p>
      ) : hasMyCompany ? (
        <div className="review-form">
          <div className="review-stars" role="radiogroup" aria-label="Nota">
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
          <button
            className="button small"
            type="button"
            disabled={saving}
            onClick={submit}
          >
            {saving ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </div>
      ) : (
        <p className="form-note">
          Somente as empresas participantes podem avaliar esta negociação.
        </p>
      )}
      {message && (
        <p className="form-note" role="status">
          {message}
        </p>
      )}
      {reviews.length > 0 && (
        <div className="review-list">
          {reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div className="review-card-head">
                <div
                  className="review-stars"
                  aria-label={`Nota ${review.rating} de 5`}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      size={15}
                      fill={value <= review.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <small>
                  {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                </small>
              </div>
              {review.comment && <p>{review.comment}</p>}
              <small>
                por{' '}
                {review.authorCompany.tradeName ||
                  review.authorCompany.legalName}
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
