import { useEffect, useMemo, useState } from 'react';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';

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

/** URL for a category page. */
export function categoryPath(node: { slug?: string | null; _id: string }): string {
  return `/c/${node.slug || node._id}`;
}
