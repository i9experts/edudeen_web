import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import type { OnboardingChecklist } from '@/api/services/storeDashboard';
import { StudioPanel } from '@/features/seller/components/studio/Studio';

/** Setup progress for a new store, computed server-side from real data. Hidden once everything is done. */
export function OnboardingChecklistCard({ checklist, storeId }: { checklist: OnboardingChecklist; storeId: string }) {
  const navigate = useNavigate();
  if (checklist.allDone) return null;

  return (
    <StudioPanel title="Finish setting up your store" sub={`${checklist.completed} of ${checklist.total} steps done`}>
      <div
        className="h-2 rounded-full bg-mist overflow-hidden mb-4"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={checklist.percent}
        aria-label="Store setup progress"
      >
        <div className="h-full bg-brand-royal transition-all duration-300" style={{ width: `${checklist.percent}%` }} />
      </div>
      <ul className="flex flex-col gap-1">
        {checklist.steps.map(step => (
          <li key={step.key}>
            <button
              type="button"
              disabled={step.done}
              onClick={() => navigate(`/store/${storeId}/${step.path}`)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left bg-transparent border-0 cursor-pointer hover:bg-cream disabled:cursor-default disabled:hover:bg-transparent"
            >
              {step.done
                ? <CheckCircle2 size={18} className="text-success shrink-0" />
                : <Circle size={18} className="text-slate shrink-0" />}
              <span className={`text-[13.5px] flex-1 ${step.done ? 'text-slate line-through' : 'text-carbon font-medium'}`}>
                {step.label}{step.notNeeded ? ' (not needed yet)' : ''}
              </span>
              {!step.done && <ArrowRight size={14} className="text-slate shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    </StudioPanel>
  );
}
