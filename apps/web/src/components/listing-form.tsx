'use client';

import { ArrowRight } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import {
  api,
  Category,
  Company,
  ListingDetail,
  ListingFormValues,
  Material,
  MaterialAttribute,
} from '../lib/api';
import { CurrencyInput } from './currency-input';
import {
  AttributeValues,
  ListingAttributeFields,
} from './listing-attribute-fields';

type Frequency = NonNullable<ListingFormValues['frequency']>;
type Risk = NonNullable<ListingFormValues['riskClassification']>;

type ListingFormProps = {
  companies: Company[];
  initial?: ListingDetail & { status?: string };
  submitLabel: string;
  savingLabel?: string;
  // Fields frozen while a deal reserves stock (quantity, price, type...).
  lockCommercialFields?: boolean;
  children?: ReactNode;
  onSubmit: (values: ListingFormValues) => Promise<void>;
};

function initialAttributes(initial?: ListingDetail): AttributeValues {
  const values: AttributeValues = {};
  for (const entry of initial?.attributes ?? [])
    values[entry.attribute.id] =
      entry.valueNumber !== null
        ? String(Number(entry.valueNumber))
        : (entry.valueText ?? '');
  return values;
}

export function ListingForm({
  companies,
  initial,
  submitLabel,
  savingLabel = 'Enviando...',
  lockCommercialFields = false,
  children,
  onSubmit,
}: ListingFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [attributes, setAttributes] = useState<MaterialAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<AttributeValues>(
    initialAttributes(initial),
  );
  const [companyId, setCompanyId] = useState(
    initial?.companyId ?? companies[0]?.id ?? '',
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? initial?.category.id ?? '',
  );
  const [materialId, setMaterialId] = useState(
    initial?.materialId ?? initial?.material?.id ?? '',
  );
  const [type, setType] = useState<'BUY' | 'SELL'>(initial?.type ?? 'SELL');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [quantity, setQuantity] = useState(
    initial ? String(Number(initial.quantity)).replace('.', ',') : '',
  );
  const [unit, setUnit] = useState(initial?.unit ?? 'kg');
  const [unitPrice, setUnitPrice] = useState(
    initial?.unitPrice ? String(Number(initial.unitPrice)) : '',
  );
  const [frequency, setFrequency] = useState<Frequency>(
    (initial?.frequency as Frequency) ?? 'ONE_TIME',
  );
  const [riskClassification, setRiskClassification] = useState<Risk>(
    (initial?.riskClassification as Risk) ?? 'UNKNOWN',
  );
  const [originDetails, setOriginDetails] = useState(
    initial?.originDetails ?? '',
  );
  const [ownTransport, setOwnTransport] = useState(
    initial?.ownTransport ?? false,
  );
  const [requiresDocuments, setRequiresDocuments] = useState(
    initial?.requiresDocuments ?? false,
  );
  const [city, setCity] = useState(initial?.city ?? '');
  const [state, setState] = useState(initial?.state ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    api
      .categories()
      .then(({ categories: result }) => {
        setCategories(result);
        setCategoryId((current) => current || result[0]?.id || '');
      })
      .catch(() => setCatalogError('Não foi possível carregar categorias.'));
  }, []);

  useEffect(() => {
    if (!categoryId) return;
    let active = true;
    Promise.all([api.materials(categoryId), api.categoryAttributes(categoryId)])
      .then(([materialResult, attributeResult]) => {
        if (!active) return;
        setMaterials(materialResult.materials);
        setMaterialId((current) =>
          materialResult.materials.some((material) => material.id === current)
            ? current
            : '',
        );
        setAttributes(attributeResult.attributes);
        setAttributeValues((current) => {
          const allowed = new Set(
            attributeResult.attributes.map((item) => item.id),
          );
          return Object.fromEntries(
            Object.entries(current).filter(([id]) => allowed.has(id)),
          );
        });
      })
      .catch(() => {
        if (!active) return;
        setMaterials([]);
        setAttributes([]);
      });
    return () => {
      active = false;
    };
  }, [categoryId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({
        companyId,
        categoryId,
        materialId: materialId || undefined,
        type,
        title,
        description: description || undefined,
        quantity: quantity.replace(',', '.'),
        unit,
        unitPrice: unitPrice || undefined,
        frequency,
        riskClassification,
        originDetails: originDetails || undefined,
        ownTransport: type === 'SELL' ? ownTransport : undefined,
        requiresDocuments,
        city,
        state,
        attributes: attributes.map((attribute) => ({
          attributeId: attribute.id,
          value: (attributeValues[attribute.id] ?? '').replace(',', '.'),
        })),
      });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : '';
      setError(
        code === 'LISTING_SAVED_AS_DRAFT'
          ? 'O anúncio foi salvo como rascunho, mas as fotos, os laudos ou o envio para análise falharam. Abra o anúncio no painel para continuar.'
          : code.startsWith('INVALID_ATTRIBUTE')
            ? 'Confira os atributos técnicos: algum valor está fora do formato esperado.'
            : code === 'LISTING_UNDER_NEGOTIATION'
              ? 'Este anúncio está em negociação; quantidade, preço e categoria não podem ser alterados.'
              : 'Não foi possível salvar o anúncio. Confira os dados e tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  }

  const locked = lockCommercialFields;

  return (
    <form className="company-form" onSubmit={submit}>
      {catalogError && (
        <p className="form-error" role="alert">
          {catalogError}
        </p>
      )}
      <div className="form-row">
        <label>
          Tipo
          <select
            value={type}
            disabled={locked}
            onChange={(event) => setType(event.target.value as 'BUY' | 'SELL')}
          >
            <option value="SELL">Quero vender</option>
            <option value="BUY">Quero comprar</option>
          </select>
        </label>
        <label>
          Empresa
          <select
            required
            value={companyId}
            disabled={Boolean(initial)}
            onChange={(event) => setCompanyId(event.target.value)}
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.tradeName || company.legalName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Frequência
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as Frequency)}
          >
            <option value="ONE_TIME">Operação única</option>
            <option value="WEEKLY">Semanal</option>
            <option value="MONTHLY">Mensal</option>
            <option value="CONTINUOUS">Contínuo</option>
          </select>
        </label>
        <label>
          Classificação do resíduo
          <select
            value={riskClassification}
            onChange={(event) =>
              setRiskClassification(event.target.value as Risk)
            }
          >
            <option value="UNKNOWN">Não informado</option>
            <option value="NON_HAZARDOUS">Não perigoso</option>
            <option value="HAZARDOUS">Perigoso</option>
          </select>
        </label>
      </div>
      <label>
        Origem do resíduo
        <input
          maxLength={240}
          value={originDetails}
          onChange={(event) => setOriginDetails(event.target.value)}
          placeholder="Ex.: planta industrial, linha de produção ou unidade"
        />
      </label>
      <div className="form-options">
        {type === 'SELL' && (
          <label className="form-check">
            <input
              type="checkbox"
              checked={ownTransport}
              onChange={(event) => setOwnTransport(event.target.checked)}
            />
            <span>Possui transporte próprio</span>
          </label>
        )}
        {type === 'BUY' && (
          <label className="form-check">
            <input
              type="checkbox"
              checked={requiresDocuments}
              onChange={(event) => setRequiresDocuments(event.target.checked)}
            />
            <span>Exigir laudos</span>
          </label>
        )}
      </div>
      {children}
      <label>
        Título do anúncio *
        <input
          required
          minLength={5}
          maxLength={180}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Fardos de papelão ondulado"
        />
      </label>
      <div className="form-row">
        <label>
          Categoria
          <select
            required
            value={categoryId}
            disabled={locked}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Material
          <select
            value={materialId}
            disabled={locked}
            onChange={(event) => setMaterialId(event.target.value)}
          >
            <option value="">Não especificado</option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ListingAttributeFields
        attributes={attributes}
        values={attributeValues}
        onChange={setAttributeValues}
      />
      <label>
        Descrição
        <textarea
          rows={5}
          maxLength={5000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="form-row">
        <label>
          Quantidade *
          <input
            required
            disabled={locked}
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]{1,3})?"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="Ex.: 1000 ou 1000,5"
          />
        </label>
        <label>
          Unidade *
          <input
            required
            disabled={locked}
            maxLength={20}
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Preço unitário
          {locked ? (
            <input value={unitPrice} disabled readOnly />
          ) : (
            <CurrencyInput
              value={unitPrice}
              onChange={setUnitPrice}
              placeholder="R$ 0,00 (opcional)"
            />
          )}
        </label>
        <label>
          Estado
          <input
            maxLength={2}
            value={state}
            onChange={(event) => setState(event.target.value.toUpperCase())}
          />
        </label>
      </div>
      <label>
        Cidade
        <input
          maxLength={120}
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button" disabled={saving}>
        {saving ? savingLabel : submitLabel} <ArrowRight size={16} />
      </button>
    </form>
  );
}
