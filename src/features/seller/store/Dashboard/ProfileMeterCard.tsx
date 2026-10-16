import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import type { ProfileCompleteness } from '@/api/services/storeDashboard';
import { StudioPanel } from '@/features/seller/components/studio/Studio';

/** Where each missing item is fixed (path relative to /store/:storeId/). */
const FIX_PATH: Record<string, string> = { logo: 'settings', banner: 'settings', bio: 'settings', products: 'products/add' };

/**
 * Profile completeness meter: logo, banner, bio (30+ characters) and 5+ published products - exactly what the
 * home page needs before it features a store. Computed server-side from real data.
 */
export function ProfileMeterCard({ profile, storeId }: { profile: ProfileCompleteness; storeId: string }) {
  const navigate = useNavigate();
  return (
    <StudioPanel title="Store profile" sub={profile.complete ? 'Profile complete' : `${profile.percent}% complete`}>
      <div
        className="h-2 rounded-full bg-mist overflow-hidden mb-3"
        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profile.percent} aria-label="Store profile completeness"
      >
        <div className="h-full bg-brand-royal transition-all duration-300" style={{ width: `${profile.percent}%` }} />
      </div>
      <ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {profile.items.map(it => (
          <li key={it.key}>
            <button
              type="button"
              disabled={it.done}
              onClick={() => navigate(`/store/${storeId}/${FIX_PATH[it.key] ?? 'settings'}`)}
              className="w-full flex items-center gap-2.5 px-2 py-2 min-h-10 rounded-lg text-start bg-transparent border-0 cursor-pointer hover:bg-cream disabled:cursor-default disabled:hover:bg-transparent"
            >
              {it.done ? <CheckCircle2 size={18} className="text-success shrink-0" /> : <Circle size={18} className="text-slate shrink-0" />}
              <span className="flex-1 min-w-0">
                <span className={`block text-[13.5px] ${it.done ? 'text-slate' : 'text-carbon font-medium'}`}>{it.label}</span>
                {!it.done && <span className="block text-[12px] text-slate">{it.detail}</span>}
              </span>
              {!it.done && <ArrowRight size={14} className="text-slate shrink-0 rtl:rotate-180" />}
            </button>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-3 text-[12.5px] text-graphite">
        {profile.complete
          ? 'Complete profile = eligible to be featured on the home page.'
          : 'Complete profile = eligible to be featured on the home page. Finish the items above.'}
      </p>
    </StudioPanel>
  );
}