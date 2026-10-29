'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardHeader } from '../../../../../components/dashboard-header';
import { ListingForm } from '../../../../../components/listing-form';
import {
  api,
  Company,
  isAuthenticationError,
  ListingDetail,
  ListingFormValues,
} from '../../../../../lib/api';
import { label, listingStatusLabels } from '../../../../../lib/labels';

const NOT_EDITABLE = ['CLOSED', 'ARCHIVED'];

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<
    (ListingDetail & { status: string }) | null
  >(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.id) return;
    Promise.all([api.myListing(params.id), api.companies()])
      .then(([listingResult, companyResult]) => {
        setListing(listingResult.listing);
        setCompanies(companyResult.companies);
      })
      .catch((caught) => {
        if (isAuthenticationError(caught)) {
          router.replace(
            `/entrar?next=/dashboard/anuncios/${params.id}/editar`,
          );
          return;
        }
        setError('Anúncio não encontrado ou sem permissão de edição.');
      });
  }, [params.id, router]);

  async function submit(values: ListingFormValues) {
    if (!listing) return;
    const negotiating = listing.status === 'NEGOTIATING';
    // Only send what the API accepts for the current status; the company of a
    // listing never changes.
    const { companyId: _companyId, ...rest } = values;
    void _companyId;
    const payload: Partial<ListingFormValues> = negotiating
      ? {
          title: rest.title,
          description: rest.description ?? '',
          frequency: rest.frequency,
          riskClassification: rest.riskClassification,
          originDetails: rest.originDetails ?? '',
          ownTransport: rest.ownTransport,
          requiresDocuments: rest.requiresDocuments,
          city: rest.city,
          state: rest.state,
          attributes: rest.attributes,
        }
      : {
          ...rest,
          description: rest.description ?? '',
          originDetails: rest.originDetails ?? '',
          materialId: rest.materialId ?? '',
          unitPrice: rest.unitPrice ?? '',
        };
    await api.updateListing(listing.id, payload);
    router.push(`/dashboard/anuncios/${listing.id}?updated=1`);
  }

  return (
    <main className="dashboard-page">
      <DashboardHeader
        backHref={
          listing ? `/dashboard/anuncios/${listing.id}` : '/dashboard/anuncios'
        }
        backLabel="Voltar ao anúncio"
      />
      <section className="company-content shell">
        <p className="eyebrow">editar anúncio</p>
        <h1>{listing ? listing.title : 'Carregando anúncio...'}</h1>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {listing && NOT_EDITABLE.includes(listing.status) && (
          <p className="form-error" role="alert">
            Anúncios {label(listingStatusLabels, listing.status).toLowerCase()}{' '}
            não podem ser editados.
          </p>
        )}
        {listing && !NOT_EDITABLE.includes(listing.status) && (
          <>
            <p className="dashboard-lede">
              Status atual: {label(listingStatusLabels, listing.status)}.
              {listing.status === 'PUBLISHED' &&
                ' Ao salvar, o anúncio volta para análise da moderação antes de reaparecer na busca.'}
              {listing.status === 'NEGOTIATING' &&
                ' Há uma negociação em andamento: tipo, categoria, quantidade e preço ficam bloqueados.'}
            </p>
            <ListingForm
              companies={companies}
              initial={listing}
              submitLabel="Salvar alterações"
              savingLabel="Salvando..."
              lockCommercialFields={listing.status === 'NEGOTIATING'}
              onSubmit={submit}
            />
          </>
        )}
      </section>
    </main>
  );
}
