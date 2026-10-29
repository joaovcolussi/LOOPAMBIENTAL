'use client';

import { MaterialAttribute } from '../lib/api';

export type AttributeValues = Record<string, string>;

export function ListingAttributeFields({
  attributes,
  values,
  onChange,
  disabled = false,
}: {
  attributes: MaterialAttribute[];
  values: AttributeValues;
  onChange: (values: AttributeValues) => void;
  disabled?: boolean;
}) {
  if (attributes.length === 0) return null;
  const set = (id: string, value: string) =>
    onChange({ ...values, [id]: value });

  return (
    <fieldset className="listing-document-fieldset">
      <legend>Atributos técnicos</legend>
      <p className="form-note">
        Opcionais, mas ajudam compradores a filtrar e comparar materiais.
      </p>
      <div className="attribute-grid">
        {attributes.map((attribute) => {
          const label = attribute.unit
            ? `${attribute.label} (${attribute.unit})`
            : attribute.label;
          const value = values[attribute.id] ?? '';
          if (attribute.type === 'SELECT')
            return (
              <label key={attribute.id}>
                {label}
                <select
                  disabled={disabled}
                  value={value}
                  onChange={(event) => set(attribute.id, event.target.value)}
                >
                  <option value="">Não informado</option>
                  {(attribute.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            );
          if (attribute.type === 'BOOLEAN')
            return (
              <label key={attribute.id}>
                {label}
                <select
                  disabled={disabled}
                  value={value}
                  onChange={(event) => set(attribute.id, event.target.value)}
                >
                  <option value="">Não informado</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </label>
            );
          return (
            <label key={attribute.id}>
              {label}
              <input
                disabled={disabled}
                inputMode={attribute.type === 'NUMBER' ? 'decimal' : undefined}
                pattern={
                  attribute.type === 'NUMBER'
                    ? '[0-9]+([.,][0-9]{1,3})?'
                    : undefined
                }
                maxLength={200}
                value={value}
                onChange={(event) => set(attribute.id, event.target.value)}
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function formatAttributeValue(entry: {
  valueText: string | null;
  valueNumber: string | null;
  attribute: { type: string; unit: string | null };
}) {
  if (entry.attribute.type === 'BOOLEAN')
    return entry.valueText === 'true' ? 'Sim' : 'Não';
  const raw =
    entry.valueNumber !== null
      ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(
          Number(entry.valueNumber),
        )
      : (entry.valueText ?? '');
  return entry.attribute.unit ? `${raw} ${entry.attribute.unit}` : raw;
}
