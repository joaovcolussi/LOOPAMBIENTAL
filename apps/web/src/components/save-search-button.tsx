'use client';

import { FormEvent, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { api, isAuthenticationError, SavedSearchFilters } from '../lib/api';

export function SaveSearchButton({ filters }: { filters: SavedSearchFilters }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'NONE'>(
    'DAILY',
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const hasFilters = Boolean(
    filters.q || filters.type || filters.categoryId || filters.state,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.createSavedSearch({ name, filters, frequency });
      setMessage('Busca salva. Você será avisado sobre novos anúncios.');
      setName('');
      setOpen(false);
    } catch (caught) {
      if (isAuthenticationError(caught))
        setError('Entre na sua conta para salvar a busca.');
      else setError('Não foi possível salvar a busca. Confira o nome.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="save-search">
      <button
        className="secondary-button small"
        type="button"
        disabled={!hasFilters}
        title={hasFilters ? undefined : 'Aplique um filtro antes de salvar'}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Bookmark size={15} /> Salvar busca
      </button>
      {message && (
        <p className="form-note" role="status">
          {message}
        </p>
      )}
      {open && (
        <form className="save-search-form" onSubmit={submit}>
          <label>
            Nome da busca
            <input
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: PET cristal em SP"
            />
          </label>
          <label>
            Frequência do alerta
            <select
              value={frequency}
              onChange={(event) =>
                setFrequency(event.target.value as 'DAILY' | 'WEEKLY' | 'NONE')
              }
            >
              <option value="DAILY">Diário</option>
              <option value="WEEKLY">Semanal</option>
              <option value="NONE">Sem alerta</option>
            </select>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button small" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      )}
    </div>
  );
}
