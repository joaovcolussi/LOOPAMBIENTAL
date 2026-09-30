'use client';

import { FormEvent, useState } from 'react';
import { Flag } from 'lucide-react';
import { api, isAuthenticationError } from '../lib/api';

const reasons: { value: string; label: string }[] = [
  { value: 'MISLEADING', label: 'Informação enganosa' },
  { value: 'PRODUCT_QUALITY', label: 'Qualidade diferente do anunciado' },
  { value: 'CONTACT_ABUSE', label: 'Uso indevido de contato' },
  { value: 'SPAM', label: 'Spam ou propaganda' },
  { value: 'ILLEGAL', label: 'Atividade ilegal' },
  { value: 'HAZARDOUS', label: 'Resíduo perigoso sem controle' },
  { value: 'UNDOCUMENTED', label: 'Documentação ausente' },
  { value: 'OTHER', label: 'Outro' },
];

export function ReportButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('MISLEADING');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.createReport({
        targetType: 'LISTING',
        listingId,
        reason,
        details: details.trim() || undefined,
      });
      setSent(true);
      setOpen(false);
      setDetails('');
    } catch (caught) {
      if (isAuthenticationError(caught))
        setError('Entre na sua conta para registrar a denúncia.');
      else setError('Não foi possível registrar a denúncia.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="report-block">
      <button
        className="link-button report-toggle"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Flag size={14} /> Denunciar anúncio
      </button>
      {sent && (
        <p className="form-note" role="status">
          Denúncia registrada. Obrigado por ajudar a manter a plataforma segura.
        </p>
      )}
      {open && (
        <form className="report-form" onSubmit={submit}>
          <label>
            Motivo
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {reasons.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Detalhes (opcional)
            <textarea
              rows={3}
              maxLength={2000}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Descreva o problema"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="secondary-button small" disabled={sending}>
            {sending ? 'Enviando...' : 'Enviar denúncia'}
          </button>
        </form>
      )}
    </div>
  );
}
