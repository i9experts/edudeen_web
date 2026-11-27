import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiUpdateStore } from '@/api/services/store';
import { Button } from '@/components/comman/ui/Button';
import { useSettingsSection } from './settingsDirty';

const inputCls = 'w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';
const iconBtn = 'size-11 sm:size-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-bone bg-white text-slate hover:text-carbon cursor-pointer';

export const MAX_SERIES = 30;
export const SERIES_NAME_MAX = 80;

const clean = (rows: string[]) => rows.map(r => r.trim().replace(/\s+/g, ' ')).filter(Boolean);

/**
 * "Product series": the names a seller groups products into (e.g. "Maths Workbook").
 * Saved on the store; the Add / Edit / Bulk product forms offer them in a dropdown.
 */
export function ProductSeriesCard({ storeId, series, refetch }: { storeId: string; series?: string[] | null; refetch: () => void }) {
  const key = JSON.stringify(series ?? []);
  const [rows, setRows] = useState<string[]>(series ?? []);
  useEffect(() => { setRows(JSON.parse(key) as string[]); }, [key]);

  const rowError = (r: string, i: number) => {
    const t = r.trim().replace(/\s+/g, ' ');
    if (!t) return null;
    if (t.length > SERIES_NAME_MAX) return `At most ${SERIES_NAME_MAX} characters.`;
    if (rows.some((o, j) => j !== i && o.trim().replace(/\s+/g, ' ').toLowerCase() === t.toLowerCase())) return 'This series is already in the list.';
    return null;
  };
  const invalid = rows.some((r, i) => rowError(r, i));
  const dirty = JSON.stringify(clean(rows)) !== JSON.stringify(clean(series ?? []));

  useSettingsSection('series', {
    label: 'Product series',
    dirty,
    blocked: invalid ? 'Fix the highlighted names in Product series first.' : null,
    discard: () => setRows(JSON.parse(key) as string[]),
    save: async () => {
      await apiUpdateStore({ storeId, productSeries: clean(rows) });
      refetch();
    },
  });

  return (
    <div id="series" className="rounded-xl border border-bone bg-white p-5 scroll-mt-24">
      <p className="text-[13.5px] font-semibold text-charcoal mb-1">Product series</p>
      <p className="text-[12.5px] text-slate leading-relaxed mb-4">
        Add the series your products belong to, e.g. “Maths Workbook”. When you add or edit a product you pick its series from this list, so buyers see the
        whole series together. Up to {MAX_SERIES} series.
      </p>
      <div className="flex flex-col gap-2 mb-3">
        {rows.map((r, i) => {
          const err = rowError(r, i);
          return (
            <div key={i}>
              <div className="flex items-center gap-2">
                <input aria-label={`Series ${i + 1}`} className={inputCls} maxLength={SERIES_NAME_MAX} value={r} placeholder="Series name"
                  onChange={e => setRows(rs => rs.map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" className={iconBtn} aria-label={`Delete series ${i + 1}`} onClick={() => setRows(rs => rs.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
              </div>
              {err && <p role="alert" className="text-[12px] text-red-600 mt-1">{err}</p>}
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-[12.5px] text-slate">No series yet. Add one to see it in the product form.</p>}
      </div>
      <Button size="sm" variant="outline" disabled={rows.length >= MAX_SERIES} onClick={() => setRows(rs => [...rs, ''])}>
        <Plus size={13} className="inline align-middle me-1" /> Add series
      </Button>
      <span className="text-[12px] text-slate ms-2">· {rows.length}/{MAX_SERIES}</span>
    </div>
  );
}
