import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import type { OnboardingChecklist, ProfileCompleteness } from '@/api/services/storeDashboard';
import { StudioPanel, StudioWorkflow } from '@/features/seller/components/studio/Studio';

/** Where each missing profile item is fixed (path relative to /store/:storeId/). */
const PROFILE_FIX_PATH: Record<string, string> = { logo: 'settings', banner: 'settings', bio: 'settings', products: 'products/add' };

const TIPS = [
  { tag: 'Learning',     title: 'Start with an outcome', body: 'Make the age, learning goal and classroom or home use clear in your title and description.' },
  { tag: 'Presentation', title: 'Show what is inside',   body: 'Give families and teachers useful images, a preview and a clear description of what they get.' },
  { tag: 'Trust',        title: 'Prepare for review',    body: 'Check accuracy, Islamic suitability and your rights to share every element before publishing.' },
];

interface Row { key: string; label: string; detail?: string; done: boolean; path: string }

/**
 * ONE setup card: store setup steps + store profile items (de-duplicated by destination label)
 * and the "make your next product ready" tips, collapsed. Hidden once setup and profile are complete.
 */
export function SetupChecklistCard({ checklist, profile, storeId }: {
  checklist?: OnboardingChecklist; profile?: ProfileCompleteness; storeId: string;
}) {
  const navigate = useNavigate();

  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const s of checklist?.steps ?? []) {
    seen.add(s.key === 'first_product' ? 'products' : s.key);
    rows.push({ key: `s-${s.key}`, label: s.label + (s.notNeeded ? ' (not needed yet)' : ''), done: s.done, path: s.path });
  }
  for (const it of profile?.items ?? []) {
    if (seen.has(it.key)) continue; // logo / banner / products already listed as a setup step
    rows.push({ key: `p-${it.key}`, label: it.label, detail: it.detail, done: it.done, path: PROFILE_FIX_PATH[it.key] ?? 'settings' });
  }

  const total = rows.length;
  if (total === 0) return null;
  const completed = rows.filter(r => r.done).length;
  if (completed === total) return null;
  const percent = Math.round((completed / total) * 100);

  return (
    <StudioPanel title="Finish setting up your store" sub={`${completed} of ${total} steps done`}>
      <div
        className="h-2 rounded-full bg-mist overflow-hidden mb-4"
        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Store setup progress"
      >
        <div className="h-full bg-brand-royal transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      <ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {rows.map(r => (
          <li key={r.key}>
            <button
              type="button"
              disabled={r.done}
              onClick={() => navigate(`/store/${storeId}/${r.path}`)}
              className="w-full flex items-center gap-3 px-2 py-2 min-h-10 rounded-lg text-start bg-transparent border-0 cursor-pointer hover:bg-cream disabled:cursor-default disabled:hover:bg-transparent"
            >
              {r.done ? <CheckCircle2 size={18} className="text-success shrink-0" /> : <Circle size={18} className="text-slate shrink-0" />}
              <span className="flex-1 min-w-0">
                <span className={`block text-[13.5px] ${r.done ? 'text-slate line-through' : 'text-carbon font-medium'}`}>{r.label}</span>
                {!r.done && r.detail && <span className="block text-[12px] text-slate">{r.detail}</span>}
              </span>
              {!r.done && <ArrowRight size={14} className="text-slate shrink-0 rtl:rotate-180" />}
            </button>
          </li>
        ))}
      </ul>
      <details className="mt-4 border-t border-bone pt-3">
        <summary className="cursor-pointer text-[13px] font-bold text-brand-royal">Make your next product ready to share</summary>
        <div className="mt-4"><StudioWorkflow steps={TIPS} /></div>
      </details>
    </StudioPanel>
  );
}
