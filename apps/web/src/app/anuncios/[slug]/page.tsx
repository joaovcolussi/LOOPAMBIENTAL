'use client';

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Mail,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { api, isAuthenticationError, ListingDetail } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';
import { FavoriteButton } from '../../../components/favorite-button';

const frequencyLabels: Record<string, string> = {
  ONE_TIME: 'Operação única',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  CONTINUOUS: 'Contínuo',
};

const riskLabels: Record<string, string> = {
  NON_HAZARDOUS: 'Não perigoso',
  HAZARDOUS: 'Perigoso',
  UNKNOWN: 'Não informado',
};

const visibilityLabels: Record<string, string> = {
  PUBLIC: 'Contato público',
  MEMBERS: 'Contato disponível para participantes',
  PRIVATE: 'Contato confidencial',
};

export default function ListingDetailPage() {
  const params = useParams<{ slug: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState(false);
  const [companies, setCompanies] = useState<
    { id: string; legalName: string; tradeName: string | null }[]
  >([]);
  const [companyId, setCompanyId] = useState('');
  const [proposalQuantity, setProposalQuantity] = useState('');
  const [proposalPrice, setProposalPrice] = useState('');
  const [proposalNotes, setProposalNotes] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [companyError, setCompanyError] = useState('');

  useEffect(() => {
    if (!params.slug) return;
    api
      .listingBySlug(params.slug)
      .then(({ listing: result }) => setListing(result))
      .catch(() => setError(true));
    api
      .companies()
      .then(({ companies: result }) => {
        setCompanies(result);
        setCompanyId(result[0]?.id ?? '');
      })
      .catch((caught) => {
        if (isAuthenticationError(caught)) {
          setCompanyError('Entre na sua conta para selecionar sua empresa.');
        } else {
          setCompanyError('Não foi possível carregar suas empresas.');
        }
      });
  }, [params.slug]);

  if (!listing && !error)
    return (
      <main className="detail-page">
        <div className="dashboard-loading">Carregando oportunidade...</div>
      </main>
    );

  if (error || !listing)
    return (
      <main className="detail-page">
        <div className="detail-error shell">
          <p className="eyebrow">oportunidade indisponível</p>
          <h1>Este anúncio não está mais publicado.</h1>
          <a className="button" href="/anuncios">
            Voltar para oportunidades
          </a>
        </div>
      </main>
    );

  const contact = listing.company.contact;
  const price = listing.unitPrice
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: listing.currency,
      }).format(Number(listing.unitPrice))
    : 'A combinar';
  const whatsapp = contact?.whatsapp?.replace(/\D/g, '');
  const proposalAction =
    listing.type === 'SELL'
      ? 'Enviar proposta de compra'
      : 'Enviar oferta de venda';

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProposalMessage('');
    if (!listing) {
      setProposalMessage('Oportunidade não encontrada.');
      return;
    }
    if (!companyId) {
      setProposalMessage(
        'Entre na sua conta e cadastre uma empresa para enviar uma proposta.',
      );
      return;
    }
    try {
      await api.createProposal({
        listingId: listing.id,
        proposerCompanyId: companyId,
        quantity: proposalQuantity,
        unitPrice: proposalPrice,
        notes: proposalNotes || undefined,
      });
      setProposalMessage(
        'Proposta enviada. A empresa anunciante será notificada.',
      );
    } catch {
      setProposalMessage(
        'Não foi possível enviar a proposta. Confira os dados e sua permissão.',
      );
    }
  }

  return (
    <main className="detail-page">
      <nav className="nav shell">
        <a className="brand" href="/">
          LOOP <span>AMBIENTAL</span>
        </a>
        <div className="nav-actions">
          <SessionActions />
        </div>
      </nav>
      <section className="detail-layout shell">
        <a className="back-link" href="/anuncios">
          <ArrowLeft size={15} /> Voltar para oportunidades
        </a>
        <div className="detail-header">
          <div>
            <p className="eyebrow">
              {listing.type === 'BUY'
                ? 'empresa compradora'
                : 'empresa vendedora'}
            </p>
            <h1>{listing.title}</h1>
            <p className="detail-company">
              {listing.company.tradeName || listing.company.legalName}
              {listing.company.verification === 'VERIFIED' && (
                <span>
                  <BadgeCheck size={15} /> Verificada
                </span>
              )}
            </p>
            <p className="detail-publisher">
              {listing.type === 'BUY'
                ? 'Compra publicada por'
                : 'Venda publicada por'}{' '}
              <strong>{listing.createdBy.name}</strong>
            </p>
          </div>
          <a className="button" href="#proposal-form">
            {proposalAction} <ArrowRight size={17} />
          </a>
          <FavoriteButton
            checkCurrent
            listingId={listing.id}
            listingSlug={listing.slug}
          />
        </div>
        <div className="detail-grid">
          <article className="detail-main-card">
            <div className="detail-price">
              <span>Preço unitário</span>
              <strong>
                {price}
                <small> / {listing.unit}</small>
              </strong>
            </div>
            <p className="detail-description">
              {listing.description ||
                'O anunciante ainda não informou detalhes adicionais.'}
            </p>
            <div className="detail-facts">
              <div>
                <span>Quantidade</span>
                <strong>
                  {listing.quantity} {listing.unit}
                </strong>
              </div>
              <div>
                <span>Disponível</span>
                <strong>
                  {listing.availableQuantity} {listing.unit}
                </strong>
              </div>
              <div>
                <span>Frequência</span>
                <strong>
                  {frequencyLabels[listing.frequency] || listing.frequency}
                </strong>
              </div>
              <div>
                <span>Classificação</span>
                <strong>
                  {riskLabels[listing.riskClassification] ||
                    listing.riskClassification}
                </strong>
              </div>
              <div>
                <span>Origem</span>
                <strong>{listing.originDetails || 'Não informado'}</strong>
              </div>
              <div>
                <span>Transporte próprio</span>
                <strong>
                  {listing.ownTransport ? 'Sim' : 'Não informado'}
                </strong>
              </div>
              <div>
                <span>Exige documentos</span>
                <strong>{listing.requiresDocuments ? 'Sim' : 'Não'}</strong>
              </div>
              <div>
                <span>Publicado em</span>
                <strong>
                  {new Date(listing.createdAt).toLocaleDateString('pt-BR')}
                </strong>
              </div>
            </div>
            <div className="detail-location">
              <MapPin size={18} />
              <span>
                {listing.city || 'Localização'}
                {listing.state ? `, ${listing.state}` : ''}
              </span>
            </div>
            <form
              className="proposal-form"
              id="proposal-form"
              onSubmit={submitProposal}
            >
              <div>
                <p className="eyebrow">negociação</p>
                <h2>{proposalAction}</h2>
              </div>
              {companies.length > 0 ? (
                <label>
                  Sua empresa
                  <select
                    required
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
                  >
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.tradeName || company.legalName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="form-note">
                  {companyError ||
                    'Entre para selecionar sua empresa e negociar.'}{' '}
                  <a
                    className="text-link"
                    href={`/entrar?next=/anuncios/${listing.slug}`}
                  >
                    Entrar
                  </a>
                </p>
              )}
              <div className="form-row">
                <label>
                  Quantidade
                  <input
                    required
                    value={proposalQuantity}
                    onChange={(event) =>
                      setProposalQuantity(event.target.value)
                    }
                    placeholder={`Ex.: ${listing.availableQuantity}`}
                  />
                </label>
                <label>
                  Preço unitário
                  <input
                    required
                    value={proposalPrice}
                    onChange={(event) => setProposalPrice(event.target.value)}
                    placeholder={listing.unitPrice || 'A combinar'}
                  />
                </label>
              </div>
              <label>
                Mensagem
                <textarea
                  rows={3}
                  value={proposalNotes}
                  onChange={(event) => setProposalNotes(event.target.value)}
                  placeholder="Inclua prazo, retirada ou condições."
                />
              </label>
              {proposalMessage && (
                <p className="form-note" role="status">
                  {proposalMessage}
                </p>
              )}
              <button className="button" type="submit">
                {proposalAction} <ArrowRight size={16} />
              </button>
            </form>
          </article>
          <aside className="seller-card">
            <p className="eyebrow">
              {listing.type === 'BUY'
                ? 'empresa compradora'
                : 'empresa vendedora'}
            </p>
            <h2>{listing.company.tradeName || listing.company.legalName}</h2>
            <p className="seller-status">
              {listing.company.verification === 'VERIFIED' ? (
                <>
                  <BadgeCheck size={16} /> Empresa verificada na plataforma
                </>
              ) : (
                'Empresa ainda não verificada'
              )}
            </p>
            {(listing.company.description || listing.company.city) && (
              <div className="company-profile">
                {listing.company.description && (
                  <p>{listing.company.description}</p>
                )}
                {listing.company.city && (
                  <span>
                    <MapPin size={15} /> {listing.company.city}
                    {listing.company.state ? `, ${listing.company.state}` : ''}
                  </span>
                )}
              </div>
            )}
            {contact ? (
              <div className="seller-contact">
                <h3>Contato para negociação</h3>
                {contact.name && (
                  <p>
                    <strong>Responsável:</strong> {contact.name}
                  </p>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`}>
                    <Mail size={15} /> {contact.email}
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={15} /> WhatsApp comercial
                  </a>
                )}
                {(contact.addressLine || contact.addressDistrict) && (
                  <p>
                    <MapPin size={15} />{' '}
                    {[
                      contact.addressLine,
                      contact.addressNumber,
                      contact.addressDistrict,
                      contact.addressPostalCode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="private-contact">
                <strong>
                  {visibilityLabels[listing.company.contactVisibility] ||
                    'Contato confidencial'}
                </strong>
                <p>
                  A empresa e seu papel comercial aparecem para você. E-mail,
                  telefone e endereço detalhado ficam protegidos conforme as
                  regras de privacidade da negociação.
                </p>
                <a
                  className="text-link"
                  href={companies.length > 0 ? '#proposal-form' : '/entrar'}
                >
                  {companies.length > 0
                    ? 'Ver negociação'
                    : 'Entrar para negociar'}{' '}
                  <ArrowRight size={15} />
                </a>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
