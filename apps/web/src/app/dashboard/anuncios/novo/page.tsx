'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, Category, Company, Material } from '../../../../lib/api';
import { SessionActions } from '../../../../components/session-actions';

export default function NewListingPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('SELL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [unitPrice, setUnitPrice] = useState('');
  const [frequency, setFrequency] = useState<
    'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'CONTINUOUS'
  >('ONE_TIME');
  const [riskClassification, setRiskClassification] = useState<
    'NON_HAZARDOUS' | 'HAZARDOUS' | 'UNKNOWN'
  >('UNKNOWN');
  const [originDetails, setOriginDetails] = useState('');
  const [ownTransport, setOwnTransport] = useState(false);
  const [requiresDocuments, setRequiresDocuments] = useState(false);
  const [hasLaudos, setHasLaudos] = useState(false);
  const [laudos, setLaudos] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.companies(), api.categories()])
      .then(([companyResult, categoryResult]) => {
        setCompanies(companyResult.companies);
        setCategories(categoryResult.categories);
        setCompanyId(companyResult.companies[0]?.id ?? '');
        setCategoryId(categoryResult.categories[0]?.id ?? '');
      })
      .catch(() => router.replace('/entrar'))
      .finally(() => setLoading(false));
  }, [router]);
  useEffect(() => {
    if (categoryId)
      api
        .materials(categoryId)
        .then(({ materials: result }) => {
          setMaterials(result);
          setMaterialId(result[0]?.id ?? '');
        })
        .catch(() => setMaterials([]));
  }, [categoryId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const laudosList = hasLaudos ? laudos.filter(Boolean) : [];
      const laudosNote =
        laudosList.length > 0
          ? `\n\nLaudos disponíveis: ${laudosList.join(', ')}`
          : '';
      const { listing } = await api.createListing({
        companyId,
        categoryId,
        materialId: materialId || undefined,
        type,
        title,
        description: description
          ? `${description}${laudosNote}`
          : laudosNote.trim() || undefined,
        quantity,
        unit,
        unitPrice: unitPrice || undefined,
        frequency,
        riskClassification,
        originDetails: originDetails || undefined,
        ownTransport: type === 'SELL' ? ownTransport : undefined,
        requiresDocuments,
        city,
        state,
      });
      await api.submitListing(listing.id);
      router.push('/dashboard/anuncios');
    } catch {
      setError(
        'Não foi possível publicar o anúncio. Confira os dados e tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando formulário...</div>
      </main>
    );
  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/dashboard">
            <ArrowLeft size={15} /> Voltar ao painel
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="company-content shell">
        <p className="eyebrow">novo anúncio</p>
        <h1>Coloque um material em movimento.</h1>
        <p className="dashboard-lede">
          Descreva o que sua empresa quer comprar ou vender.
        </p>
        <form className="company-form" onSubmit={submit}>
          <div className="form-row">
            <label>
              Tipo
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as 'BUY' | 'SELL')
                }
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
                onChange={(event) =>
                  setFrequency(
                    event.target.value as
                      'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'CONTINUOUS',
                  )
                }
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
                  setRiskClassification(
                    event.target.value as
                      'NON_HAZARDOUS' | 'HAZARDOUS' | 'UNKNOWN',
                  )
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
                  onChange={(event) =>
                    setRequiresDocuments(event.target.checked)
                  }
                />
                <span>Exigir laudos</span>
              </label>
            )}
            {type === 'SELL' && (
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={hasLaudos}
                  onChange={(event) => setHasLaudos(event.target.checked)}
                />
                <span>Possui laudos?</span>
              </label>
            )}
          </div>
          {type === 'SELL' && hasLaudos && (
            <div className="laudos-list">
              <label>
                Documentos dos laudos
                {laudos.map((value, index) => (
                  <div className="laudo-row" key={index}>
                    <input
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        const next = [...laudos];
                        next[index] = file ? file.name : value;
                        setLaudos(next);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setLaudos(laudos.filter((_, i) => i !== index))
                      }
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button small"
                  onClick={() => setLaudos([...laudos, ''])}
                >
                  Adicionar documento
                </button>
              </label>
            </div>
          )}
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
                pattern="[0-9]+(\.[0-9]{1,3})?"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="0.000"
              />
            </label>
            <label>
              Unidade *
              <input
                required
                maxLength={20}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Preço unitário
              <input
                pattern="[0-9]+(\.[0-9]{1,3})?"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                placeholder="Opcional"
              />
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
            {saving ? 'Publicando...' : 'Publicar anúncio'}{' '}
            <ArrowRight size={16} />
          </button>
        </form>
      </section>
    </main>
  );
}
