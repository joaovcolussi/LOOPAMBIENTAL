'use client';

import { Download, FileText, Trash2 } from 'lucide-react';
import { FormEvent, useId, useState } from 'react';
import type { ListingDocument, ListingDocumentType } from '../lib/api';
import {
  formatDateOnly,
  formatFileSize,
  isDateOnlyExpired,
} from '../lib/format';
import { listingDocumentTypeLabels } from '../lib/labels';

export const MAX_LISTING_DOCUMENTS = 5;
export const MAX_LISTING_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const LISTING_DOCUMENT_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp';

export type PendingListingDocument = {
  file: File;
  type: ListingDocumentType;
  validUntil?: string;
};

type ListProps = {
  documents: ListingDocument[];
  hrefFor: (id: string) => string;
  onRemove?: (document: ListingDocument) => void;
  removingId?: string;
  emptyText?: string;
};

export function ListingDocumentList({
  documents,
  hrefFor,
  onRemove,
  removingId,
  emptyText = 'Nenhum laudo anexado.',
}: ListProps) {
  if (!documents.length) return <p className="form-note">{emptyText}</p>;
  return (
    <ul className="listing-document-list">
      {documents.map((document) => {
        const expired =
          document.validUntil !== null &&
          isDateOnlyExpired(document.validUntil);
        return (
          <li key={document.id}>
            <FileText size={18} aria-hidden="true" />
            <div>
              <strong>
                {listingDocumentTypeLabels[document.type] ?? document.type}
              </strong>
              <span>
                {document.fileName} · {formatFileSize(document.sizeBytes)}
              </span>
              {document.validUntil && (
                <span className={expired ? 'document-expired' : undefined}>
                  {expired ? 'Vencido em ' : 'Válido até '}
                  {formatDateOnly(document.validUntil)}
                </span>
              )}
            </div>
            <a
              className="secondary-button small"
              href={hrefFor(document.id)}
              download={document.fileName}
            >
              <Download size={15} aria-hidden="true" /> Baixar
              <span className="sr-only"> {document.fileName}</span>
            </a>
            {onRemove && (
              <button
                className="secondary-button small"
                type="button"
                disabled={removingId === document.id}
                onClick={() => onRemove(document)}
              >
                <Trash2 size={15} aria-hidden="true" /> Remover
                <span className="sr-only"> {document.fileName}</span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type PickerProps = {
  disabled?: boolean;
  remaining: number;
  submitLabel: string;
  onAdd: (document: PendingListingDocument) => void | Promise<void>;
};

/** Selects one report file with its type and optional validity date. */
export function ListingDocumentPicker({
  disabled,
  remaining,
  submitLabel,
  onAdd,
}: PickerProps) {
  const id = useId();
  const [type, setType] = useState<ListingDocumentType>('TECHNICAL_REPORT');
  const [validUntil, setValidUntil] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [error, setError] = useState('');

  async function add(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    if (!file) {
      setError('Selecione o arquivo do laudo.');
      return;
    }
    if (file.size > MAX_LISTING_DOCUMENT_BYTES) {
      setError('O arquivo excede 10 MB.');
      return;
    }
    await onAdd({ file, type, validUntil: validUntil || undefined });
    setFile(null);
    setValidUntil('');
    setInputKey((value) => value + 1);
  }

  const blocked = disabled || remaining <= 0;
  return (
    <div className="listing-document-picker">
      <div className="form-row">
        <label htmlFor={`${id}-type`}>
          Tipo de documento
          <select
            id={`${id}-type`}
            value={type}
            disabled={blocked}
            onChange={(event) =>
              setType(event.target.value as ListingDocumentType)
            }
          >
            {Object.entries(listingDocumentTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-valid`}>
          Validade (opcional)
          <input
            id={`${id}-valid`}
            type="date"
            value={validUntil}
            disabled={blocked}
            onChange={(event) => setValidUntil(event.target.value)}
          />
        </label>
      </div>
      <label htmlFor={`${id}-file`}>
        Arquivo do laudo
        <input
          key={inputKey}
          id={`${id}-file`}
          type="file"
          accept={LISTING_DOCUMENT_ACCEPT}
          disabled={blocked}
          aria-describedby={`${id}-hint`}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <span className="form-note" id={`${id}-hint`}>
        PDF, JPEG, PNG ou WebP com até 10 MB. Restam {Math.max(remaining, 0)} de{' '}
        {MAX_LISTING_DOCUMENTS} laudos.
      </span>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="secondary-button small"
        type="button"
        disabled={blocked || !file}
        onClick={() => void add()}
      >
        {submitLabel}
      </button>
    </div>
  );
}
