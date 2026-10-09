import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { apiReviewSummary, type ReviewSummary } from '@/api/services/aiFeatures';

/** "What buyers say" — AI summary of the real reviews (needs at least 3). Renders nothing when unavailable. */
export function AiReviewSummary({ productId }: { productId: string }) {
  const { enabled } = useAiFeatures();
  const on = enabled('review_summary');
  const [data, setData] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    if (!on) return;
    let alive = true;
    apiReviewSummary(productId).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [productId, on]);

  if (!on || !data?.available || !data.summary) return null;
  return (
    <section aria-label="AI review summary" className="mb-5 rounded-xl border border-bone bg-brand-pale-orange/50 px-5 py-4">
      <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.06em] flex items-center gap-1.5 mb-2">
        <Sparkles size={13} className="text-brand-royal" /> What buyers say <span className="normal-case font-normal">· AI summary of {data.reviewCount} reviews</span>
      </p>
      <p className="text-[13px] text-carbon leading-relaxed">{data.summary}</p>
      {((data.pros?.length ?? 0) > 0 || (data.cons?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-[12px]">
          {data.pros && data.pros.length > 0 && <ul className="list-disc ps-4 text-graphite">{data.pros.map(p => <li key={p}>{p}</li>)}</ul>}
          {data.cons && data.cons.length > 0 && <ul className="list-disc ps-4 text-graphite">{data.cons.map(p => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}
    </section>
  );
}
