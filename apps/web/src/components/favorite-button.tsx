'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, isAuthenticationError } from '../lib/api';

type FavoriteButtonProps = {
  listingId: string;
  listingSlug: string;
  initialFavorite?: boolean;
  checkCurrent?: boolean;
};

export function FavoriteButton({
  listingId,
  listingSlug,
  initialFavorite = false,
  checkCurrent = false,
}: FavoriteButtonProps) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setFavorite(initialFavorite);
    if (checkCurrent) {
      api
        .favorites()
        .then(({ favorites }) =>
          setFavorite(favorites.some((item) => item.listing.id === listingId)),
        )
        .catch(() => undefined);
    }
  }, [checkCurrent, initialFavorite, listingId]);

  async function toggleFavorite() {
    if (pending) return;
    setPending(true);
    try {
      if (favorite) await api.removeFavorite(listingId);
      else await api.addFavorite(listingId);
      setFavorite((current) => !current);
    } catch (error) {
      if (isAuthenticationError(error)) {
        router.push(`/entrar?next=/anuncios/${listingSlug}`);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      aria-label={favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
      className={`favorite-button${favorite ? ' saved' : ''}`}
      disabled={pending}
      onClick={toggleFavorite}
      title={favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
      type="button"
    >
      <Heart size={15} fill={favorite ? 'currentColor' : 'none'} />
      <span>{pending ? 'Salvando...' : favorite ? 'Salvo' : 'Salvar'}</span>
    </button>
  );
}
