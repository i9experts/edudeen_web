import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { DialogShell } from './DialogShell';

export interface CommandPaletteItem {
  id:       string;
  label:    string;
  group?:   string;
  icon?:    LucideIcon;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  items:   CommandPaletteItem[];
  open:    boolean;
  onClose: () => void;
}

export function CommandPalette({ items, open, onClose }: CommandPaletteProps) {
  const [query, setQuery]                 = useState('');
  const [highlighted, setHighlighted]     = useState(0);
  const inputRef                          = useRef<HTMLInputElement>(null);
  const [wasOpen, setWasOpen]             = useState(open);

  // Reset the query/highlight when the palette transitions from closed to
  // open. Adjusted during render (not in an effect) per React's guidance for
  // resetting state on a prop change.
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setHighlighted(0);
    }
  }

  useEffect(() => {
    if (open) {
      // Focus the input rather than the dialog container.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(item => item.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    setHighlighted(0);
  };

  if (!open) return null;

  const runItem = (item: CommandPaletteItem | undefined) => {
    if (!item) return;
    item.onSelect();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(i => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(i => (filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(filtered[highlighted]);
    }
  };

  // Group items in-order while preserving first-seen group ordering.
  const groups: { group: string; items: CommandPaletteItem[] }[] = [];
  filtered.forEach(item => {
    const groupName = item.group ?? '';
    const existing = groups.find(g => g.group === groupName);
    if (existing) existing.items.push(item);
    else groups.push({ group: groupName, items: [item] });
  });

  let flatIndex = -1;

  return (
    <DialogShell
      onClose={onClose}
      align="top"
      ariaLabel="Command palette"
      onKeyDown={onKeyDown}
      className="max-w-[560px] max-h-[70vh]"
    >
        <div className="flex items-center gap-[10px] px-4 py-3 border-b border-bone shrink-0">
          <Search size={16} className="text-slate shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Search pages, actions…"
            className="flex-1 bg-transparent border-0 outline-none text-[14px] text-carbon placeholder:text-slate"
          />
          <kbd className="text-[10px] font-semibold text-slate bg-cream border border-bone rounded-md px-[6px] py-[2px] shrink-0">
            Esc
          </kbd>
        </div>

        <div className="overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="text-[13px] text-slate text-center py-6">No matching pages or actions.</p>
          )}

          {groups.map(group => (
            <div key={group.group || '__ungrouped'} className="mb-1">
              {group.group && (
                <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] px-4 py-1">
                  {group.group}
                </p>
              )}
              {group.items.map(item => {
                flatIndex += 1;
                const isHighlighted = flatIndex === highlighted;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setHighlighted(flatIndex)}
                    onClick={() => runItem(item)}
                    className={clsx(
                      'w-full flex items-center gap-[10px] px-4 py-[9px] text-start border-none cursor-pointer transition-colors duration-100',
                      isHighlighted ? 'bg-brand-pale-orange' : 'bg-transparent hover:bg-cream',
                    )}
                  >
                    {Icon && (
                      <Icon
                        size={15}
                        className={clsx('shrink-0', isHighlighted ? 'text-brand-orange' : 'text-slate')}
                      />
                    )}
                    <span className={clsx(
                      'text-[13px] flex-1 truncate',
                      isHighlighted ? 'font-semibold text-carbon' : 'font-normal text-carbon',
                    )}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
    </DialogShell>
  );
}
