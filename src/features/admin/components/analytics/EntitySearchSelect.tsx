import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface EntityOption { id: string; label: string; sub?: string }

interface EntitySearchSelectProps {
  label:       string;
  placeholder: string;
  /** Currently selected id, or '' for none — owned by the parent's filter state. */
  selectedId:  string;
  onSelect:    (option: EntityOption | null) => void;
  /** Resolves a typed query into candidate rows — e.g. store or seller name search. */
  search:      (query: string) => Promise<EntityOption[]>;
}

/** Name-search drill-down — types a store/seller name, picks from real matches,
 *  the raw id is only what actually gets sent to the API. Nobody has to know
 *  or paste a Mongo ObjectId by hand. */
export function EntitySearchSelect({ label, placeholder, selectedId, onSelect, search }: EntitySearchSelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [results, setResults] = useState<EntityOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!selectedId) setSelectedLabel(''); }, [selectedId]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      search(query.trim())
        .then(rows => { if (!cancelled) setResults(rows); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, open, search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayValue = selectedId ? selectedLabel : query;

  return (
    <div ref={ref} className="relative w-[220px]">
      <label className="block text-[12px] font-semibold text-slate mb-1">{label}</label>
      <div className="relative">
        <Search size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
        <input
          value={displayValue}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
            if (selectedId) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-[30px] pr-8 py-[9px] text-[13px] text-carbon border border-bone rounded-lg outline-none transition-colors focus:border-brand-orange"
        />
        {selectedId && (
          <button
            type="button"
            onClick={() => { onSelect(null); setQuery(''); }}
            aria-label={`Clear ${label}`}
            className="absolute right-[8px] top-1/2 -translate-y-1/2 text-slate hover:text-charcoal bg-transparent border-0 cursor-pointer p-0"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && !selectedId && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-bone rounded-lg max-h-[220px] overflow-y-auto">
          {loading ? (
            <p className="px-3 py-[10px] text-[12px] text-slate">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-[10px] text-[12px] text-slate">No matches for "{query.trim()}"</p>
          ) : (
            results.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { onSelect(r); setSelectedLabel(r.label); setQuery(''); setOpen(false); }}
                className="w-full text-left px-3 py-[9px] text-[12.5px] bg-transparent border-0 cursor-pointer hover:bg-cream transition-colors"
              >
                <div className="font-medium text-charcoal truncate">{r.label}</div>
                {r.sub && <div className="text-[12px] text-slate truncate">{r.sub}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
