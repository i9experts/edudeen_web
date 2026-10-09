import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, History, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Input, Toggle, StatusBadge, SkeletonBox, EmptyState, Table, type TableColumn } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { useToast } from '@/contexts/ToastContext';
import { apiGetPlatformConfig, apiUpdateFxConfig, type FxConfig } from '@/api/services/config/adminConfig';
import { apiGetCurrentRates, apiGetFxHistory, apiGetFxStaleness, apiOverrideFxRate, type CurrentRatesMap, type ExchangeRateHistoryRow } from '@/api/services/exchangeRate';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// ── Current rate cards ────────────────────────────────────────────────────────
function RateCard({ currency, rate, staleness }: {
  currency: string;
  rate: CurrentRatesMap[string];
  staleness?: { hoursOld: number; isStale: boolean } | null;
}) {
  return (
    <div className="bg-white border border-bone rounded-xl px-5 py-4 flex-1 min-w-[220px]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-bold text-carbon">{currency}</p>
        {staleness?.isStale && <StatusBadge status="Stale" />}
        {rate?.source === 'admin' && !staleness?.isStale && <StatusBadge status="Admin Override" />}
      </div>
      {rate ? (
        <>
          <p className="text-[22px] font-bold text-charcoal leading-tight">
            {currency === 'USD' ? '1.00' : rate.ratePerUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="text-[12px] font-medium text-slate ml-1">per USD</span>
          </p>
          <p className="text-[12px] text-slate mt-1">
            Updated {formatDate(rate.effectiveFrom)} · {rate.source === 'admin' ? 'manual override' : 'auto-refreshed'}
          </p>
        </>
      ) : (
        <p className="text-[13px] text-error">No rate available</p>
      )}
    </div>
  );
}

// ── Manual override form ──────────────────────────────────────────────────────
function OverrideForm({ onDone }: { onDone: () => void }) {
  const [currency, setCurrency] = useState('PKR');
  const [rate, setRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const value = Number(rate);
    if (!value || value <= 0) { setError('Enter a valid rate'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await apiOverrideFxRate(currency, value);
      // Defensive check — the current backend logic never actually holds an
      // admin-sourced override (the abnormal-jump hold only applies to
      // provider-sourced refreshes), but read the response instead of
      // assuming success so this doesn't silently regress if that ever changes.
      if (!res.data.applied) {
        setError('Rate was not applied — it was held for review instead of taking effect immediately.');
        setSubmitting(false);
        return;
      }
      setRate('');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set rate — it may be outside the allowed sane band.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-bone rounded-xl px-5 py-4">
      <p className="text-[13px] font-bold text-carbon mb-1">Set Manual Rate</p>
      <p className="text-[12px] text-slate mb-3">Overrides the auto-refreshed rate immediately. Only applies to checkouts created after this change.</p>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-[110px]">
          <label className="block text-[12px] font-medium text-charcoal mb-1">Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
            <option value="PKR">PKR</option>
          </select>
        </div>
        <div className="w-[160px]">
          <Input label="Rate (per 1 USD)" type="number" min="1" value={rate} onChange={e => setRate(e.target.value)} placeholder="278" />
        </div>
        <Button variant="primary" loading={submitting} onClick={submit}>Apply</Button>
      </div>
      {error && <p className="text-[12px] text-error mt-2 flex items-center gap-1"><AlertTriangle size={13} />{error}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminFxSettings() {
  usePageTitle('FX Settings');
  const [rates, setRates] = useState<CurrentRatesMap>({});
  const [staleness, setStaleness] = useState<Record<string, { hoursOld: number; isStale: boolean } | null>>({});
  const [fxConfig, setFxConfig] = useState<FxConfig | null>(null);
  const [history, setHistory] = useState<ExchangeRateHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  // Per-section load errors — a failed request must not read as "no data".
  const [errors, setErrors] = useState<{ rates?: string; config?: string; history?: string }>({});
  const [configError, setConfigError] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const msg = (r: PromiseSettledResult<unknown>, fallback: string) =>
      r.status === 'rejected' ? (r.reason instanceof Error ? r.reason.message : fallback) : undefined;
    const [ratesRes, staleRes, configRes, historyRes] = await Promise.allSettled([
      apiGetCurrentRates(),
      apiGetFxStaleness(),
      apiGetPlatformConfig(),
      apiGetFxHistory({ limit: 15 }),
    ]);
    if (ratesRes.status === 'fulfilled') setRates(ratesRes.value.data ?? {});
    // Staleness only adds a badge — a failure just hides it.
    setStaleness(staleRes.status === 'fulfilled' ? staleRes.value.data ?? {} : {});
    if (configRes.status === 'fulfilled') setFxConfig(configRes.value.data.fxConfig);
    if (historyRes.status === 'fulfilled') setHistory(historyRes.value.data.items ?? []);
    setErrors({
      rates: msg(ratesRes, 'Failed to load current rates.'),
      config: msg(configRes, 'Failed to load FX settings.'),
      history: msg(historyRes, 'Failed to load rate history.'),
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleAutoRefresh(value: boolean) {
    if (!fxConfig) return;
    setSavingConfig(true);
    setConfigError('');
    try {
      const res = await apiUpdateFxConfig({ autoRefreshEnabled: value });
      setFxConfig(res.data.fxConfig);
      toast.success(value ? 'Auto-refresh turned on' : 'Auto-refresh turned off');
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to update auto-refresh.');
    } finally {
      setSavingConfig(false);
    }
  }

  const historyColumns: TableColumn<ExchangeRateHistoryRow>[] = [
    { key: 'currency', header: 'Currency', render: h => <span className="font-semibold text-charcoal">{h.currency}</span> },
    { key: 'ratePerUSD', header: 'Rate (per USD)', render: h => <span className="text-graphite">{h.ratePerUSD}</span> },
    { key: 'source', header: 'Source', render: h => <span className="text-slate capitalize">{h.source}</span> },
    { key: 'effectiveFrom', header: 'Effective From', render: h => <span className="text-slate whitespace-nowrap">{formatDate(h.effectiveFrom)}</span> },
    {
      key: 'status', header: 'Status',
      render: h => !h.isRejected ? <StatusBadge status="Active" />
        : h.rejectionReason === 'abnormal_jump' ? <StatusBadge status="Flagged" />
        : h.rejectionReason === 'sanity_band' ? <StatusBadge status="Suspended" />
        : <StatusBadge status="Held" />,
    },
  ];

  return (
    <div>
      <AdminStudioHeader eyebrow="Edudeen team workspace · Finance"
        title="FX Settings"
        subtitle="The single authoritative PKR/USD exchange rate used across checkout, settlement, and refunds."
        actions={<Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>}
      />

      <div className="px-4 sm:px-7 pt-5 pb-8 flex flex-col gap-5">
        <div className="flex gap-4 flex-wrap">
          {loading ? (
            <SkeletonBox className="h-24 w-full" />
          ) : errors.rates ? (
            <div className="w-full bg-white border border-bone rounded-xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[13px] text-error flex items-center gap-1 m-0"><AlertTriangle size={14} /> {errors.rates}</p>
              <Button variant="outline" size="sm" onClick={load}>Try again</Button>
            </div>
          ) : (
            Object.keys(rates).length === 0 ? (
              <EmptyState icon={<AlertTriangle size={28} className="text-slate" />} title="No rates configured" description="Set a manual rate below to get started." />
            ) : (
              Object.entries(rates).map(([currency, rate]) => (
                <RateCard key={currency} currency={currency} rate={rate} staleness={staleness[currency]} />
              ))
            )
          )}
        </div>

        <OverrideForm onDone={() => { toast.success('Manual rate applied'); load(); }} />

        {!loading && errors.config && !fxConfig && (
          <div className="bg-white border border-bone rounded-xl px-5 py-4">
            <p className="text-[13px] font-bold text-carbon">Auto-refresh from provider</p>
            <p className="text-[12px] text-error mt-1 flex items-center gap-1"><AlertTriangle size={13} /> {errors.config}</p>
          </div>
        )}
        {fxConfig && (
          <div className="bg-white border border-bone rounded-xl px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-carbon">Auto-refresh from provider</p>
                <p className="text-[12px] text-slate mt-[2px]">Daily automatic rate refresh (sanity-band + abnormal-jump checked before ever becoming current).</p>
              </div>
              <Toggle label="Auto-refresh rates from provider" checked={fxConfig.autoRefreshEnabled} onChange={toggleAutoRefresh} disabled={savingConfig} />
            </div>
            {configError && <p className="text-[12px] text-error mt-2 flex items-center gap-1"><AlertTriangle size={13} /> {configError}</p>}
          </div>
        )}

        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone flex items-center gap-2">
            <History size={14} className="text-slate" />
            <p className="text-[13px] font-bold text-carbon">Rate History</p>
          </div>
          {errors.history && !loading ? (
            <p className="px-5 py-6 text-center text-[13px] text-error">{errors.history}</p>
          ) : <Table
            columns={historyColumns}
            data={history}
            keyExtractor={h => h._id}
            loading={loading}
            emptyState={{ icon: <History size={28} className="text-slate" />, title: 'No history yet', description: 'Rate changes will appear here.' }}
          />}
        </div>
      </div>
    </div>
  );
}
