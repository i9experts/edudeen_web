import { Check, Minus } from 'lucide-react';
import type { PlatformPlan, PlatformPlanLimits } from '@/api/services/platformPlans';

// Comparison rows come ONLY from plan config (PlatformPlan.limits). A row whose field no plan carries is skipped.
// There is deliberately no "products limit" row: maxProducts is informational and not enforced.
type RowKind = 'bool' | 'count' | 'credits';
const ROWS: { key: keyof PlatformPlanLimits; label: string; kind: RowKind }[] = [
  { key: 'maxActivePromotions', label: 'Promotions at a time', kind: 'count' },
  { key: 'advancedAnalyticsAllowed', label: 'Advanced analytics', kind: 'bool' },
  { key: 'advancedSeoToolsAllowed', label: 'SEO tools', kind: 'bool' },
  { key: 'seoAiSuggestionsAllowed', label: 'AI SEO suggestions', kind: 'bool' },
  { key: 'emailCampaignsAllowed', label: 'Email campaigns', kind: 'bool' },
  { key: 'prioritySupport', label: 'Priority support', kind: 'bool' },
  { key: 'marketplaceFeaturedBadge', label: 'Featured badge', kind: 'bool' },
  { key: 'aiCreditsPerMonth', label: 'AI credits per month', kind: 'credits' },
];

const has = (p: PlatformPlan, key: keyof PlatformPlanLimits) => p.limits?.[key] !== undefined && p.limits?.[key] !== null;

/** Rows that at least one plan configures. */
function configuredRows(plans: PlatformPlan[]) {
  return ROWS.filter(r => plans.some(p => has(p, r.key)));
}

/** What every plan includes, derived by intersecting plan config + marketing bullets (nothing hardcoded). */
export function commonToAllPlans(plans: PlatformPlan[]): { labels: string[]; boolKeys: Set<string>; bullets: Set<string> } {
  const boolKeys = new Set<string>();
  const bullets = new Set<string>();
  if (plans.length < 2) return { labels: [], boolKeys, bullets };
  for (const r of configuredRows(plans)) {
    if (r.kind === 'bool' && plans.every(p => p.limits?.[r.key] === true)) boolKeys.add(r.key);
  }
  const [first, ...rest] = plans;
  for (const b of first.featureBullets ?? []) {
    if (rest.every(p => (p.featureBullets ?? []).includes(b))) bullets.add(b);
  }
  const labels = [
    ...ROWS.filter(r => boolKeys.has(r.key)).map(r => r.label),
    ...bullets,
  ];
  return { labels, boolKeys, bullets };
}

function Cell({ plan, row }: { plan: PlatformPlan; row: typeof ROWS[number] }) {
  const v = plan.limits?.[row.key];
  if (row.kind === 'bool') {
    return v ? <Check size={15} className="inline text-success" aria-label="Included" /> : <Minus size={15} className="inline text-slate" aria-label="Not included" />;
  }
  if (typeof v !== 'number') return <Minus size={15} className="inline text-slate" aria-label="Not set" />;
  if (v === -1) return <span>Unlimited</span>;
  if (row.kind === 'credits' && v === 0) return <Minus size={15} className="inline text-slate" aria-label="None" />;
  return <span>{v.toLocaleString()}</span>;
}

export function PlanComparisonTable({ plans, currentPlanId }: { plans: PlatformPlan[]; currentPlanId: string | null }) {
  const { boolKeys } = commonToAllPlans(plans);
  const rows = configuredRows(plans).filter(r => !boolKeys.has(r.key));
  if (plans.length < 2 || rows.length === 0) return null;
  return (
    <section className="bg-white border border-bone rounded-[10px] overflow-hidden" aria-label="Compare plans">
      <div className="px-5 py-[14px] border-b border-bone"><h2 className="text-[13px] font-bold text-carbon m-0">Compare plans</h2></div>
      {/* The table scrolls inside this box, never the page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[12.5px] border-collapse">
          <thead>
            <tr className="text-left text-slate">
              <th scope="col" className="px-5 py-2.5 font-medium sticky start-0 bg-white">Feature</th>
              {plans.map(p => (
                <th key={p._id} scope="col" className={`px-3 py-2.5 font-semibold text-center ${p._id === currentPlanId ? 'text-brand-orange' : 'text-carbon'}`}>{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className="border-t border-[#f0eee6]">
                <th scope="row" className="px-5 py-2.5 text-start font-normal text-graphite sticky start-0 bg-white">{r.label}</th>
                {plans.map(p => <td key={p._id} className="px-3 py-2.5 text-center text-carbon"><Cell plan={p} row={r} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
