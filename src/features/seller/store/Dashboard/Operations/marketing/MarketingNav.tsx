import { clsx } from 'clsx';
import { TabBar } from '@/components/comman/ui/TabBar';
import { MARKETING_GROUPS, type MarketingGroupId, type MarketingTabId } from './marketingTabs';

interface Props {
  group: MarketingGroupId;
  tab: MarketingTabId;
  onSelect: (group: MarketingGroupId, tab: MarketingTabId) => void;
}

/** md+: segmented control (groups) + sub-tabs. Below md: ONE select listing every tab, so nothing is hidden. */
export function MarketingNav({ group, tab, onSelect }: Props) {
  const current = MARKETING_GROUPS.find(g => g.id === group) ?? MARKETING_GROUPS[0];
  return (
    <>
      <div className="md:hidden py-2">
        <label htmlFor="mk-nav" className="sr-only">Marketing section</label>
        <select
          id="mk-nav"
          value={tab}
          onChange={e => {
            const g = MARKETING_GROUPS.find(x => x.tabs.some(t => t.id === e.target.value));
            if (g) onSelect(g.id, e.target.value as MarketingTabId);
          }}
          className="w-full min-h-11 px-3 text-[13px] font-medium border border-bone rounded-lg bg-white text-charcoal cursor-pointer"
        >
          {MARKETING_GROUPS.map(g => (
            <optgroup key={g.id} label={g.label}>
              {g.tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="hidden md:block">
        <div role="tablist" aria-label="Marketing groups" className="inline-flex gap-1 p-1 my-2 rounded-lg bg-cream">
          {MARKETING_GROUPS.map(g => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === group}
              onClick={() => onSelect(g.id, g.tabs[0].id)}
              className={clsx(
                'min-h-9 px-4 rounded-md text-[13px] font-semibold border-0 cursor-pointer transition-colors whitespace-nowrap',
                g.id === group ? 'bg-white text-brand-royal shadow-sm' : 'bg-transparent text-slate hover:text-carbon',
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
        {current.tabs.length > 1 && (
          <TabBar tabs={current.tabs} active={tab} onChange={id => onSelect(current.id, id as MarketingTabId)} />
        )}
      </div>
    </>
  );
}
