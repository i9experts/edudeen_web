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
  /** When given, the Category block becomes a real select over these main categories. */
  categories?:      Category[];
  /** Currently chosen main category id (used with `categories`). */
  categoryId?:      string;
  onCategoryChange?: (id: string) => void;
  categoriesError?: boolean;
}

// The seller picks any active main category for each product, then one of its
// subcategories. Without `categories` (legacy callers) the main category is
// shown read-only. Subcategories are platform-wide; the Edudeen team curates them.
export function SubcategoryField({
  mainCategoryName, subcategories, loading, value, onChange, refetch,
  categories, categoryId = '', onCategoryChange, categoriesError,
}: Props) {
  const editable = !!categories && !!onCategoryChange;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="product-category" className="text-[12px] font-semibold text-graphite block mb-1.5">Category</label>
        {editable ? (
          <>
            <select
              id="product-category"
              value={categoryId}
              onChange={e => onCategoryChange!(e.target.value)}
              disabled={loading}
              className={selCls}
            >
              {loading && <option value={categoryId}>Loading…</option>}
              {!loading && !categories!.some(c => c._id === categoryId) && <option value={categoryId}>Select a category</option>}
              {categories!.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            {!loading && categoriesError && (
              <p className="text-[12px] text-red-600 mt-1.5">
                Could not load categories.{' '}
                {refetch && <button type="button" onClick={refetch} className="underline">Try again</button>}
              </p>
            )}
            {!loading && !categoriesError && categories!.length === 0 && (
              <p className="text-[12px] text-slate mt-1.5">No categories are available yet.</p>
            )}
          </>
        ) : (
          <div className="px-3 py-2 text-[13px] rounded-lg bg-cream border border-bone text-charcoal">
            {mainCategoryName || '—'}
          </div>
        )}
      </div>
      <div>
        <label htmlFor="product-subcategory" className="text-[12px] font-semibold text-graphite block mb-1.5">Subcategory</label>
        <select id="product-subcategory" value={value} onChange={e => onChange(e.target.value)} disabled={loading} className={selCls}>
          <option value="">{loading ? 'Loading…' : 'No subcategory'}</option>
          {subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <p className="text-[12px] text-slate mt-1.5">
          Subcategories are shared across Edudeen. Missing one? Ask Edudeen support to add it.
        </p>
      </div>
    </div>
  );
}