import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart } from 'lucide-react';
import { Toggle } from '@/components/comman/ui/Toggle';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import {
  aiErrorInfo, apiDigestSettings, apiLatestInsights, apiSetDigestSettings, type DigestSettings, type InsightsPayload,
} from '@/api/services/aiFeatures';

/**
 * Seller dashboard card for the weekly AI digest. The digest is OPT-IN (off by default) and each run uses AI credits,
 * so the switch says so. Hidden entirely when AI is not configured or the admin switched the feature off.
 */
export function WeeklyDigestCard({ storeId }: { storeId: string }) {
  const { enabled, loading: featuresLoading } = useAiFeatures(storeId);
  const on = enabled('weekly_insights');
  const [settings, setSettings] = useState<DigestSettings | null>(null);
  const [latest, setLatest] = useState<InsightsPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!on) return;
    let alive = true;
    apiDigestSettings(storeId).then(r => { if (alive) setSettings(r.data); }).catch(() => undefined);
    apiLatestInsights(storeId).then(r => { if (alive) setLatest(r.data); }).catch(() => undefined);
    return () => { alive = false; };
  }, [storeId, on]);

  if (featuresLoading || !on) return null;

  async function toggle(next: boolean) {
    setSaving(true); setError('');
    try {
      await apiSetDigestSettings(storeId, next);
      setSettings(prev => (prev ? { ...prev, weeklyDigestEnabled: next } : prev));
    } catch (e) { setError(aiErrorInfo(e).message); } finally { setSaving(false); }
  }

  const digest = latest?.digest;
  return (
    <section aria-label="Weekly insights" className="dash-section-enter bg-white border border-bone rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-charcoal flex items-center gap-2"><LineChart size={15} /> Weekly insights</p>
          <p className="text-xs text-slate mt-1">
            An AI summary of your last 7 days with 3 next steps. Optional: each weekly digest uses AI credits, and it is skipped if you run out.
          </p>
          {settings && settings.creditsPerDigest > 0 && <p className="text-[11px] text-slate mt-0.5">{`${settings.creditsPerDigest} credits per digest`}</p>}
        </div>
        {settings && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[12px] text-graphite hidden sm:inline">{settings.weeklyDigestEnabled ? 'On' : 'Off'}</span>
            <Toggle checked={settings.weeklyDigestEnabled} disabled={saving} onChange={toggle} label="Send me a weekly AI insights digest" />
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-[12px] text-error mt-2">{error}</p>}
      {digest ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="font-serif text-[17px] text-carbon leading-snug">{digest.headline}</p>
          <ul className="list-disc ps-5 text-[13px] text-graphite flex flex-col gap-1">{digest.highlights.slice(0, 3).map((h, i) => <li key={i}>{h}</li>)}</ul>
          <p className="text-[11px] text-slate">Generated {new Date(latest!.at).toLocaleDateString()}</p>
        </div>
      ) : (
        <p className="text-[12px] text-slate mt-3">No digest yet. Turn it on, or generate one now in AI Studio.</p>
      )}
      <Link to={`/store/${storeId}/ai/studio`} className="inline-block mt-3 text-[12px] font-semibold text-brand-orange underline">Open AI Studio</Link>
    </section>
  );
}
