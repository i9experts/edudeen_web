import type { Category, CategoryNode } from '@/api/services/categories';

const selCls = 'w-full px-3 py-2 text-[13px] border border-bone rounded-lg text-charcoal bg-white outline-none cursor-pointer disabled:opacity-60';

interface Props {
  mainCategoryName: string;
  /** Kept for API compatibility with existing callers. */
  mainCategoryId?:  string;
  /** The chosen main category's direct children (each with their own `children`, any depth). */
  subcategories:    CategoryNode[];
  loading:          boolean;
  /** Deepest chosen node id (the value saved as subCategoryId); '' = none. */
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

const LEVEL_LABELS = ['Subcategory', 'Sub-subcategory', 'Third-level subcategory'];

/** Path of nodes from the first level down to `id` ([] when not in this subtree). */
function pathTo(nodes: CategoryNode[], id: string): CategoryNode[] {
  for (const n of nodes) {
    if (n._id === id) return [n];
    const rest = pathTo(n.children ?? [], id);
    if (rest.length) return [n, ...rest];
  }
  return [];
}

// The seller picks any active main category for each product, then walks down
// its subcategories one level at a time (a further select appears whenever the
// chosen node has children). The saved value is the deepest chosen node.
// Without `categories` (legacy callers) the main category is shown read-only.
export function SubcategoryField({
  mainCategoryName, subcategories, loading, value, onChange, refetch,
  categories, categoryId = '', onCategoryChange, categoriesError,
}: Props) {
  const editable = !!categories && !!onCategoryChange;
  const path = value ? pathTo(subcategories, value) : [];

  // One select per level: level 0 lists the root's children, level i lists children of path[i-1].
  const levels: { options: CategoryNode[]; selected: string }[] = [];
  let options = subcategories;
  for (let i = 0; i <= path.length; i++) {
    if (!options.length) break;
    levels.push({ options, selected: path[i]?._id ?? '' });
    options = path[i]?.children ?? [];
  }
  if (!levels.length) levels.push({ options: [], selected: '' });

  const pick = (level: number, id: string) => {
    // Clearing a level falls back to the level above (or no subcategory at all).
    onChange(id || (level > 0 ? path[level - 1]._id : ''));
  };

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
      {levels.map((lv, i) => {
        const id = i === 0 ? 'product-subcategory' : `product-subcategory-${i + 1}`;
        const label = LEVEL_LABELS[i] ?? `Level ${i + 2} subcategory`;
        return (
          <div key={id}>
            <label htmlFor={id} className="text-[12px] font-semibold text-graphite block mb-1.5">
              {label} <span className="font-normal text-slate">(optional)</span>
            </label>
            <select id={id} value={lv.selected} onChange={e => pick(i, e.target.value)} disabled={loading} className={selCls}>
              <option value="">{loading ? 'Loading…' : i === 0 ? 'No subcategory' : `No ${label.toLowerCase()}`}</option>
              {lv.options.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            {i === 0 && (
              <p className="text-[12px] text-slate mt-1.5">
                Subcategories are shared across Edudeen. Missing one? Ask Edudeen support to add it.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
