import type { Category } from '@/api/services/categories';

const selCls = 'w-full px-3 py-2 text-[13px] border border-bone rounded-lg text-charcoal bg-white outline-none cursor-pointer disabled:opacity-60';

interface Props {
  mainCategoryName: string;
  /** Kept for API compatibility with existing callers. */
  mainCategoryId?:  string;
  subcategories:    Category[];
  loading:          boolean;
  value:            string;
  onChange:         (id: string) => void;
  /** Kept for API compatibility — sellers can no longer create subcategories here. */
  onCreated?:       (newId: string) => void;
  refetch?:         () => void;
}

// Category always comes from the store's own main category — sellers never
// pick or see any other main category here (server: store.categoryId is
// fixed at store creation and drives every product's categoryId).
//
// Subcategories are platform-wide (shared by every store under this main
// category), so sellers only PICK an existing one — creating new ones from the
// seller workspace was removed; the Edudeen team curates the list.
export function SubcategoryField({ mainCategoryName, subcategories, loading, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-[12px] font-semibold text-graphite block mb-1.5">Category</label>
        <div className="px-3 py-2 text-[13px] rounded-lg bg-cream border border-bone text-charcoal">
          {mainCategoryName || '—'}
        </div>
      </div>
      <div>
        <label className="text-[12px] font-semibold text-graphite block mb-1.5">Subcategory</label>
        <select value={value} onChange={e => onChange(e.target.value)} disabled={loading} className={selCls}>
          <option value="">{loading ? 'Loading…' : 'No subcategory'}</option>
          {subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <p className="text-[11.5px] text-slate mt-1.5">
          Subcategories are shared across Edudeen. Missing one? Ask Edudeen support to add it.
        </p>
      </div>
    </div>
  );
}
