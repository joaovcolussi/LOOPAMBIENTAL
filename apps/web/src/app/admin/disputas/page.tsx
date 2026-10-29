'use client';

import { useEffect, useState } from 'react';
import { AdminNav } from '../../../components/admin-nav';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { api, DealSummary } from '../../../lib/api';
import { formatMoney, formatQuantity } from '../../../lib/format';

type Pending = { deal: DealSummary; resolution: 'complete' | 'cancel' };

function name(company: { legalName: string; tradeName: string | null }) {
  return company.tradeName || company.legalName;
}

export default function AdminDisputesPage() {
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const result = await api.adminDisputes();
    setDeals(result.deals);
  }

  useEffect(() => {
    load()
      .catch(() => setError('Acesso restrito ou falha ao carregar disputas.'))
      .finally(() => setLoading(false));
  }, []);

  async function resolve(notes: string) {
    if (!pending) return;
    setSaving(true);
    setError('');
    try {
      await api.resolveDispute(pending.deal.id, pending.resolution, notes);
      setNotice('Disputa resolvida e registrada na auditoria.');
      await load();
    } catch {
      setError('Não foi possível resolver a disputa.');
    } finally {
      setSaving(false);
      setPending(null);
    }
  }

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">mediação</p>
        <h1>Disputas de negociação</h1>
        <p className="dashboard-lede">
          Negociações em disputa aguardando decisão da plataforma. A decisão
          conclui ou cancela a negociação e devolve o estoque quando cancelada.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="form-note" role="status">
            {notice}
          </p>
        )}
        {loading ? (
          <div className="dashboard-loading">Carregando disputas...</div>
        ) : deals.length === 0 ? (
          <div className="empty-panel">Nenhuma disputa aberta.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Negociação</th>
                  <th>Partes</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <strong>{deal.listing.title}</strong>
                      <small className="table-subtext">
                        {formatQuantity(deal.proposal.quantity)}{' '}
                        {deal.listing.unit} · desde{' '}
                        {new Date(deal.updatedAt).toLocaleDateString('pt-BR')}
                      </small>
                    </td>
                    <td>
                      {name(deal.sellerCompany)} → {name(deal.buyerCompany)}
                    </td>
                    <td>
                      {formatMoney(
                        Number(deal.proposal.quantity) *
                          Number(deal.proposal.unitPrice),
                        deal.proposal.currency,
                      )}
                    </td>
                    <td>
                      <div className="deal-actions">
                        <button
                          className="secondary-button small"
                          type="button"
                          onClick={() =>
                            setPending({ deal, resolution: 'complete' })
                          }
                        >
                          Concluir
                        </button>
                        <button
                          className="link-button"
                          type="button"
                          onClick={() =>
                            setPending({ deal, resolution: 'cancel' })
                          }
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.resolution === 'complete'
            ? 'Concluir negociação em disputa'
            : 'Cancelar negociação em disputa'
        }
        description="Registre a justificativa da decisão. Ela fica no histórico imutável da negociação."
        requireReason
        reasonLabel="Justificativa"
        tone={pending?.resolution === 'cancel' ? 'danger' : 'default'}
        pending={saving}
        onConfirm={(reason) => void resolve(reason)}
        onCancel={() => setPending(null)}
      />
    </main>
  );
}
