'use client';

import { Download, Leaf, TrendingUp } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '../../../components/dashboard-header';
import {
  api,
  Company,
  CompanyReport,
  isAuthenticationError,
} from '../../../lib/api';
import { formatMoney } from '../../../lib/format';
import { dealStatusLabels, label } from '../../../lib/labels';

const numberFormat = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function percent(value: number) {
  return `${(value * 100).toFixed(1).replace('.', ',')}%`;
}

function BarList({
  items,
  format,
}: {
  items: { key: string; label: string; value: number }[];
  format: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  if (items.length === 0)
    return <p className="form-note">Sem dados no período.</p>;
  return (
    <ul className="bar-list">
      {items.map((item) => (
        <li key={item.key}>
          <span className="bar-label">
            <span>{item.label}</span>
            <strong>{format(item.value)}</strong>
          </span>
          <span className="bar-track" aria-hidden="true">
            <span
              className="bar-fill"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [from, setFrom] = useState(
    isoDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)),
  );
  const [to, setTo] = useState(isoDate(new Date()));
  const [range, setRange] = useState({ from, to });
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = {
      from: params.get('from') ?? from,
      to: params.get('to') ?? to,
    };
    setFrom(initial.from);
    setTo(initial.to);
    setRange(initial);
    api
      .companies()
      .then(({ companies: result }) => {
        setCompanies(result);
        setCompanyId(params.get('companyId') ?? result[0]?.id ?? '');
        if (!result.length) setLoading(false);
      })
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/relatorios');
        else setError('Não foi possível carregar suas empresas.');
        setLoading(false);
      });
    // Initial values only; later changes go through the form.
  }, [router]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    api
      .companyReport(companyId, range)
      .then(setReport)
      .catch(() => setError('Não foi possível gerar o relatório.'))
      .finally(() => setLoading(false));
    window.history.replaceState(
      null,
      '',
      `/dashboard/relatorios?companyId=${companyId}&from=${range.from}&to=${range.to}`,
    );
  }, [companyId, range]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRange({ from, to });
  }

  return (
    <main className="dashboard-page">
      <DashboardHeader />
      <section className="dashboard-content shell">
        <p className="eyebrow">inteligência</p>
        <h1>Relatórios comerciais e ambientais</h1>
        <p className="dashboard-lede">
          Resultado das negociações da sua empresa e o impacto ambiental
          estimado dos materiais que voltaram à cadeia produtiva.
        </p>
        <form className="admin-filter-bar" onSubmit={apply}>
          {companies.length > 1 && (
            <label>
              Empresa
              <select
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
          )}
          <label>
            De
            <input
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <button className="button small">Aplicar</button>
          {companyId && (
            <a
              className="secondary-button small"
              href={api.companyReportCsvUrl(companyId, range)}
            >
              <Download size={14} aria-hidden="true" /> Exportar CSV
            </a>
          )}
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!companyId && !loading && (
          <div className="empty-panel">
            Cadastre uma empresa para gerar relatórios.
          </div>
        )}
        {loading && (
          <div className="dashboard-loading">Gerando relatório...</div>
        )}
        {report && !loading && (
          <>
            <h2>
              <TrendingUp size={18} aria-hidden="true" /> Comercial
            </h2>
            <div className="report-kpis">
              <article>
                <span>Receita (vendas concluídas)</span>
                <strong>{formatMoney(report.commercial.revenue)}</strong>
              </article>
              <article>
                <span>Compras concluídas</span>
                <strong>{formatMoney(report.commercial.spend)}</strong>
              </article>
              <article>
                <span>Negociações concluídas</span>
                <strong>{report.commercial.completedDeals}</strong>
                <small>
                  ticket médio {formatMoney(report.commercial.averageTicket)}
                </small>
              </article>
              <article>
                <span>Conversão de propostas recebidas</span>
                <strong>
                  {percent(report.commercial.conversionRate.received)}
                </strong>
                <small>
                  {report.commercial.proposalsReceived.total} recebidas
                </small>
              </article>
              <article>
                <span>Conversão de propostas enviadas</span>
                <strong>
                  {percent(report.commercial.conversionRate.sent)}
                </strong>
                <small>{report.commercial.proposalsSent.total} enviadas</small>
              </article>
            </div>
            <h2>
              <Leaf size={18} aria-hidden="true" /> Ambiental
            </h2>
            <div className="report-kpis">
              <article>
                <span>Material desviado de aterro</span>
                <strong>
                  {numberFormat.format(report.environmental.divertedKg / 1000)}{' '}
                  t
                </strong>
                <small>
                  {numberFormat.format(report.environmental.divertedKg)} kg
                </small>
              </article>
              <article>
                <span>CO₂e evitado (estimativa)</span>
                <strong>
                  {numberFormat.format(
                    report.environmental.co2eAvoidedKg / 1000,
                  )}{' '}
                  t
                </strong>
                <small>
                  ≈ {report.environmental.treesEquivalent} árvores/ano
                </small>
              </article>
              <article>
                <span>Negociações sem unidade de massa</span>
                <strong>{report.environmental.dealsWithoutMassUnit}</strong>
                <small>não entram no cálculo</small>
              </article>
            </div>
            <p className="disclaimer">{report.environmental.methodology}</p>
            <div className="admin-split">
              <section className="admin-panel">
                <h2>Valor por categoria</h2>
                <BarList
                  items={report.byCategory.map((item) => ({
                    key: item.categoryId,
                    label: item.name,
                    value: item.value,
                  }))}
                  format={(value) => formatMoney(value)}
                />
              </section>
              <section className="admin-panel">
                <h2>CO₂e evitado por categoria</h2>
                <BarList
                  items={report.byCategory.map((item) => ({
                    key: item.categoryId,
                    label: item.name,
                    value: item.co2eKg,
                  }))}
                  format={(value) => `${numberFormat.format(value)} kg`}
                />
              </section>
            </div>
            <div className="admin-split">
              <section className="admin-panel">
                <h2>Negociações por status</h2>
                <BarList
                  items={Object.entries(report.commercial.dealsByStatus).map(
                    ([status, value]) => ({
                      key: status,
                      label: label(dealStatusLabels, status),
                      value,
                    }),
                  )}
                  format={(value) => String(value)}
                />
              </section>
              <section className="admin-panel">
                <h2>Evolução mensal</h2>
                {report.monthly.length === 0 ? (
                  <p className="form-note">Sem negociações concluídas.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Mês</th>
                          <th>Vendas</th>
                          <th>Compras</th>
                          <th>Massa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.monthly.map((month) => (
                          <tr key={month.month}>
                            <td>{month.month}</td>
                            <td>{formatMoney(month.sold)}</td>
                            <td>{formatMoney(month.bought)}</td>
                            <td>{numberFormat.format(month.kilograms)} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
