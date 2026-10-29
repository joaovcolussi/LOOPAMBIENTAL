'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, Company, ListingFormValues } from '../../../../lib/api';
import { DashboardHeader } from '../../../../components/dashboard-header';
import { ListingForm } from '../../../../components/listing-form';
import {
  ListingDocumentPicker,
  MAX_LISTING_DOCUMENTS,
  PendingListingDocument,
} from '../../../../components/listing-documents';
import { listingDocumentTypeLabels } from '../../../../lib/labels';
import { formatDateOnly } from '../../../../lib/format';

export default function NewListingPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [documents, setDocuments] = useState<PendingListingDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .companies()
      .then(({ companies: result }) => setCompanies(result))
      .catch(() => router.replace('/entrar?next=/dashboard/anuncios/novo'))
      .finally(() => setLoading(false));
  }, [router]);

  async function submit(values: ListingFormValues) {
    const { listing } = await api.createListing(values);
    try {
      if (photos.length) await api.uploadListingPhotos(listing.id, photos);
      for (const document of documents)
        await api.uploadListingDocument(listing.id, document);
      await api.submitListing(listing.id);
    } catch {
      throw new Error('LISTING_SAVED_AS_DRAFT');
    }
    router.push('/dashboard/anuncios?created=review');
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando formulário...</div>
      </main>
    );
  if (!companies.length)
    return (
      <main className="dashboard-page">
        <DashboardHeader />
        <section className="company-content shell">
          <p className="eyebrow">novo anúncio</p>
          <h1>Crie sua empresa primeiro</h1>
          <p className="dashboard-lede">
            Para publicar um anúncio, sua conta precisa estar vinculada a uma
            empresa. Cadastre os dados da empresa e volte aqui.
          </p>
          <a className="button" href="/dashboard/empresa">
            Criar empresa <ArrowRight size={16} />
          </a>
        </section>
      </main>
    );
  return (
    <main className="dashboard-page">
      <DashboardHeader />
      <section className="company-content shell">
        <p className="eyebrow">novo anúncio</p>
        <h1>Coloque um material em movimento.</h1>
        <p className="dashboard-lede">
          Descreva o que sua empresa quer comprar ou vender.
        </p>
        <ListingForm
          companies={companies}
          submitLabel="Enviar anúncio para análise"
          onSubmit={submit}
        >
          <label>
            Fotos do anúncio
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) =>
                setPhotos(Array.from(event.target.files ?? []).slice(0, 5))
              }
            />
            <span className="form-note">
              Até 5 fotos JPEG, PNG ou WebP, com no máximo 5 MB cada.
            </span>
          </label>
          {photos.length > 0 && (
            <div className="photo-selection" aria-live="polite">
              {photos.map((photo) => (
                <span key={`${photo.name}-${photo.lastModified}`}>
                  {photo.name}
                </span>
              ))}
            </div>
          )}
          <fieldset className="listing-document-fieldset">
            <legend>Laudos e documentos técnicos</legend>
            <p className="form-note">
              Anexe laudos de caracterização, análises laboratoriais, FDS ou
              especificações de referência. Os laudos ficam disponíveis apenas
              para usuários autenticados.
            </p>
            {documents.length > 0 && (
              <ul className="listing-document-list">
                {documents.map((document, index) => (
                  <li key={`${document.file.name}-${index}`}>
                    <div>
                      <strong>
                        {listingDocumentTypeLabels[document.type]}
                      </strong>
                      <span>
                        {document.file.name}
                        {document.validUntil
                          ? ` · válido até ${formatDateOnly(document.validUntil)}`
                          : ''}
                      </span>
                    </div>
                    <button
                      className="secondary-button small"
                      type="button"
                      onClick={() =>
                        setDocuments((current) =>
                          current.filter((_, position) => position !== index),
                        )
                      }
                    >
                      Remover
                      <span className="sr-only"> {document.file.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <ListingDocumentPicker
              remaining={MAX_LISTING_DOCUMENTS - documents.length}
              submitLabel="Adicionar laudo"
              onAdd={(document) =>
                setDocuments((current) => [...current, document])
              }
            />
          </fieldset>
        </ListingForm>
      </section>
    </main>
  );
}
