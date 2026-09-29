import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { ArrowRight, Download, Plus, X, Star, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Badge } from '@/components/comman/ui/Badge';
import type { BadgeColor } from '@/types';
import { MetricCard } from '@/components/comman/ui/MetricCard';
import { SkeletonBox, Table, TabBar, type TableColumn } from '@/components/comman/ui';
import { useSearchParams } from 'react-router-dom';
import { EarningsStatement } from './EarningsStatement';

type FinanceTab = 'overview' | 'earnings';
import { currencySymbol } from '@/utils/currency';
import {
  apiGetFinanceDashboard, apiGetFinanceTransactions, apiExportFinanceTransactions,
  apiRequestPayout, apiGetPayouts, apiGetPayoutById,
  apiGetPayoutMethods, apiAddPayoutMethod, apiUpdatePayoutMethod, apiSetDefaultPayoutMethod,
  apiDeletePayoutMethod, apiGetPayoutSchedule, apiUpdatePayoutSchedule,
  apiGetTaxReports, apiGenerateTaxReport,
  type FinanceDashboard, type Transaction, type TransactionType, type PayoutMethod,
  type PayoutMethodType, type PayoutSchedule, type TaxReport, type Payout, type PayoutStatus,
} from '@/api/services/finance';

const TYPE_STYLE: Record<TransactionType, { color: BadgeColor; label: string }> = {
  sale:       { color: 'green',  label: 'Sale' },
  payout:     { color: 'gray',   label: 'Payout' },
  fee:        { color: 'yellow', label: 'Fee' },
  refund:     { color: 'red',    label: 'Refund' },
  adjustment: { color: 'blue',   label: 'Adjustment' },
};

const METHOD_LABEL: Record<PayoutMethodType, string> = {
  bank_transfer: 'Bank Transfer', paypal: 'PayPal', stripe: 'Stripe',
};

const PAYOUT_STATUS_COLOR: Record<PayoutStatus, BadgeColor> = {
  pending:    'yellow',
  processing: 'blue',
  completed:  'green',
  failed:     'red',
};

// Every wallet/balance/transaction figure must be shown in ITS OWN currency
// — never summed across a seller's separate PKR/USD wallets into one
// misleading number (see FinanceDashboard.wallets, StoreFinance's wallet
// selector).
function fmt(n: number, currency?: string | null) { return `${currencySymbol(currency)}${n.toFixed(2)}`; }

// ── Payout method modal (add or edit) ────────────────────────────────────────
function PayoutMethodModal({
  onClose, onSaved, storeId, editing, defaultCurrency,
}: { onClose: () => void; onSaved: () => void; storeId: string; editing?: PayoutMethod | null; defaultCurrency?: string }) {
  const [type, setType] = useState<PayoutMethodType>(editing?.type ?? 'bank_transfer');
  const [currency, setCurrency] = useState(editing?.currency ?? defaultCurrency ?? 'PKR');
  const [bankName, setBankName] = useState(editing?.bankName ?? '');
  const [accountHolder, setAccountHolder] = useState(editing?.accountHolder ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState(editing?.routingNumber ?? '');
  const [externalAccountId, setExternalAccountId] = useState(editing?.externalAccountId ?? '');
  const [setAsDefault, setSetAsDefault] = useState(editing?.isDefault ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true); setError('');
    const payload = {
      type, currency, setAsDefault,
      ...(type === 'bank_transfer'
        ? { bankName, accountHolder, ...(accountNumber ? { accountNumber } : {}), routingNumber }
        : { externalAccountId }),
    };
    try {
      if (editing) await apiUpdatePayoutMethod(storeId, editing._id, payload);
      else await apiAddPayoutMethod(storeId, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payout method.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Edit Payout Method' : 'Add Payout Method'} width={420} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {error && <p className="text-[12px] text-error">{error}</p>}
        <div className="flex gap-2">
          {(['bank_transfer', 'paypal', 'stripe'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={clsx(
                'flex-1 px-2.5 py-2 rounded-lg text-[12px] font-semibold border cursor-pointer',
                type === t ? 'border-brand-orange bg-brand-pale-orange text-brand-deep-orange' : 'border-bone bg-white text-graphite',
              )}>
              {METHOD_LABEL[t]}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-[11px] font-medium text-charcoal mb-1">
            Wallet / Currency{editing && ' (locked — this method already belongs to a wallet)'}
          </label>
          <div className="flex gap-2">
            {(['PKR', 'USD'] as const).map(c => (
              <button key={c} disabled={!!editing} onClick={() => setCurrency(c)}
                className={clsx(
                  'flex-1 px-2.5 py-2 rounded-lg text-[12px] font-semibold border disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
                  currency === c ? 'border-brand-orange bg-brand-pale-orange text-brand-deep-orange' : 'border-bone bg-white text-graphite',
                )}>
                {c}
              </button>
            ))}
          </div>
        </div>
        {type === 'bank_transfer' ? (
          <>
            <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name"
              className="px-3 py-2 border border-bone rounded-lg text-[13px] outline-none" />
            <input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder="Account holder name"
              className="px-3 py-2 border border-bone rounded-lg text-[13px] outline-none" />
            <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
              placeholder={editing ? `Account number (leave blank to keep ••${editing.accountLast4 ?? '----'})` : 'Account number'}
              className="px-3 py-2 border border-bone rounded-lg text-[13px] outline-none" />
            <input value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} placeholder="Routing number"
              className="px-3 py-2 border border-bone rounded-lg text-[13px] outline-none" />
          </>
        ) : (
          <input value={externalAccountId} onChange={e => setExternalAccountId(e.target.value)}
            placeholder={type === 'paypal' ? 'PayPal email' : 'Stripe account ID'}
            className="px-3 py-2 border border-bone rounded-lg text-[13px] outline-none" />
        )}
        <label className="flex items-center gap-2 text-[12.5px] text-graphite cursor-pointer">
          <input type="checkbox" checked={setAsDefault} onChange={e => setSetAsDefault(e.target.checked)} />
          Set as default payout method
        </label>
        <Button size="sm" loading={saving} onClick={handleSave}>Save Method</Button>
      </div>
    </Modal>
  );
}

// ── Request payout modal ─────────────────────────────────────────────────────
function RequestPayoutModal({
  onClose, onRequested, storeId, availableBalance, currency, methods,
}: { onClose: () => void; onRequested: () => void; storeId: string; availableBalance: number; currency: string; methods: PayoutMethod[] }) {
  // Only methods for THIS wallet's currency are ever offered — a payout
  // must always match the wallet it's drawn from (see backend
  // FinanceService.requestPayout, which derives currency from the chosen
  // method itself).
  const eligibleMethods = methods.filter(m => m.currency === currency);
  const defaultMethod = eligibleMethods.find(m => m.isDefault) ?? eligibleMethods[0] ?? null;
  const [methodId, setMethodId] = useState(defaultMethod?._id ?? '');
  const [amount, setAmount] = useState(String(availableBalance));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!methodId) { setError('Select a payout method.'); return; }
    if (!amt || amt < 1) { setError('Enter a valid amount.'); return; }
    if (amt > availableBalance) { setError(`Amount exceeds available balance (${fmt(availableBalance, currency)}).`); return; }
    setSaving(true); setError('');
    try {
      await apiRequestPayout(storeId, amt, methodId, notes || undefined);
      onRequested();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request payout.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Request Payout" width={420} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {error && <p className="text-[12px] text-error">{error}</p>}
        <p className="text-[12px] text-slate">Available balance: <span className="font-semibold text-carbon">{fmt(availableBalance, currency)}</span></p>
        {eligibleMethods.length === 0 && methods.length > 0 && (
          <p className="text-[11px] text-warning bg-warning-bg rounded-md px-2 py-1">
            None of your saved payout methods are set up for {currency} — add one to withdraw this wallet.
          </p>
        )}
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount"
          className="px-3 py-2 border border-bone rounded-lg text-[13px] outline-none" />
        <select value={methodId} onChange={e => setMethodId(e.target.value)}
          className="px-3 py-2 border border-bone rounded-lg text-[13px] outline-none bg-white">
          <option value="">Select payout method…</option>
          {eligibleMethods.map(m => (
            <option key={m._id} value={m._id}>
              {METHOD_LABEL[m.type]}{m.bankName ? ` — ${m.bankName}` : ''}{m.accountLast4 ? ` ••${m.accountLast4}` : ''}{m.isDefault ? ' (default)' : ''}
            </option>
          ))}
        </select>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
          className="px-3 py-2 border border-bone rounded-lg text-[13px] outline-none" />
        <Button size="sm" loading={saving} disabled={!eligibleMethods.length} onClick={handleSubmit}>
          {eligibleMethods.length ? 'Request Payout' : 'Add a payout method first'}
        </Button>
      </div>
    </Modal>
  );
}

// ── Payout schedule modal ────────────────────────────────────────────────────
function ScheduleModal({ onClose, onSaved, storeId, schedule }: { onClose: () => void; onSaved: () => void; storeId: string; schedule: PayoutSchedule }) {
  const [frequency, setFrequency] = useState(schedule.frequency);
  const [minimumAmount, setMinimumAmount] = useState(String(schedule.minimumAmount));
  const [isEnabled, setIsEnabled] = useState(schedule.isEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true); setError('');
    try {
      // currency must always be sent — it's what tells the backend WHICH
      // wallet's schedule this update applies to (a store can have one
      // schedule per currency it holds a balance in).
      await apiUpdatePayoutSchedule(storeId, { currency: schedule.currency, frequency, minimumAmount: parseFloat(minimumAmount) || 1, isEnabled });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Payout Schedule — ${schedule.currency}`} width={380} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {error && <p className="text-[12px] text-error">{error}</p>}
        <select value={frequency} onChange={e => setFrequency(e.target.value as typeof frequency)}
          className="px-3 py-2 border border-bone rounded-lg text-[13px] outline-none bg-white">
          {(['daily', 'weekly', 'biweekly', 'monthly', 'manual'] as const).map(f => (
            <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>
          ))}
        </select>
        <input type="number" value={minimumAmount} onChange={e => setMinimumAmount(e.target.value)} placeholder="Minimum payout amount"
          className="px-3 py-2 border border-bone rounded-lg text-[13px] outline-none" />
        <label className="flex items-center gap-2 text-[12.5px] text-graphite cursor-pointer">
          <input type="checkbox" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} />
          Enable automatic payouts
        </label>
        <Button size="sm" loading={saving} onClick={handleSave}>Save Schedule</Button>
      </div>
    </Modal>
  );
}

// ── Payout detail modal ───────────────────────────────────────────────────────
function PayoutDetailModal({ onClose, storeId, payoutId }: { onClose: () => void; storeId: string; payoutId: string }) {
  const [payout, setPayout] = useState<Payout | null>(null);
  useEffect(() => { apiGetPayoutById(storeId, payoutId).then(setPayout).catch(() => {}); }, [storeId, payoutId]);

  return (
    <Modal title="Payout Details" width={380} onClose={onClose}>
      {!payout ? (
        <SkeletonBox height={120} rounded="8px" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {[
            ['Amount', fmt(payout.amount, payout.currency)],
            ['Status', payout.status ? payout.status[0].toUpperCase() + payout.status.slice(1) : '—'],
            ['Method', payout.payoutMethodSnapshot ? `${METHOD_LABEL[payout.payoutMethodSnapshot.type as PayoutMethodType] ?? payout.payoutMethodSnapshot.type}${payout.payoutMethodSnapshot.accountLast4 ? ` ••${payout.payoutMethodSnapshot.accountLast4}` : ''}` : '—'],
            ['Requested', new Date(payout.createdAt).toLocaleString()],
            ['Processed', payout.processedAt ? new Date(payout.processedAt).toLocaleString() : '—'],
            ['Notes', payout.notes ?? '—'],
            ...(payout.failureReason ? [['Failure reason', payout.failureReason]] : []),
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between items-start gap-3">
              <span className="text-xs text-slate shrink-0">{label}</span>
              <span className="text-xs font-medium text-graphite text-right">{val}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function StoreFinance() {
  usePageTitle('Finance');
  const { storeId, store } = useStoreWorkspace();

  // Tabs live in the URL (?tab=earnings) so the sidebar's "Earnings" entry
  // and shared links can open the monthly statement directly.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: FinanceTab = searchParams.get('tab') === 'earnings' ? 'earnings' : 'overview';
  const setTab = (next: FinanceTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'overview') params.delete('tab'); else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  // Which wallet/currency is currently shown — a seller can hold more than
  // one (see FinanceDashboard.wallets); never summed into a single number.
  const [activeCurrency, setActiveCurrency] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txType, setTxType] = useState<TransactionType | ''>('');
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [schedule, setSchedule] = useState<PayoutSchedule | null>(null);
  const [taxReports, setTaxReports] = useState<TaxReport[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [generatingTax, setGeneratingTax] = useState(false);

  const transactionColumns: TableColumn<Transaction>[] = [
    { key: 'createdAt', header: 'Date', render: t => <span className="text-slate whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</span> },
    { key: 'description', header: 'Description', render: t => <span className="text-graphite">{t.description}</span> },
    {
      key: 'type', header: 'Type',
      render: t => <Badge color={TYPE_STYLE[t.type].color}>{TYPE_STYLE[t.type].label}</Badge>,
    },
    {
      key: 'amount', header: 'Amount',
      render: t => <span className={clsx('font-semibold whitespace-nowrap', t.amount >= 0 ? 'text-success' : 'text-error')}>{t.amount >= 0 ? '+' : ''}{fmt(t.amount, t.currency)}</span>,
    },
    { key: 'balanceAfter', header: 'Balance', render: t => <span className="font-medium text-carbon whitespace-nowrap">{fmt(t.balanceAfter, t.currency)}</span> },
  ];

  const [methodModal, setMethodModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PayoutMethod | null>(null);
  const [payoutModal, setPayoutModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);
  const [deleteMethodBusy, setDeleteMethodBusy] = useState(false);
  const [deleteMethodError, setDeleteMethodError] = useState('');

  // Dashboard/methods/tax-reports are currency-agnostic reads (the dashboard
  // itself returns every wallet; tax reports already list all currencies).
  // Schedule and recent-payouts are PER-WALLET, though, so they're fetched
  // separately below, once the active wallet is actually known — a
  // wallet-scoped fetch fired before we know which currency is selected
  // would silently always return the USD one (the backend's own default).
  const loadCore = useCallback(() => {
    if (!storeId) return;
    setLoading(true); setError('');
    Promise.all([
      apiGetFinanceDashboard(storeId),
      apiGetPayoutMethods(storeId),
      apiGetTaxReports(storeId),
    ])
      .then(([d, m, t]) => {
        setDashboard(d);
        setActiveCurrency(prev => prev && d.wallets.some(w => w.currency === prev) ? prev : (d.wallets[0]?.currency ?? null));
        setMethods(m ?? []); setTaxReports(t ?? []);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load finance data.'))
      .finally(() => setLoading(false));
  }, [storeId]);

  const loadWalletScoped = useCallback(() => {
    if (!storeId || !activeCurrency) return;
    Promise.all([
      apiGetPayoutSchedule(storeId, activeCurrency),
      apiGetPayouts(storeId, { limit: 5, currency: activeCurrency }),
    ])
      .then(([s, p]) => { setSchedule(s); setRecentPayouts(p.payouts ?? []); })
      .catch(() => {});
  }, [storeId, activeCurrency]);

  const loadTransactions = useCallback(() => {
    if (!storeId) return;
    apiGetFinanceTransactions(storeId, { page: txPage, limit: 10, type: txType || undefined, currency: activeCurrency || undefined })
      .then(res => { setTransactions(res.transactions ?? []); setTxTotal(res.total); })
      .catch(() => {});
  }, [storeId, txPage, txType, activeCurrency]);

  useEffect(loadCore, [loadCore]);
  useEffect(loadWalletScoped, [loadWalletScoped]);
  useEffect(loadTransactions, [loadTransactions]);

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await apiExportFinanceTransactions(storeId, { type: txType || undefined });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `transactions-${storeId}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleGenerateTaxReport() {
    setGeneratingTax(true);
    try {
      const now = new Date();
      const q = Math.floor(now.getMonth() / 3) + 1;
      await apiGenerateTaxReport(storeId, now.getFullYear(), `q${q}` as 'q1' | 'q2' | 'q3' | 'q4', activeCurrency || undefined);
      const reports = await apiGetTaxReports(storeId);
      setTaxReports(reports ?? []);
    } finally {
      setGeneratingTax(false);
    }
  }

  async function handleSetDefaultMethod(methodId: string) {
    await apiSetDefaultPayoutMethod(storeId, methodId);
    const m = await apiGetPayoutMethods(storeId);
    setMethods(m ?? []);
  }

  async function confirmDeleteMethod() {
    if (!deletingMethodId) return;
    setDeleteMethodBusy(true);
    setDeleteMethodError('');
    try {
      await apiDeletePayoutMethod(storeId, deletingMethodId);
      const m = await apiGetPayoutMethods(storeId);
      setMethods(m ?? []);
      setDeletingMethodId(null);
    } catch (err) {
      setDeleteMethodError(err instanceof Error ? err.message : 'Failed to delete payout method.');
    } finally {
      setDeleteMethodBusy(false);
    }
  }

  const activeWallet = dashboard?.wallets.find(w => w.currency === activeCurrency) ?? dashboard?.wallets[0] ?? null;

  const header = (
    <>
      <StorePageHeader
        title="Finance & Payouts"
        subtitle="Track earnings, payouts, fees, and tax reports."
        actions={
          <>
            <Button size="sm" variant="outline" icon={<Plus size={13} />} onClick={() => setMethodModal(true)}>
              <span className="hidden sm:inline">Add Payout Method</span>
              <span className="sm:hidden">Method</span>
            </Button>
            <Button size="sm" onClick={() => setPayoutModal(true)} disabled={!activeWallet || activeWallet.availableBalance <= 0}>
              Request Payout
            </Button>
          </>
        }
      />
      <div className="px-4 md:px-8 pt-4">
        <TabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'earnings', label: 'Monthly earnings' },
          ]}
          active={tab}
          onChange={id => setTab(id as FinanceTab)}
        />
      </div>
    </>
  );

  // Payout-method modal stays reachable from the header on every tab/state.
  const methodModalEl = methodModal && (
    <PayoutMethodModal storeId={storeId} defaultCurrency={activeWallet?.currency ?? store?.baseCurrency ?? undefined} onClose={() => setMethodModal(false)} onSaved={() => { setMethodModal(false); loadCore(); loadWalletScoped(); }} />
  );

  if (tab === 'earnings') {
    return (
      <>
        {header}
        <div className="px-4 md:px-8 pt-6 pb-10">
          <EarningsStatement
            storeId={storeId}
            currencies={dashboard?.wallets.map(w => w.currency) ?? []}
            defaultCurrency={store?.baseCurrency}
          />
        </div>
        {methodModalEl}
      </>
    );
  }

  if (loading) {
    return (
      <>
        {header}
        <div className="px-4 md:px-8 pt-6 pb-8 flex flex-col gap-5" aria-busy="true">
          <SkeletonBox height={110} rounded="12px" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} height={90} rounded="10px" />)}
          </div>
          <div className="flex gap-4">
            <SkeletonBox height={320} rounded="10px" className="flex-1" />
            <SkeletonBox height={320} rounded="10px" width={280} />
          </div>
        </div>
      </>
    );
  }

  if (error || !dashboard) {
    return (
      <>
        {header}
        <div className="px-4 md:px-8 pt-6 pb-8">
          <div role="alert" className="flex flex-col items-center gap-3 text-center bg-white border border-bone rounded-xl px-6 py-12">
            <div className="w-11 h-11 rounded-full bg-error-bg flex items-center justify-center">
              <AlertTriangle size={20} className="text-error" />
            </div>
            <p className="text-[13px] text-charcoal max-w-sm">{error || 'Failed to load finance data.'}</p>
            <Button size="sm" variant="outline" onClick={loadCore}>Try Again</Button>
          </div>
        </div>
        {methodModalEl}
      </>
    );
  }

  if (!activeWallet) {
    return (
      <>
        {header}
        <div className="px-4 md:px-8 pt-6 pb-8">
          <div className="bg-cream border border-bone rounded-xl px-6 py-10 text-center">
            <p className="font-serif text-[21px] text-carbon mb-2">No sales yet.</p>
            <p className="text-[13.5px] text-slate">Your wallet will appear here once you make your first sale.</p>
          </div>
        </div>
        {methodModalEl}
      </>
    );
  }

  return (
    <>
      {header}

      <div className="px-4 md:px-8 pt-6 pb-10 flex flex-col gap-5">

        {/* Wallet selector — a seller can hold more than one currency
            (e.g. a PKR wallet from bank-transfer/COD sales and a USD wallet
            from Stripe sales); these are NEVER summed into one number. */}
        {dashboard.wallets.length > 1 && (
          <div className="flex gap-2">
            {dashboard.wallets.map(w => (
              <button
                key={w.currency}
                onClick={() => setActiveCurrency(w.currency)}
                aria-pressed={w.currency === activeWallet.currency}
                className={
                  w.currency === activeWallet.currency
                    ? 'px-4 py-[8px] rounded-lg text-[13px] font-bold bg-brand-orange border border-brand-orange text-white cursor-pointer'
                    : 'px-4 py-[8px] rounded-lg text-[13px] font-bold bg-white border border-bone text-brand-orange cursor-pointer hover:bg-cream'
                }
              >
                {w.currency} Wallet
              </button>
            ))}
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-white border border-bone rounded-xl px-5 sm:px-[27px] py-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <p className="text-[12px] font-bold text-brand-royal uppercase tracking-[0.15em] mb-2">Available Balance ({activeWallet.currency})</p>
            <p className="font-serif text-[36px] font-normal text-carbon leading-[1.1] mb-3">{fmt(activeWallet.availableBalance, activeWallet.currency)}</p>
            <div className="flex items-center gap-6 flex-wrap">
              <span className="text-[13px] text-slate">Pending: <span className="text-carbon font-bold">{fmt(activeWallet.pendingBalance, activeWallet.currency)}</span></span>
              {activeWallet.nextPayout.scheduledAt && (
                <span className="text-[13px] text-brand-orange font-bold">
                  Next Payout: {new Date(activeWallet.nextPayout.scheduledAt).toLocaleDateString()}
                </span>
              )}
              {activeWallet.nextPayout.method && (
                <span className="text-[13px] text-slate">
                  Method: {METHOD_LABEL[activeWallet.nextPayout.method.type as PayoutMethodType] ?? activeWallet.nextPayout.method.type}
                  {activeWallet.nextPayout.method.last4 ? ` ••${activeWallet.nextPayout.method.last4}` : ''}
                </span>
              )}
            </div>
          </div>
          <Button size="md" onClick={() => setPayoutModal(true)} disabled={activeWallet.availableBalance <= 0} iconRight={<ArrowRight size={14} />}>
            Request Payout
          </Button>
        </div>

        {/* Metrics */}
        <div className="flex flex-col sm:flex-row gap-3">
          <MetricCard
            label="This Month Revenue"
            value={fmt(activeWallet.summary.thisMonthRevenue, activeWallet.currency)}
            trend={`${activeWallet.summary.revenueGrowthPercent >= 0 ? '+' : ''}${activeWallet.summary.revenueGrowthPercent}% vs last month`}
            trendUp={activeWallet.summary.revenueGrowthPercent >= 0}
          />
          <MetricCard label="Platform Fees" value={fmt(activeWallet.summary.platformFees, activeWallet.currency)} sub="This month" />
          <MetricCard label="Total Paid Out" value={fmt(activeWallet.summary.totalPaidOut, activeWallet.currency)} sub="All time" />
          <MetricCard label="Pending Tax" value={fmt(activeWallet.summary.pendingTax, activeWallet.currency)} sub="Estimated" />
        </div>

        {/* 2-col layout */}
        <div className="flex gap-4 items-start flex-wrap lg:flex-nowrap">

          {/* LEFT — Transaction History */}
          <div className="flex-1 min-w-0 w-full bg-white border border-bone rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 flex-wrap gap-2.5">
              <h2 className="font-serif font-normal text-[21px] text-carbon">Transaction History</h2>
              <div className="flex items-center gap-2">
                <select value={txType} onChange={e => { setTxType(e.target.value as TransactionType | ''); setTxPage(1); }}
                  className="px-3 py-[7px] text-[13px] border border-bone rounded-lg bg-white text-charcoal outline-none">
                  <option value="">All Types</option>
                  {Object.entries(TYPE_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <Button size="sm" variant="outline" icon={<Download size={12} />} loading={exporting} onClick={handleExport}>
                  Export CSV
                </Button>
              </div>
            </div>

            <Table
              columns={transactionColumns}
              data={transactions}
              keyExtractor={t => t._id}
              emptyState={{ title: 'No transactions yet.' }}
              pagination={{ page: txPage, total: txTotal, perPage: 10, onChange: setTxPage, label: 'transactions' }}
            />
          </div>

          {/* RIGHT — 3 stacked cards */}
          <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-3.5">

            {/* Payout Methods */}
            <div className="bg-white border border-bone rounded-xl px-5 py-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-serif text-[18px] text-carbon">Payout Methods</p>
                <button onClick={() => setMethodModal(true)} aria-label="Add payout method" className="text-slate hover:text-brand-orange cursor-pointer bg-transparent border-none">
                  <Plus size={14} />
                </button>
              </div>
              {methods.length === 0 ? (
                <p className="text-xs text-slate">No payout methods yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {methods.map(m => (
                    <div key={m._id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {m.isDefault && <Star size={11} className="text-brand-orange shrink-0" fill="var(--color-brand-orange)" />}
                        <span className="text-xs text-graphite truncate">
                          {METHOD_LABEL[m.type]}{m.accountLast4 ? ` ••${m.accountLast4}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!m.isDefault && (
                          <button onClick={() => handleSetDefaultMethod(m._id)} className="text-[10px] text-slate hover:text-brand-orange cursor-pointer bg-transparent border-none">
                            Set default
                          </button>
                        )}
                        <button onClick={() => setEditingMethod(m)} className="text-[10px] text-slate hover:text-brand-orange cursor-pointer bg-transparent border-none">
                          Edit
                        </button>
                        <button onClick={() => { setDeletingMethodId(m._id); setDeleteMethodError(''); }} aria-label="Delete payout method" className="text-slate hover:text-error cursor-pointer bg-transparent border-none">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payout Schedule */}
            {schedule && (
              <div className="bg-white border border-bone rounded-xl px-5 py-5">
                <p className="font-serif text-[18px] text-carbon mb-3">Payout Schedule</p>
                <div className="flex flex-col gap-2.5">
                  {[
                    ['Frequency', schedule.frequency ? schedule.frequency[0].toUpperCase() + schedule.frequency.slice(1) : '—'],
                    ['Status', schedule.isEnabled ? 'Enabled' : 'Disabled'],
                    ['Minimum', fmt(schedule.minimumAmount, schedule.currency)],
                    ['Next Payout', schedule.nextPayoutAt ? new Date(schedule.nextPayoutAt).toLocaleDateString() : '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-slate">{label}</span>
                      <span className="text-xs font-medium text-graphite">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-bone">
                  <button onClick={() => setScheduleModal(true)}
                    className="px-3.5 py-1.5 bg-white border border-bone rounded-[7px] text-xs text-graphite cursor-pointer hover:border-brand-orange/40">
                    Update Schedule
                  </button>
                </div>
              </div>
            )}

            {/* Fee Breakdown */}
            <div className="bg-white border border-bone rounded-xl px-5 py-5">
              <p className="font-serif text-[18px] text-carbon mb-3">Fee Breakdown</p>
              <div className="flex flex-col gap-2.5">
                {[
                  ['Marketplace Listing Fee', dashboard.feeBreakdown.marketplaceListingFee],
                  ['Transaction Fee', dashboard.feeBreakdown.transactionFee],
                  ['Payment Processing', dashboard.feeBreakdown.paymentProcessing],
                  ['Digital Delivery', dashboard.feeBreakdown.digitalDelivery],
                  ['AI Credits', dashboard.feeBreakdown.aiCredits],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-slate">{label}</span>
                    <span className="text-xs font-medium text-graphite">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax Reports */}
            <div className="bg-white border border-bone rounded-xl px-5 py-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-serif text-[18px] text-carbon">Tax Reports</p>
                <button onClick={handleGenerateTaxReport} disabled={generatingTax}
                  className="text-[11px] text-brand-orange hover:underline cursor-pointer bg-transparent border-none disabled:opacity-50">
                  {generatingTax ? 'Generating…' : 'Generate'}
                </button>
              </div>
              {taxReports.length === 0 ? (
                <p className="text-xs text-slate">No tax reports yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {taxReports.map(r => (
                    <div key={r._id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-graphite leading-[1.3] capitalize">{r.period} {r.year}</p>
                        <p className="text-[11px] text-slate mt-0.5">Net {fmt(r.netRevenue, r.currency)} · Est. tax {fmt(r.estimatedTax, r.currency)}</p>
                      </div>
                      {r.pdfUrl && (
                        <a href={r.pdfUrl} target="_blank" rel="noreferrer"
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-white border border-bone rounded-[6px] text-[11px] font-medium text-slate hover:border-brand-orange/40">
                          PDF
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Payouts */}
            {recentPayouts.length > 0 && (
              <div className="bg-white border border-bone rounded-xl px-5 py-5">
                <p className="font-serif text-[18px] text-carbon mb-3">Recent Payouts</p>
                <div className="flex flex-col gap-2.5">
                  {recentPayouts.map(p => (
                    <button key={p._id} onClick={() => setSelectedPayoutId(p._id)}
                      className="flex items-center justify-between gap-2 bg-transparent border-none p-0 cursor-pointer text-left">
                      <span className="text-xs text-graphite">{fmt(p.amount, p.currency)}</span>
                      <Badge color={PAYOUT_STATUS_COLOR[p.status]} size="sm">{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {methodModalEl}
      {editingMethod && (
        <PayoutMethodModal storeId={storeId} editing={editingMethod} defaultCurrency={activeWallet.currency} onClose={() => setEditingMethod(null)} onSaved={() => { setEditingMethod(null); loadCore(); loadWalletScoped(); }} />
      )}
      {payoutModal && (
        <RequestPayoutModal storeId={storeId} availableBalance={activeWallet.availableBalance} currency={activeWallet.currency} methods={methods}
          onClose={() => setPayoutModal(false)} onRequested={() => { setPayoutModal(false); loadCore(); loadWalletScoped(); loadTransactions(); }} />
      )}
      {scheduleModal && schedule && (
        <ScheduleModal storeId={storeId} schedule={schedule} onClose={() => setScheduleModal(false)} onSaved={() => { setScheduleModal(false); loadWalletScoped(); }} />
      )}
      {selectedPayoutId && (
        <PayoutDetailModal storeId={storeId} payoutId={selectedPayoutId} onClose={() => setSelectedPayoutId(null)} />
      )}
      {deletingMethodId && (
        <Modal title="Delete Payout Method" onClose={() => setDeletingMethodId(null)} footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingMethodId(null)} disabled={deleteMethodBusy}>Cancel</Button>
            <Button variant="danger" onClick={confirmDeleteMethod} loading={deleteMethodBusy}>Delete</Button>
          </>
        }>
          <p className="text-[13px] text-charcoal">Delete this payout method? This cannot be undone.</p>
          {deleteMethodError && <p className="text-[12px] text-error mt-2">{deleteMethodError}</p>}
        </Modal>
      )}
    </>
  );
}
