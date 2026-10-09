import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { apiGetModerationReview, apiRunModerationReview, type ModerationReview } from '@/api/services/aiFeatures';

const TONE: Record<string, string> = {
  suitable: 'text-success', all_ages: 'text-success', low: 'text-success', approve: 'text-success',
  needs_review: 'text-warning', teen_and_up: 'text-warning', medium: 'text-warning', needs_changes: 'text-warning', unclear: 'text-warning',
  unsuitable: 'text-error', adult_only: 'text-error', high: 'text-error', reject: 'text-error',
};
const LABEL: Record<string, string> = {
  suitable: 'Suitable', needs_review: 'Needs review', unsuitable: 'Unsuitable',
  all_ages: 'All ages', teen_and_up: 'Teen and up', adult_only: 'Adults only', unclear: 'Unclear',
  low: 'Low', medium: 'Medium', high: 'High', approve: 'Approve', needs_changes: 'Needs changes', reject: 'Reject',
};

/** Advisory AI pre-check shown beside Approve / Needs changes. The admin always decides. */
export function AiModerationPanel({ listingId }: { listingId: string }) {
  const { enabled } = useAiFeatures();
  const [review, setReview] = useState<ModerationReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const on = enabled('moderation_review');

  useEffect(() => {
    if (!on) return;
    let alive = true;
    apiGetModerationReview(listingId).then(r => { if (alive) setReview(r.data); }).catch(() => undefined);
    return () => { alive = false; };
  }, [listingId, on]);

  if (!on) return null;

  async function run() {
    setBusy(true); setError('');
    try { setReview((await apiRunModerationReview(listingId)).data); }
    catch (err) { setError(err instanceof Error ? err.message : 'AI review is unavailable right now.'); }
    finally { setBusy(false); }
  }

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex items-center justify-between gap-2"><span className="text-slate">{k}</span><b className={TONE[v] ?? 'text-carbon'}>{LABEL[v] ?? v}</b></div>
  );

  return (
    <div className="rounded-lg border border-bone px-3 py-3 bg-brand-pale-orange/40">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[12px] uppercase tracking-[0.06em] text-slate font-semibold flex items-center gap-1.5"><Sparkles size={12} /> AI pre-check (advisory)</p>
        <Button size="sm" variant="outline" loading={busy} onClick={run}>{review ? 'Re-run' : 'Run AI check'}</Button>
      </div>
      {!review && !busy && <p className="text-[12px] text-slate">Claude reviews the text and photos and suggests a decision. You make the final call.</p>}
      {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      {review && (
        <div className="flex flex-col gap-2 text-[12.5px]">
          <Row k="Islamic suitability" v={review.islamicSuitability} />
          <Row k="Age suitability" v={review.ageSuitability} />
          <Row k="Copyright risk" v={review.copyrightRisk} />
          <Row k="Suggested decision" v={review.suggestedDecision} />
          {review.reasons.length > 0 && <ul className="list-disc ps-4 text-charcoal">{review.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
          {review.qualityIssues.length > 0 && (
            <div><p className="text-slate">Quality issues</p><ul className="list-disc ps-4 text-charcoal">{review.qualityIssues.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
          )}
          <p className="text-[12px] text-slate">AI can be wrong. Nothing is approved or rejected automatically.</p>
        </div>
      )}
    </div>
  );
}
