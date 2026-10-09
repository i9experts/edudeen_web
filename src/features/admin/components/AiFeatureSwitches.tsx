import { useCallback, useEffect, useState } from 'react';
import { Toggle } from '@/components/comman/ui/Toggle';
import { Button } from '@/components/comman/ui/Button';
import { Input } from '@/components/comman/ui/Input';
import {
  apiAdminAiConfig, apiAdminAiUsage, apiAdminSetAiFlag, apiAdminSetAiStoreOverride,
  type AdminAiConfig, type AiUsageRow,
} from '@/api/services/aiFeatures';

const GROUPS: { id: string; title: string }[] = [
  { id: 'studio', title: 'AI Studio tools (seller, credits)' },
  { id: 'seller', title: 'Seller helpers' },
  { id: 'platform', title: 'Platform features' },
];

/** Kill switches for every AI feature (global + per store) and a usage/cost table. */
export function AiFeatureSwitches() {
  const [cfg, setCfg] = useState<AdminAiConfig | null>(null);
  const [usage, setUsage] = useState<AiUsageRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [storeId, setStoreId] = useState('');
  const [storeFeature, setStoreFeature] = useState('__all');

  const load = useCallback(async () => {
    try {
      const [c, u] = await Promise.all([apiAdminAiConfig(), apiAdminAiUsage(28).catch(() => null)]);
      setCfg(c.data);
      setUsage(u?.data.rows ?? []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load AI feature settings.');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const setFlag = async (feature: string, enabled: boolean) => {
    setBusy(feature);
    try { await apiAdminSetAiFlag(feature, enabled); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(null); }
  };

  const setOverride = async (sid: string, feature: string, enabled: boolean) => {
    setBusy(`${sid}:${feature}`);
    try { await apiAdminSetAiStoreOverride(sid, feature, enabled); await load(); setStoreId(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(null); }
  };

  if (error && !cfg) return <p className="text-[12px] text-error">{error}</p>;
  if (!cfg) return <p className="text-[12px] text-slate">Loading AI feature switches…</p>;

  const overrides = Object.entries(cfg.storeOverrides ?? {}).filter(([, list]) => list.length > 0);

  return (
    <div className="flex flex-col gap-4 border-t border-bone pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-carbon">AI features</p>
          <p className="text-[11px] text-slate">
            Claude {cfg.available ? 'is connected' : 'is NOT configured (set ANTHROPIC_API_KEY on the API) — AI features are hidden for users'} · models: {cfg.modelStandard} / {cfg.modelFast}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] text-graphite">All AI</span>
          <Toggle label="All AI features" checked={cfg.allEnabled} onChange={(v) => setFlag('__all', v)} />
        </div>
      </div>

      {GROUPS.map((g) => (
        <div key={g.id}>
          <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">{g.title}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {cfg.features.filter((f) => f.group === g.id).map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-2 py-1">
                <div className="min-w-0">
                  <p className="text-[12px] text-carbon truncate">{f.label}</p>
                  {g.id !== 'platform' && f.credits > 0 && <p className="text-[10px] text-slate">{f.credits} credits per use</p>}
                </div>
                <Toggle label={`${f.label} enabled`} checked={f.enabled} disabled={busy === f.key || !cfg.allEnabled} onChange={(v) => setFlag(f.key, v)} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div>
        <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Turn AI off for one store</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1"><Input label="Store ID" value={storeId} onChange={(e) => setStoreId(e.target.value.trim())} placeholder="24-character store id" /></div>
          <select aria-label="AI feature to switch for this store" value={storeFeature} onChange={(e) => setStoreFeature(e.target.value)} className="py-[9px] px-3 rounded-md border border-bone bg-white text-[13px] text-charcoal">
            <option value="__all">All AI features</option>
            {cfg.features.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <Button size="sm" variant="outline" disabled={!/^[a-f0-9]{24}$/i.test(storeId)} loading={busy === `${storeId}:${storeFeature}`} onClick={() => setOverride(storeId, storeFeature, false)}>Disable</Button>
        </div>
        {overrides.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {overrides.map(([sid, list]) => list.map((feat) => (
              <li key={`${sid}-${feat}`} className="flex items-center justify-between text-[12px] bg-cream rounded-md px-3 py-1.5">
                <span className="truncate">{sid} — {feat === '__all' ? 'all AI' : cfg.features.find((f) => f.key === feat)?.label ?? feat}</span>
                <button type="button" className="text-brand-royal underline ms-3 shrink-0" onClick={() => setOverride(sid, feat, true)}>Re-enable</button>
              </li>
            )))}
          </ul>
        )}
      </div>

      {usage.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-2">Last 28 days (estimated cost)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="text-left text-slate"><th className="py-1 pe-2">Feature</th><th className="pe-2">Calls</th><th className="pe-2">Failed</th><th className="pe-2">Tokens in/out</th><th className="pe-2">Avg ms</th><th>Est. USD</th></tr></thead>
              <tbody>
                {usage.map((r) => (
                  <tr key={r.feature} className="border-t border-bone">
                    <td className="py-1 pe-2">{r.feature}</td><td className="pe-2">{r.calls}</td><td className="pe-2">{r.failed}</td>
                    <td className="pe-2">{r.tokensIn.toLocaleString()} / {r.tokensOut.toLocaleString()}</td><td className="pe-2">{r.avgLatencyMs}</td><td>${r.estCostUsd.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
