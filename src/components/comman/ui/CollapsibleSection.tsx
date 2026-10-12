import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

export interface AccordionItem {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Small status chip on the closed header (e.g. "On", "Off", "3 active"). */
  status?: ReactNode;
  content: ReactNode;
}

/**
 * A stack of sections where only the header is visible until clicked — keeps long settings pages short.
 * One section is open at a time. A section that has been opened stays mounted (just hidden) so unsaved
 * edits survive switching, and sections never opened are not rendered (so they don't fetch anything).
 */
export function Accordion({ items, defaultOpen = null }: { items: AccordionItem[]; defaultOpen?: string | null }) {
  const [open, setOpen] = useState<string | null>(defaultOpen);
  const [visited, setVisited] = useState<Set<string>>(() => new Set(defaultOpen ? [defaultOpen] : []));

  const toggle = (id: string) => {
    setOpen(prev => (prev === id ? null : id));
    setVisited(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  return (
    <div className="flex flex-col gap-3">
      {items.map(item => {
        const isOpen = open === item.id;
        return (
          <section key={item.id} className={clsx('bg-white border rounded-xl overflow-hidden transition-colors', isOpen ? 'border-brand-orange/40' : 'border-bone')}>
            <button
              type="button"
              id={`acc-h-${item.id}`}
              aria-expanded={isOpen}
              aria-controls={`acc-p-${item.id}`}
              onClick={() => toggle(item.id)}
              className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-start bg-transparent border-none cursor-pointer hover:bg-cream/60 transition-colors"
            >
              {item.icon && <span className="w-9 h-9 rounded-[10px] bg-brand-pale-orange text-brand-orange flex items-center justify-center shrink-0">{item.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-carbon">{item.title}</span>
                {item.description && <span className="block text-[12px] text-slate mt-0.5">{item.description}</span>}
              </span>
              {item.status && <span className="shrink-0 text-[12px]">{item.status}</span>}
              <ChevronDown size={18} className={clsx('shrink-0 text-slate transition-transform duration-200', isOpen && 'rotate-180')} />
            </button>
            {visited.has(item.id) && (
              <div id={`acc-p-${item.id}`} role="region" aria-labelledby={`acc-h-${item.id}`} hidden={!isOpen} className="border-t border-bone p-3 sm:p-4 bg-cream/40">
                {item.content}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
