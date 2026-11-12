import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { formatPrice } from '@/utils/formatPrice';
import { clsx } from 'clsx';
import { Download, Plus, X, Star, AlertTriangle, CalendarCheck } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Badge } from '@/components/comman/ui/Badge';
import type { BadgeColor } from '@/types';
import { SkeletonBox, Table, type TableColumn } from '@/components/comman/ui';
import { useSearchParams } from 'react-router-dom';
import { EarningsStatement, StatementSkeleton } from './EarningsStatement';
import { EarningsHero, PayoutHistory, HowFeesWork, METHOD_LABEL, VIEW_FILTER, type EarningsView } from './EarningsParts';
import {
  apiGetFinanceDashboard, apiGetFinanceTransactions, apiExportFinanceTransactions,
  apiGetPayouts, apiGetPayoutById, apiGetEarningsSummary,
  apiGetPayoutMethods, apiAddPayoutMethod, apiUpdatePayoutMethod, apiSetDefaultPayoutMethod,
  apiDeletePayoutMethod,
  type FinanceDashboard, type Transaction, type TransactionType, type PayoutMethod,
  type PayoutMethodType, type Payout, type EarningsSummary,
} from '@/api/services/finance';

// One Earnings page: balance hero -> month statement -> transactions -> payout method
// + history -> "How fees and payouts work". Buyers pay Edudeen; Edudeen pays each seller
// once a month after admin approval, so there is no "request payout" control here.

const TYPE_STYLE: Record<TransactionType, { color: BadgeColor; label: string }> = {
  sale:       { color: 'green',  label: 'Sale' },
  payout:     { color: 'gray',   label: 'Payout' },
  fee:        { color: 'yellow', label: 'Fee' },
  refund:     { color: 'red',    label: 'Refund' },
  adjustment: { color: 'blue',   label: 'Adjustment' },
};

// Every wallet/balance/transaction figure is shown in ITS OWN currency
// — never summed across a seller's separate PKR/USD wallets.
function fmt(n: number, currency?: string | null) { return `${formatPrice(n, currency)}`; }

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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const isPkr = currency === 'PKR';

  function validate() {
    const errs: Record<string, string> = {};
    if (type === 'bank_transfer') {
      if (!bankName.trim()) errs.bankName = 'Bank name is required';
      if (!accountHolder.trim()) errs.accountHolder = 'Account holder name is required';
      const acct = accountNumber.replace(/\s+/g, '').toUpperCase();
      if (!(editing && !acct)) {
        if (isPkr) { if (!/^PK\d{2}[A-Z]{4}\d{16}$/.test(acct)) errs.accountNumber = 'Enter a valid IBAN, e.g. PK36SCBL0000001123456702'; }
        else if (acct.length < 4) errs.accountNumber = 'Account number is required';
      }
    } else if (type === 'paypal') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(externalAccountId.trim())) errs.externalAccountId = 'Enter a valid PayPal email';
    } else if (!/^acct_[A-Za-z0-9]+$/.test(externalAccountId.trim())) {
      errs.externalAccountId = 'Enter your Stripe connected account id (starts with acct_)';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    setError('');
    if (!validate()) return;
    setSaving(true);
    const acct = accountNumber.replace(/\s+/g, '');
    const payload = {
      type, currency, setAsDefault,
      ...(type === 'bank_transfer'
        ? { bankName: bankName.trim(), accountHolder: accountHolder.trim(), ...(acct ? { accountNumber: isPkr ? acct.toUpperCase() : acct } : {}), ...(!isPkr && routingNumber ? { routingNumber } : {}) }
        : { externalAccountId: externalAccountId.trim() }),
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

  async function handleRemove() {
    if (!editing) return;
    setRemoving(true); setError('');
    try {
      await apiDeletePayoutMethod(storeId, editing._id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove payout method.');
      setConfirmRemove(false);
    } finally {
      setRemoving(false);
    }
  }

  const inputCls = (k: string) => clsx('w-full px-3 py-2 border rounded-lg text-[13px] outline-none', fieldErrors[k] ? 'border-error' : 'border-bone');
  const labelCls = 'block text-[12px] font-medium text-charcoal mb-1';
  const fieldErr = (k: string) => fieldErrors[k] ? <p id={`pm-${k}-err`} className="text-[11.5px] text-error mt-1">{fieldErrors[k]}</p> : null;
  const aria = (k: string) => ({ id: `pm-${k}`, 'aria-invalid': !!fieldErrors[k], 'aria-describedby': fieldErrors[k] ? `pm-${k}-err` : undefined });

  return (
    <Modal title={editing ? 'Edit Payout Method' : 'Add Payout Method'} width={420} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {error && <p className="text-[12px] text-error">{error}</p>}
        <div className="flex gap-2">
          {(['bank_transfer', 'paypal', 'stripe'] as const).map(t => (
            <button key={t} type="button" onClick={() => { setType(t); setFieldErrors({}); }}
              className={clsx(
                'flex-1 px-2.5 py-2 rounded-lg text-[12px] font-semibold border cursor-pointer',
                type === t ? 'border-brand-orange bg-brand-pale-orange text-brand-deep-orange' : 'border-bone bg-white text-graphite',
              )}>
              {METHOD_LABEL[t]}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1">
            Wallet / Currency{editing && ' (locked — this method already belongs to a wallet)'}
          </label>
          <div className="flex gap-2">
            {(['PKR', 'USD'] as const).map(c => (
              <button key={c} type="button" disabled={!!editing} onClick={() => { setCurrency(c); setFieldErrors({}); }}
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
            <div>
              <label htmlFor="pm-bankName" className={labelCls}>Bank name <span className="text-error">*</span></label>
              <input {...aria('bankName')} value={bankName} onChange={e => setBankName(e.target.value)} className={inputCls('bankName')} />
              {fieldErr('bankName')}
            </div>
            <div>
              <label htmlFor="pm-accountHolder" className={labelCls}>Account holder name <span className="text-error">*</span></label>
              <input {...aria('accountHolder')} value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className={inputCls('accountHolder')} />
              {fieldErr('accountHolder')}
            </div>
            <div>
              <label htmlFor="pm-accountNumber" className={labelCls}>
                {isPkr ? 'IBAN' : 'Account number'} {!editing && <span className="text-error">*</span>}
              </label>
              <input {...aria('accountNumber')} value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
                placeholder={editing ? `Leave blank to keep ••${editing.accountLast4 ?? '----'}` : isPkr ? 'PK36SCBL0000001123456702' : ''}
                className={inputCls('accountNumber')} />
              {fieldErr('accountNumber')}
            </div>
            {!isPkr && (
              <div>
                <label htmlFor="pm-routingNumber" className={labelCls}>Routing number</label>
                <input id="pm-routingNumber" value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} className={inputCls('routingNumber')} />
              </div>
            )}
          </>
        ) : (
          <div>
            <label htmlFor="pm-externalAccountId" className={labelCls}>
              {type === 'paypal' ? 'PayPal email' : 'Stripe connected account ID'} <span className="text-error">*</span>
            </label>
            <input {...aria('externalAccountId')} value={externalAccountId} onChange={e => setExternalAccountId(e.target.value)}
              placeholder={type === 'paypal' ? 'you@example.com' : 'acct_...'} className={inputCls('externalAccountId')} />
            {fieldErr('externalAccountId')}
          </div>
        )}
        <label className="flex items-center gap-2 text-[12.5px] text-graphite cursor-pointer">
          <input type="checkbox" checked={setAsDefault} onChange={e => setSetAsDefault(e.target.checked)} />
          Set as default payout method
        </label>
        <Button size="sm" loading={saving} onClick={handleSave}>Save Method</Button>
        {editing && (confirmRemove ? (
          <div className="rounded-lg border border-error/30 bg-error/5 p-3 flex flex-col gap-2">
            <p className="text-[12px] text-charcoal">Remove this payout method? This can’t be undone.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmRemove(false)}>Keep it</Button>
              <Button size="sm" loading={removing} onClick={handleRemove}>Yes, remove</Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmRemove(true)} className="text-[12px] font-semibold text-error cursor-pointer self-start">Remove this method</button>
        ))}
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
const VIEWS: EarningsView[] = ['available', 'clearing', 'owed'];

export function StoreFinance() {
  usePageTitle('Earnings');
  const { storeId, store } = useStoreWorkspace();
  const baseCurrency = store?.baseCurrency;

  const [searchParams, setSearchParams] = useSearchParams();
  // Old ?tab=overview / ?tab=earnings links land on this one page.
  useEffect(() => {
    if (searchParams.has('tab')) {
      const params = new URLSearchParams(searchParams);
      params.delete('tab');
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const rawView = searchParams.get('view');
  const view = (VIEWS as string[]).includes(rawView ?? '') ? (rawView as EarningsView) : null;
  const clearView = () => { const p = new URLSearchParams(searchParams); p.delete('view'); setSearchParams(p, { replace: true }); };

  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [pickedCurrency, setPickedCurrency] = useState<string | null>(null);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txType, setTxType] = useState<TransactionType | ''>('');
  const [txLoading, setTxLoading] = useState(false);
  const [methods, setMethods] = useState<PayoutMethod[] | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [payoutsError, setPayoutsError] = useState('');
  const [coreError, setCoreError] = useState('');
  const [exporting, setExporting] = useState(false);

  const wallets = dashboard?.wallets ?? [];
  const currencyOptions = [...new Set([baseCurrency, ...wallets.map(w => w.currency)].filter((c): c is string => !!c))];
  // The wallet currency never changes under the seller: their pick, else the store's own, else their first wallet.
  const activeCurrency = (pickedCurrency && currencyOptions.includes(pickedCurrency) ? pickedCurrency : null)
    ?? baseCurrency ?? wallets[0]?.currency ?? null;
  const summaryForCurrency = summary && summary.currency === activeCurrency ? summary : null;

  const [methodModal, setMethodModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PayoutMethod | null>(null);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);
  const [deleteMethodBusy, setDeleteMethodBusy] = useState(false);
  const [deleteMethodError, setDeleteMethodError] = useState('');
  const txRef = useRef<HTMLDivElement>(null);
  const methodRef = useRef<HTMLDivElement>(null);
  const quietRef = useRef(false);

  const loadCore = useCallback(() => {
    if (!storeId) return;
    quietRef.current = false;
    Promise.all([apiGetFinanceDashboard(storeId), apiGetPayoutMethods(storeId)])
      .then(([d, m]) => { setDashboard(d); setMethods(m ?? []); setCoreError(''); })
      .catch(err => setCoreError(err instanceof Error ? err.message : 'Failed to load finance data.'));
  }, [storeId]);

  const loadSummary = useCallback(() => {
    if (!storeId || !activeCurrency) return;
    apiGetEarningsSummary(storeId, activeCurrency)
      .then(s => { setSummary(s); setSummaryError(''); })
      .catch(err => setSummaryError(err instanceof Error ? err.message : 'Failed to load your earnings.'));
  }, [storeId, activeCurrency]);

  const loadPayouts = useCallback(() => {
    if (!storeId || !activeCurrency) return;
    setPayoutsLoading(true);
    apiGetPayouts(storeId, { limit: 12, currency: activeCurrency })
      .then(p => { setPayouts(p.payouts ?? []); setPayoutsError(''); })
      .catch(err => setPayoutsError(err instanceof Error ? err.message : 'Failed to load payouts.'))
      .finally(() => setPayoutsLoading(false));
  }, [storeId, activeCurrency]);

  const filter = view ? VIEW_FILTER[view] : null;
  const loadTransactions = useCallback(() => {
    if (!storeId || !activeCurrency) return;
    setTxLoading(true);
    apiGetFinanceTransactions(storeId, {
      page: txPage, limit: 10, currency: activeCurrency,
      type: (filter?.type ?? (txType || undefined)) as TransactionType | undefined,
      status: filter?.status,
    })
      .then(res => { setTransactions(res.transactions ?? []); setTxTotal(res.total); })
      .catch(() => { /* the table keeps its last rows; the hero already shows load errors */ })
      .finally(() => setTxLoading(false));
  }, [storeId, activeCurrency, txPage, txType, filter?.type, filter?.status]);

  useEffect(loadCore, [loadCore]);
  useEffect(loadSummary, [loadSummary]);
  useEffect(loadPayouts, [loadPayouts]);
  useEffect(loadTransactions, [loadTransactions]);
  useEffect(() => { setTxPage(1); }, [view, activeCurrency]);
  // A hero tile opened a filtered list: bring it into view.
  useEffect(() => { if (view) txRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [view]);
  // A sale was credited / a payout was approved or sent: everything updates by itself.
  useLiveRefresh(['finance', 'orders', 'payouts'], () => { loadCore(); loadSummary(); loadPayouts(); loadTransactions(); }, !!storeId);

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await apiExportFinanceTransactions(storeId, { type: (filter?.type ?? (txType || undefined)) as TransactionType | undefined, status: filter?.status, currency: activeCurrency ?? undefined });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = `transactions-${storeId}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleSetDefaultMethod(methodId: string) {
    await apiSetDefaultPayoutMethod(storeId, methodId);
    setMethods((await apiGetPayoutMethods(storeId)) ?? []);
    loadSummary();
  }

  async function confirmDeleteMethod() {
    if (!deletingMethodId) return;
    setDeleteMethodBusy(true);
    setDeleteMethodError('');
    try {
      await apiDeletePayoutMethod(storeId, deletingMethodId);
      setMethods((await apiGetPayoutMethods(storeId)) ?? []);
      setDeletingMethodId(null);
      loadSummary();
    } catch (err) {
      setDeleteMethodError(err instanceof Error ? err.message : 'Failed to delete payout method.');
    } finally {
      setDeleteMethodBusy(false);
    }
  }

  const methodsKnown = methods !== null;
  const hasDefault = (methods ?? []).some(m => m.isDefault && (!activeCurrency || m.currency === activeCurrency));

  const transactionColumns: TableColumn<Transaction>[] = [
    { key: 'createdAt', header: 'Date', render: t => <span className="text-slate whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</span> },
    { key: 'description', header: 'Description', render: t => <span className="text-graphite">{t.description}</span> },
    { key: 'type', header: 'Type', render: t => <Badge color={TYPE_STYLE[t.type]?.color ?? 'gray'}>{TYPE_STYLE[t.type]?.label ?? t.type}</Badge> },
    { key: 'amount', header: 'Amount', render: t => <span className={clsx('font-semibold whitespace-nowrap', t.amount >= 0 ? 'text-success' : 'text-error')}>{t.amount >= 0 ? '+' : ''}{fmt(t.amount, t.currency)}</span> },
    { key: 'balanceAfter', header: 'Balance', hideBelowXl: true, render: t => <span className="font-medium text-carbon whitespace-nowrap">{fmt(t.balanceAfter, t.currency)}</span> },
  ];

  const header = (
    <>
      <StorePageHeader
        title="Earnings"
        subtitle="Your sales, fees and monthly payouts from Edudeen."
        actions={methodsKnown ? (
          hasDefault ? (
            <Button size="sm" variant="outline" onClick={() => methodRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <span className="hidden sm:inline">Manage payout method</span>
              <span className="sm:hidden">Payout method</span>
            </Button>
          ) : (
            <Button size="sm" variant="outline" icon={<Plus size={13} />} onClick={() => setMethodModal(true)}>
              <span className="hidden sm:inline">Add Payout Method</span>
              <span className="sm:hidden">Method</span>
            </Button>
          )
        ) : undefined}
      />
      {methodsKnown && !hasDefault && (
        <div className="px-4 md:px-8 pt-4">
          <div className="flex items-center gap-2 text-[12.5px] text-carbon bg-info-bg border border-[#bfdcf3] rounded-lg px-3 py-2">
            <CalendarCheck size={14} className="shrink-0 text-brand-royal" />
            <span>Add a payout method so Edudeen knows where to send your monthly payout.</span>
          </div>
        </div>
      )}
    </>
  );

  const methodModalEl = methodModal && (
    <PayoutMethodModal storeId={storeId} defaultCurrency={activeCurrency ?? undefined} onClose={() => setMethodModal(false)} onSaved={() => { setMethodModal(false); loadCore(); loadSummary(); loadPayouts(); }} />
  );

  if (coreError && !dashboard) {
    return (
      <>
        {header}
        <div className="px-4 md:px-8 pt-6 pb-8">
          <div role="alert" className="flex flex-col items-center gap-3 text-center bg-white border border-bone rounded-xl px-6 py-12">
            <div className="w-11 h-11 rounded-full bg-error-bg flex items-center justify-center"><AlertTriangle size={20} className="text-error" /></div>
            <p className="text-[13px] text-charcoal max-w-sm">{coreError}</p>
            <Button size="sm" variant="outline" onClick={loadCore}>Try Again</Button>
          </div>
        </div>
        {methodModalEl}
      </>
    );
  }

  // No amount is drawn until the wallet currency is known, so nothing flashes in another currency.
  const ready = !!activeCurrency && !!dashboard;

  return (
    <>
      {header}
      <div className="px-4 md:px-8 pt-6 pb-10 flex flex-col gap-6">

        {ready && currencyOptions.length > 1 && (
          <div role="group" aria-label="Wallet currency" className="flex gap-2">
            {currencyOptions.map(c => (
              <button key={c} type="button" onClick={() => { setPickedCurrency(c); setSummary(null); }} aria-pressed={c === activeCurrency}
                className={c === activeCurrency
                  ? 'px-4 py-[8px] rounded-lg text-[13px] font-bold bg-brand-orange border border-brand-orange text-white cursor-pointer'
                  : 'px-4 py-[8px] rounded-lg text-[13px] font-bold bg-white border border-bone text-brand-orange cursor-pointer hover:bg-cream'}>
                {c} Wallet
              </button>
            ))}
          </div>
        )}

        {/* 1. Balance hero */}
        {summaryError && !summaryForCurrency ? (
          <div role="alert" className="flex items-center justify-between gap-3 flex-wrap bg-error-bg border border-error-border rounded-xl px-5 py-4">
            <p className="text-[13px] text-error">{summaryError}</p>
            <Button size="sm" variant="outline" onClick={loadSummary}>Try again</Button>
          </div>
        ) : !ready || !summaryForCurrency ? (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true">
            {[0, 1, 2, 3].map(i => <SkeletonBox key={i} height={104} rounded="12px" />)}
          </div>
        ) : (
          <EarningsHero s={summaryForCurrency} storeId={storeId} />
        )}

        {/* 2. Month statement */}
        {ready && summaryForCurrency && activeCurrency ? (
          <EarningsStatement storeId={storeId} currency={activeCurrency} nextPayoutDate={summaryForCurrency.nextPayoutDate} toShip={summaryForCurrency.expected.toShip} />
        ) : <StatementSkeleton />}

        {/* 3. Transactions */}
        <section ref={txRef} id="transactions" aria-labelledby="tx-h" className="bg-white border border-bone rounded-xl overflow-hidden scroll-mt-24">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 flex-wrap gap-2.5">
            <h2 id="tx-h" className="font-serif font-normal text-[21px] text-carbon">Transactions</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {filter ? (
                <button type="button" onClick={clearView} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-royal bg-info-bg border border-[#bfdcf3] rounded-full px-3 py-1 cursor-pointer">
                  {filter.label} <X size={12} aria-hidden /><span className="sr-only">Clear filter</span>
                </button>
              ) : (
                <select value={txType} onChange={e => { setTxType(e.target.value as TransactionType | ''); setTxPage(1); }} aria-label="Transaction type"
                  className="px-3 py-[7px] text-[13px] border border-bone rounded-lg bg-white text-charcoal outline-none">
                  <option value="">All Types</option>
                  {Object.entries(TYPE_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              )}
              <Button size="sm" variant="outline" icon={<Download size={12} />} loading={exporting} onClick={handleExport}>Export CSV</Button>
            </div>
          </div>
          <Table
            columns={transactionColumns}
            data={transactions}
            keyExtractor={t => t._id}
            loading={txLoading && transactions.length === 0}
            compact
            cardsBelow="md"
            renderCard={t => (
              <div className="flex flex-col gap-1 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <Badge color={TYPE_STYLE[t.type]?.color ?? 'gray'} size="sm">{TYPE_STYLE[t.type]?.label ?? t.type}</Badge>
                  <span className={clsx('font-semibold', t.amount >= 0 ? 'text-success' : 'text-error')}>{t.amount >= 0 ? '+' : ''}{fmt(t.amount, t.currency)}</span>
                </div>
                <span className="text-graphite">{t.description}</span>
                <span className="text-[12px] text-slate">{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            )}
            emptyState={{ title: filter ? 'Nothing matches this filter.' : 'No transactions yet.' }}
            pagination={{ page: txPage, total: txTotal, perPage: 10, onChange: setTxPage, label: 'transactions' }}
          />
        </section>

        {/* 4. Payout method + history */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-5 items-start">
          <div ref={methodRef} id="payout-method" className="bg-white border border-bone rounded-xl px-5 py-5 scroll-mt-24">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-[18px] text-carbon font-normal">Payout method</h2>
              <button type="button" onClick={() => setMethodModal(true)} aria-label="Add payout method" className="text-slate hover:text-brand-orange cursor-pointer bg-transparent border-none">
                <Plus size={14} />
              </button>
            </div>
            {!methodsKnown ? <SkeletonBox height={44} rounded="8px" /> : methods!.length === 0 ? (
              <p className="text-xs text-slate">No payout method yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {methods!.map(m => (
                  <div key={m._id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {m.isDefault && <Star size={11} className="text-brand-orange shrink-0" fill="var(--color-brand-orange)" aria-label="Default" />}
                      <span className="text-xs text-graphite truncate">
                        {METHOD_LABEL[m.type]}{m.accountLast4 ? ` ••${m.accountLast4}` : ''} · {m.currency}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!m.isDefault && (
                        <button type="button" onClick={() => handleSetDefaultMethod(m._id)} className="text-[12px] text-slate hover:text-brand-orange cursor-pointer bg-transparent border-none">Set default</button>
                      )}
                      <button type="button" onClick={() => setEditingMethod(m)} className="text-[12px] text-slate hover:text-brand-orange cursor-pointer bg-transparent border-none">Edit</button>
                      <button type="button" onClick={() => { setDeletingMethodId(m._id); setDeleteMethodError(''); }} aria-label="Delete payout method" className="text-slate hover:text-error cursor-pointer bg-transparent border-none">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <PayoutHistory payouts={payouts} loading={payoutsLoading} error={payoutsError} onOpen={setSelectedPayoutId} onRetry={loadPayouts} />
        </div>

        {/* 5. The only place fee rules appear */}
        {summaryForCurrency && <HowFeesWork s={summaryForCurrency} />}
      </div>

      {methodModalEl}
      {editingMethod && (
        <PayoutMethodModal storeId={storeId} editing={editingMethod} defaultCurrency={activeCurrency ?? undefined} onClose={() => setEditingMethod(null)} onSaved={() => { setEditingMethod(null); loadCore(); loadSummary(); loadPayouts(); }} />
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
