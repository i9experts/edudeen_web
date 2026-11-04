import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SkeletonBox } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';

export interface CollectionTab { id: string; name: string; count: number }

const VISIBLE_ON_DESKTOP = 8;

interface Props {
  collections: CollectionTab[];
  total: number;
  activeId: string;
  onSelect: (id: string) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  primaryColor: string;
  textColor: string;
}

// Collection tabs of a store page ("Offer (12)"). Counts come from catalog-facets, empty collections are already
// dropped by the API, the seller's order is kept. Phones: one horizontally scrolling row. Desktop: up to 8 tabs,
// the rest in a "More" dropdown.
export function StoreCollectionTabs({ collections, total, activeId, onSelect, loading, error, onRetry, primaryColor, textColor }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') setMoreOpen(false); return; }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [moreOpen]);

  if (loading) {
    return (
      <div className="flex gap-3 mb-3 pb-[10px] border-b border-bone" aria-hidden>
        {[88, 72, 96, 80].map((w, i) => <SkeletonBox key={i} height={20} width={w} rounded="6px" />)}
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex items-center gap-3 mb-3 text-[13px] text-slate">
        <span>Could not load collections.</span>
        <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>
      </div>
    );
  }
  if (collections.length === 0) return null;

  const tabClass = 'relative shrink-0 py-[10px] text-[13px] font-semibold bg-transparent border-none cursor-pointer whitespace-nowrap';
  const underline = (active: boolean) => (
    <span className="absolute start-0 end-0 -bottom-[1px] h-[2px] rounded-full origin-left transition-transform duration-200"
      style={{ background: primaryColor, transform: active ? 'scaleX(1)' : 'scaleX(0)' }} />
  );
  const tab = (id: string, label: string, count: number) => {
    const active = activeId === id;
    return (
      <button key={id || 'all'} type="button" role="tab" aria-selected={active} onClick={() => onSelect(id)}
        className={tabClass} style={{ color: active ? primaryColor : '#8C8A82' }}>
        {label} <span className="font-normal">({count})</span>
        {underline(active)}
      </button>
    );
  };

  const head = collections.slice(0, VISIBLE_ON_DESKTOP - 1);
  const rest = collections.slice(VISIBLE_ON_DESKTOP - 1);
  const useMore = collections.length + 1 > VISIBLE_ON_DESKTOP;
  const activeInRest = rest.some(c => c.id === activeId);

  return (
    <div className="mb-3 border-b border-bone" style={{ color: textColor }}>
      {/* Phones (and desktop when 8 or fewer): everything in one scrolling row */}
      <div role="tablist" aria-label="Collections" className={`flex items-center gap-5 overflow-x-auto scrollbar-none ${useMore ? 'md:hidden' : ''}`}>
        {tab('', 'All Products', total)}
        {collections.map(c => tab(c.id, c.name, c.count))}
      </div>

      {useMore && (
        <div role="tablist" aria-label="Collections" className="hidden md:flex items-center gap-5">
          {tab('', 'All Products', total)}
          {head.map(c => tab(c.id, c.name, c.count))}
          <div ref={moreRef} className="relative shrink-0">
            <button type="button" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen(o => !o)}
              className={`${tabClass} inline-flex items-center gap-1`} style={{ color: activeInRest ? primaryColor : '#8C8A82' }}>
              <span>More</span> <span className="font-normal">({rest.length})</span> <ChevronDown size={13} className="rtl:scale-x-[-1]" />
              {underline(activeInRest)}
            </button>
            {moreOpen && (
              <ul role="menu" className="absolute z-20 top-full end-0 mt-1 min-w-[200px] max-h-[320px] overflow-y-auto bg-white border border-bone rounded-lg shadow-lg py-1">
                {rest.map(c => (
                  <li key={c.id} role="none">
                    <button type="button" role="menuitem" onClick={() => { onSelect(c.id); setMoreOpen(false); }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-start text-[13px] bg-transparent border-none cursor-pointer hover:bg-cream text-charcoal"
                      style={c.id === activeId ? { color: primaryColor, fontWeight: 700 } : undefined}>
                      <span className="truncate">{c.name}</span>
                      <span className="text-slate shrink-0">({c.count})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
