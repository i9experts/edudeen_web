import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { useStorefront, useStorefrontPaths } from '../StorefrontContext';

export interface FeaturedCategoryGridSectionSettings {
  heading?:     string;
  categoryIds:  string[];
}

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap(n => [n, ...flatten(n.children ?? [])]);
}

// Links out to /category/:slug (store-scoped category browse) — a tile for
// each of the seller's chosen categories, resolved against the real shared
// category tree (the same one every seller's subcategories already live in).
// A category the store no longer has active products in still shows (as a
// safe empty-count tile) rather than silently vanishing, so the grid never
// looks broken mid-edit.
export function FeaturedCategoryGridSection({ settings }: { settings: FeaturedCategoryGridSectionSettings }) {
  const { cfg } = useStorefront();
  const { path } = useStorefrontPaths();
  const [categories, setCategories] = useState<CategoryNode[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGetCategoryTree()
      .then(res => { if (!cancelled) setCategories(flatten(res.data ?? [])); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const ids = settings.categoryIds ?? [];
  if (ids.length === 0) return null;
  const tiles = ids
    .map(id => categories.find(c => c._id === id))
    .filter((c): c is CategoryNode => !!c);
  if (tiles.length === 0) return null; // still loading, or every referenced category was deleted

  return (
    <div className="px-4 sm:px-6 lg:px-10" style={{ paddingTop: 32 * cfg.sectionSpacingScale, paddingBottom: 32 * cfg.sectionSpacingScale }}>
      <div className="mx-auto" style={{ maxWidth: Math.round(1100 * cfg.containerWidthScale) }}>
        {settings.heading && (
          <h2 className="font-bold mb-5 text-center" style={{ color: cfg.textColor, fontSize: Math.round(20 * cfg.typeScaleFactor) }}>
            {settings.heading}
          </h2>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tiles.map(cat => (
            <Link
              key={cat._id}
              to={path(`/category/${cat.slug || cat._id}`)}
              className="group relative rounded-xl overflow-hidden aspect-[4/3] flex items-end no-underline"
              style={{ background: cat.image ? undefined : `${cfg.primaryColor}15` }}
            >
              {cat.image && (
                <img
                  src={cat.image} alt={cat.name} loading="lazy" decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0" style={{ background: cat.image ? 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))' : undefined }} />
              <span
                className="relative z-[1] px-3.5 py-3 text-[13px] font-semibold"
                style={{ color: cat.image ? '#fff' : cfg.textColor }}
              >
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
