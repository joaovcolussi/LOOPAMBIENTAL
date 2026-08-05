'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, Company } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

export default function CompanyPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');
  const [taxId, setTaxId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');
  const [contactVisibility, setContactVisibility] = useState<
    'PRIVATE' | 'MEMBERS' | 'PUBLIC'
  >('PRIVATE');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .companies()
      .then(({ companies }) => {
        if (companies[0]) fill(companies[0]);
      })
      .catch(() => router.replace('/entrar'))
      .finally(() => setLoading(false));
  }, [router]);

  function fill(value: Company) {
    setCompany(value);
    setLegalName(value.legalName);
    setTradeName(value.tradeName ?? '');
    setCity(value.city ?? '');
    setState(value.state ?? '');
    setDescription(value.description ?? '');
    setContactName(value.contactName ?? '');
    setContactEmail(value.contactEmail ?? '');
    setContactWhatsapp(value.contactWhatsapp ?? '');
    setAddressLine(value.addressLine ?? '');
    setAddressNumber(value.addressNumber ?? '');
    setAddressDistrict(value.addressDistrict ?? '');
    setAddressPostalCode(value.addressPostalCode ?? '');
    setContactVisibility(value.contactVisibility ?? 'PRIVATE');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const input = {
        legalName,
        tradeName,
        city,
        state,
        description,
        taxId,
        contactName,
        contactEmail,
        contactWhatsapp,
        addressLine,
        addressNumber,
        addressDistrict,
        addressPostalCode,
        contactVisibility,
      };
      const result = company
        ? await api.updateCompany(company.id, input)
        : await api.createCompany(input);
      fill(result.company);
      router.push('/dashboard');
    } catch {
      setError('Não foi possível salvar os dados da empresa.');
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando empresa...</div>
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
        <p className="eyebrow">perfil empresarial</p>
        <h1>{company ? 'Atualize sua empresa.' : 'Cadastre sua empresa.'}</h1>
        <p className="dashboard-lede">
          Esses dados ajudam outras empresas a entenderem com quem estão
          negociando.
        </p>
        <form className="company-form" onSubmit={submit}>
          <label>
            Razão social *
            <input
              required
              minLength={2}
              maxLength={200}
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
            />
          </label>
          <label>
            Nome fantasia
            <input
              maxLength={200}
              value={tradeName}
              onChange={(event) => setTradeName(event.target.value)}
            />
          </label>
          <div className="form-row">
            <label>
              CNPJ
              <input
                maxLength={30}
                value={taxId}
                onChange={(event) => setTaxId(event.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </label>
            <label>
              Responsável
              <input
                maxLength={150}
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              E-mail comercial
              <input
                type="email"
                maxLength={320}
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
              />
            </label>
            <label>
              WhatsApp comercial
              <input
                maxLength={20}
                value={contactWhatsapp}
                onChange={(event) => setContactWhatsapp(event.target.value)}
                placeholder="+55 11 99999-9999"
              />
            </label>
          </div>
          <p className="form-note">
            Os contatos ficam confidenciais por padrão e só aparecem conforme a
            visibilidade escolhida abaixo.
          </p>
          <div className="form-row">
            <label>
              Visibilidade dos contatos
              <select
                value={contactVisibility}
                onChange={(event) =>
                  setContactVisibility(
                    event.target.value as 'PRIVATE' | 'MEMBERS' | 'PUBLIC',
                  )
                }
              >
                <option value="PRIVATE">Confidencial</option>
                <option value="MEMBERS">Apenas participantes</option>
                <option value="PUBLIC">Público</option>
              </select>
            </label>
            <span />
          </div>
          <div className="form-row">
            <label>
              Endereço
              <input
                maxLength={200}
                value={addressLine}
                onChange={(event) => setAddressLine(event.target.value)}
              />
            </label>
            <label>
              Número
              <input
                maxLength={20}
                value={addressNumber}
                onChange={(event) => setAddressNumber(event.target.value)}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Bairro
              <input
                maxLength={120}
                value={addressDistrict}
                onChange={(event) => setAddressDistrict(event.target.value)}
              />
            </label>
            <label>
              CEP
              <input
                maxLength={12}
                value={addressPostalCode}
                onChange={(event) => setAddressPostalCode(event.target.value)}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Cidade
              <input
                maxLength={120}
                value={city}
                onChange={(event) => setCity(event.target.value)}
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
            Sobre a empresa
            <textarea
              maxLength={2000}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar empresa'} <ArrowRight size={16} />
          </button>
        </form>
      </section>
    </main>
  );
}
