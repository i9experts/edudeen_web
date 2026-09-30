import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Percent, Plus, Trash2, History } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useGlobalCommissionDefault, useSetGlobalCommissionDefault, useGlobalCommissionHistory,
  useSellerCommissionOverrides, useSetSellerCommissionOverride, useRemoveSellerCommissionOverride,
  useResolveCommissionRate,
} from '@/hooks/admin/useCommissionRules';
import { useAdminSellerBalances } from '@/hooks/admin/useAdminFinance';
import type { CommissionRateSource, SellerOverrideRow } from '@/api/services/commissionRules';
import { Button, Modal, Input, Textarea, ActionMenu, SkeletonBox, SearchInput, Table, type TableColumn } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';

const SOURCE_LABEL: Record<CommissionRateSource, string> = {
  seller_override: 'Seller override',
  platform_plan: 'Platform plan tier',
  global_default: 'Global default',
  hardcoded_fallback: 'Platform fallback',
};

function pct(rate: number) {
  return `${(rate * 100).toFixed(2)}%`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

// ── Global default card ───────────────────────────────────────────────────────
function GlobalDefaultCard() {
  const { rule, loading, error, refetch } = useGlobalCommissionDefault();
  const { history, loading: historyLoading } = useGlobalCommissionHistory();
  const { update, submitting, error: saveError } = useSetGlobalCommissionDefault();
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [ratePercent, setRatePercent] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  function openEdit() {
    setRatePercent(rule ? (rule.rate * 100).toString() : '8');
    setNotes('');
    setValidationError('');
    setEditing(true);
  }

  async function save() {
    const rate = Number(ratePercent) / 100;
    if (Number.isNaN(rate) || rate < 0 || rate > 1) {
      setValidationError('Enter a rate between 0 and 100.');
      return;
    }
    setValidationError('');
    const ok = await update(rate, notes || undefined);
    if (ok) { setEditing(false); refetch(); }
  }

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] flex items-center gap-[6px]">
            <Percent size={15} className="text-brand-orange" /> Global Default Commission
          </p>
          <p className="text-[11px] text-slate mt-[2px]">
            Applied to stores with no active platform plan and no seller-specific override.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit}>Edit</Button>
      </div>

      {loading ? (
        <SkeletonBox height={32} width={100} rounded="6px" className="mt-3" />
      ) : error ? (
        <p className="text-[12px] text-error mt-3">{error}</p>
      ) : (
        <p className="text-[28px] font-bold text-carbon mt-3">{rule ? pct(rule.rate) : '8.00%'}</p>
      )}
      {rule?.notes && <p className="text-[12px] text-slate mt-1">{rule.notes}</p>}

      <div className="mt-3 bg-cream border border-bone rounded-lg px-3 py-[9px] text-[12px] text-charcoal leading-[1.55]">
        <span className="font-semibold">Plan fees take precedence.</span> A store on a platform plan pays that plan's "Txn fee" instead of this default.
        Order used for every sale: seller override (below) → platform plan fee → this global default.{' '}
        <Link to="/admin/platform-plans" className="underline font-medium text-brand-orange">View plan fees</Link>
      </div>

      <button
        onClick={() => setShowHistory(s => !s)}
        className="mt-3 flex items-center gap-1 text-[11.5px] font-medium text-brand-orange bg-transparent border-none cursor-pointer p-0"
      >
        <History size={12} /> {showHistory ? 'Hide history' : 'View history'}
      </button>
      {showHistory && (
        <div className="mt-2 border-t border-bone pt-2 flex flex-col gap-1.5">
          {historyLoading ? (
            <SkeletonBox height={40} rounded="6px" />
          ) : history.length === 0 ? (
            <p className="text-[11px] text-slate">No changes recorded yet.</p>
          ) : history.map(h => (
            <div key={h._id} className="flex justify-between text-[11.5px]">
              <span className={h.isActive ? 'font-semibold text-carbon' : 'text-slate'}>{pct(h.rate)}{h.notes ? ` — ${h.notes}` : ''}</span>
              <span className="text-slate">{formatDate(h.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal mobileSheet
          title="Edit Global Default Commission"
          onClose={() => setEditing(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" loading={submitting} onClick={save}>Save</Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <Input label="Rate (%)" type="number" min={0} max={100} step="0.01" value={ratePercent} onChange={(e) => setRatePercent(e.target.value)} error={validationError || undefined} />
            <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Why is this changing?" />
            {saveError && <p className="text-[12px] text-error">{saveError}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Add/Edit seller override modal ────────────────────────────────────────────
function SellerOverrideModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [search, setSearch] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStoreName, setSelectedStoreName] = useState('');
  const [ratePercent, setRatePercent] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const balances = useAdminSellerBalances({ search: search || undefined, page: 1, limit: 8 });
  const { resolved } = useResolveCommissionRate(selectedStoreId);
  const { update, submitting, error } = useSetSellerCommissionOverride();

  async function save() {
    if (!selectedStoreId) { setValidationError('Select a store first.'); return; }
    const rate = Number(ratePercent) / 100;
    if (Number.isNaN(rate) || rate < 0 || rate > 1) {
      setValidationError('Enter a rate between 0 and 100.');
      return;
    }
    setValidationError('');
    const ok = await update(selectedStoreId, rate, notes || undefined);
    if (ok) onSaved();
  }

  return (
    <Modal mobileSheet
      title="Set Seller Commission Override"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={submitting} disabled={!selectedStoreId} onClick={save}>Save Override</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {!selectedStoreId ? (
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search seller name, email, or store…" />
            <div className="max-h-[220px] overflow-y-auto border border-bone rounded-[8px] divide-y divide-bone">
              {balances.loading ? (
                <div className="p-3"><SkeletonBox height={40} rounded="6px" /></div>
              ) : (balances.data?.sellers ?? []).length === 0 ? (
                <p className="text-[12px] text-slate p-3">{search ? 'No matching stores.' : 'Start typing to search stores.'}</p>
              ) : (balances.data?.sellers ?? []).map(s => (
                <button
                  key={s.storeId}
                  onClick={() => { setSelectedStoreId(s.storeId); setSelectedStoreName(s.storeName); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-cream cursor-pointer border-none bg-transparent"
                >
                  <p className="text-[13px] font-medium text-charcoal">{s.storeName}</p>
                  <p className="text-[11px] text-slate">{s.sellerName} · {s.sellerEmail}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between bg-cream border border-bone rounded-[8px] px-3 py-2.5">
              <p className="text-[13px] font-semibold text-charcoal">{selectedStoreName}</p>
              <button onClick={() => setSelectedStoreId(null)} className="text-[11.5px] text-brand-orange bg-transparent border-none cursor-pointer">Change</button>
            </div>
            {resolved && (
              <p className="text-[11.5px] text-slate">
                Current effective rate: <span className="font-semibold text-carbon">{pct(resolved.rate)}</span> ({SOURCE_LABEL[resolved.source]})
              </p>
            )}
            <Input label="Override rate (%)" type="number" min={0} max={100} step="0.01" value={ratePercent} onChange={(e) => setRatePercent(e.target.value)} error={validationError || undefined} />
            <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Negotiated rate for a high-volume seller" />
          </>
        )}
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminCommissionRules() {
  usePageTitle('Commission Rules');
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useSellerCommissionOverrides(page);
  const { remove, submitting: removing } = useRemoveSellerCommissionOverride();
  const [adding, setAdding] = useState(false);
  const [removingRow, setRemovingRow] = useState<SellerOverrideRow | null>(null);
  const [removeError, setRemoveError] = useState('');

  async function handleRemove() {
    if (!removingRow) return;
    setRemoveError('');
    const ok = await remove(removingRow.storeId!);
    if (ok) { setRemovingRow(null); refetch(); }
    else setRemoveError('Failed to remove override.');
  }

  const columns: TableColumn<SellerOverrideRow>[] = [
    { key: 'storeName', header: 'Store', render: r => <span className="font-medium text-charcoal">{r.storeName}</span> },
    { key: 'rate', header: 'Rate', render: r => <span className="font-semibold text-carbon">{pct(r.rate)}</span> },
    { key: 'notes', header: 'Notes', render: r => <span className="text-slate max-w-[220px] truncate block">{r.notes || '—'}</span> },
    { key: 'createdAt', header: 'Set', render: r => <span className="text-slate whitespace-nowrap">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: r => (
        <ActionMenu align="right" items={[
          { label: 'Remove Override', icon: <Trash2 size={13} />, danger: true, onClick: () => { setRemovingRow(r); setRemoveError(''); } },
        ]} />
      ),
    },
  ];

  return (
    <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      <AdminStudioHeader
        inset
        eyebrow="Edudeen team workspace · Finance"
        title="Commission rules"
        subtitle="Global default rate and per-seller commission overrides — layered above each store's platform-plan tier rate."
      />

      <GlobalDefaultCard />

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        <div className="px-5 py-[14px] border-b border-bone flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Seller Overrides</p>
            <p className="text-[11px] text-slate">Always wins over plan-tier and global rates.</p>
          </div>
          <Button icon={<Plus size={14} />} size="sm" onClick={() => setAdding(true)} className="shrink-0">Add Override</Button>
        </div>

        {error ? (
          <p className="px-4 py-6 text-center text-[13px] text-error">{error}</p>
        ) : (
          <Table
            columns={columns}
            data={data?.rules ?? []}
            keyExtractor={r => r._id}
            loading={loading}
            emptyState={{ icon: <Percent size={28} className="text-slate" />, title: 'No seller overrides yet', description: 'Every store currently follows its platform-plan tier rate or the global default.' }}
            pagination={data ? { page, total: data.total, perPage: data.limit, onChange: setPage, label: 'overrides' } : undefined}
          />
        )}
      </div>

      {adding && (
        <SellerOverrideModal
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); refetch(); }}
        />
      )}

      {removingRow && (
        <Modal mobileSheet
          title="Remove Commission Override?"
          onClose={() => setRemovingRow(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRemovingRow(null)}>Cancel</Button>
              <Button variant="danger" loading={removing} onClick={handleRemove}>Remove</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            "<strong>{removingRow.storeName}</strong>" will revert to its platform-plan tier rate or the global default. This cannot be undone (a new override can always be set again).
          </p>
          {removeError && <p className="text-[12px] text-error mt-2">{removeError}</p>}
        </Modal>
      )}
    </div>
  );
}
