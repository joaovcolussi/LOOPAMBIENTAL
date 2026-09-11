'use client';

import { ArrowRight, BadgeCheck, MapPin } from 'lucide-react';
import { FavoriteButton } from './favorite-button';
import { ListingCard as ListingCardType, listingMediaUrl } from '../lib/api';
import { formatMoney, formatQuantity } from '../lib/format';

const frequencyLabels: Record<string, string> = {
  ONE_TIME: 'operação única',
  WEEKLY: 'semanal',
  MONTHLY: 'mensal',
  CONTINUOUS: 'contínuo',
};

const categoryImages: Record<string, string> = {
  plastico: '/products/pet.svg',
  metais: '/products/aluminio.svg',
  'papel-papelao': '/products/papelao.svg',
  vidro: '/products/vidro.svg',
  madeira: '/products/madeira.svg',
};

type Props = {
  listing: ListingCardType;
  initialFavorite?: boolean;
  showFavorite?: boolean;
  ownerView?: boolean;
};

export function ListingCard({
  listing,
  initialFavorite = false,
  showFavorite = true,
  ownerView = false,
}: Props) {
  const price = listing.unitPrice
    ? formatMoney(listing.unitPrice, listing.currency)
    : 'A combinar';
  const company = listing.company.tradeName || listing.company.legalName;
  const image = listing.media[0];
  const href = ownerView
    ? `/dashboard/anuncios/${listing.id}`
    : `/anuncios/${listing.slug}`;

  return (
    <article className="listing">
      <a
        className={`listing-image ${listing.type === 'BUY' ? 'sand' : 'mint'}`}
        href={href}
        aria-label={`Abrir ${listing.title}`}
      >
        <img
          src={
            image
              ? listingMediaUrl(image.id, ownerView)
              : categoryImages[listing.category.slug] || '/products/pet.svg'
          }
          alt={
            image?.altText ||
            `Ilustração de ${listing.material?.name || listing.title}`
          }
          loading="lazy"
        />
        <span
          className={`listing-type ${listing.type === 'BUY' ? 'compra' : 'venda'}`}
        >
          {listing.type === 'BUY' ? 'COMPRA' : 'VENDA'}
        </span>
      </a>
      <div className="listing-body">
        <div className="listing-meta">
          <span>{company}</span>
          {listing.company.verification === 'VERIFIED' && (
            <span className="verified">
              <BadgeCheck size={13} /> verificada
            </span>
          )}
        </div>
        <p className="listing-publisher">
          Publicado por {listing.createdBy.name}
        </p>
        <h2>
          <a className="listing-title-link" href={href}>
            {listing.title}
          </a>
        </h2>
        <div className="listing-detail">
          <span>
            {formatQuantity(listing.availableQuantity)} {listing.unit}
          </span>
          <span>
            <MapPin size={14} /> {listing.city || 'Local não informado'}
            {listing.state ? `, ${listing.state}` : ''}
          </span>
        </div>
        <div className="listing-card-price">
          <strong>{price}</strong>
          <span>{frequencyLabels[listing.frequency] || listing.frequency}</span>
        </div>
        <div className="listing-footer">
          <span>{listing.material?.name || listing.category.name}</span>
          <div className="listing-actions">
            {showFavorite && (
              <FavoriteButton
                listingId={listing.id}
                listingSlug={listing.slug}
                initialFavorite={initialFavorite}
              />
            )}
            <a className="interest-link" href={href}>
              Ver detalhes <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
