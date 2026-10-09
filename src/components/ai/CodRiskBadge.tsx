import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { apiCodRisk, type CodRisk } from '@/api/services/aiFeatures';

const TONE = { low: 'text-success bg-success-bg', medium: 'text-warning bg-warning-bg', high: 'text-error bg-error-bg' } as const;

/** Seller order screen: cash-on-delivery risk. The score comes from code; AI only explains it (explanation hidden when AI is off). */
export function CodRiskBadge({ storeId, orderId }: { storeId: string; orderId: string }) {
  const { enabled } = useAiFeatures(storeId);
  const [risk, setRisk] = useState<CodRisk | null>(null);
  const [failed, setFailed] = useState(false);
  const explain = enabled('cod_risk');

  useEffect(() => {
    let alive = true;
    setRisk(null); setFailed(false);
    apiCodRisk(storeId, orderId, explain)
      .then(r => { if (alive) setRisk(r.data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [storeId, orderId, explain]);

  if (failed) return null;
  if (!risk) return <p className="text-[12px] text-slate mt-2">Checking cash-on-delivery risk…</p>;
  return (
    <div className="mt-3 rounded-lg border border-bone px-3 py-2">
      <p className="flex items-center justify-between gap-2 text-[12px]">
        <span className="flex items-center gap-1.5 text-slate"><ShieldAlert size={13} /> COD risk</span>
        <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${TONE[risk.level]}`}>{risk.level} · {risk.score}/100</span>
      </p>
      {risk.explanation && <p className="text-[12px] text-graphite mt-1.5 leading-relaxed">{risk.explanation}</p>}
      <ul className="mt-1.5 list-disc ps-4 text-[11px] text-slate">{risk.factors.slice(0, 5).map(f => <li key={f.code}>{f.text}</li>)}</ul>
    </div>
  );
}
