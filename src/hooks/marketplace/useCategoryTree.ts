import { useEffect, useMemo, useState } from 'react';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { subscribeLive } from '@/api/realtime';

// The marketplace category tree changes rarely — fetched once per page load
// and shared by the breadcrumb, category pages and search filters.
let cached: CategoryNode[] | null = null;
let inflight: Promise<CategoryNode[]> | null = null;

function loadTree(): Promise<CategoryNode[]> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = apiGetCategoryTree()
      .then(res => { cached = res.data ?? []; return cached; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

const listeners = new Set<(t: CategoryNode[]) => void>();

/** Drop the shared tree and refetch it; every mounted useCategoryTree (header menus, quick-access rail, category pages) updates. */
export function refreshCategoryTree(): Promise<void> {
  cached = null;
  inflight = null;
  return loadTree().then(t => { listeners.forEach(l => l(t)); }).catch(() => {});
}

// Categories added / renamed / reordered / given new products: menus and tiles update on their own.
if (typeof window !== 'undefined') subscribeLive(['categories', 'catalog'], () => { if (listeners.size) void refreshCategoryTree(); });

export interface CategoryEntry {
  node: CategoryNode;
  /** The category directly above this one — null for a main category. */
  parent: CategoryNode | null;
  /** Every category above this one, main category first (empty for a main category). */
  ancestors: CategoryNode[];
}

/** Main categories (with nested children) plus id/slug lookups across every level. */
export function useCategoryTree() {
  const [tree, setTree] = useState<CategoryNode[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const onRefresh = (t: CategoryNode[]) => { setTree(t); setLoading(false); };
    listeners.add(onRefresh);
    return () => { listeners.delete(onRefresh); };
  }, []);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    loadTree()
      .then(t => { if (alive) setTree(t); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const { byId, bySlug } = useMemo(() => {
    const byId = new Map<string, CategoryEntry>();
    const bySlug = new Map<string, CategoryEntry>();
    for (const root of tree) {
      const add = (node: CategoryNode, ancestors: CategoryNode[]) => {
        const entry: CategoryEntry = { node, parent: ancestors[ancestors.length - 1] ?? null, ancestors };
        byId.set(node._id, entry);
        if (node.slug) bySlug.set(node.slug.toLowerCase(), entry);
        for (const child of node.children ?? []) add(child, [...ancestors, node]);
      };
      add(root, []);
    }
    return { byId, bySlug };
  }, [tree]);

  return { tree, loading, byId, bySlug };
}

/** URL that shows a category: the homepage is the shop (`/?category=<slug>`). */
export function categoryUrl(slug: string): string {
  return `/?category=${encodeURIComponent(slug)}`;
}

/** Same, from a category node. */
export function categoryPath(node: { slug?: string | null; _id: string }): string {
  return categoryUrl(node.slug || node._id);
}
