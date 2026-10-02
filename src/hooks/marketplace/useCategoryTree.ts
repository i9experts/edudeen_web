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
  /** The main category this one sits under — null for a main category. */
  parent: CategoryNode | null;
}

/** Main categories (with children) plus id/slug lookups across both levels. */
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
      const add = (node: CategoryNode, parent: CategoryNode | null) => {
        const entry = { node, parent };
        byId.set(node._id, entry);
        if (node.slug) bySlug.set(node.slug.toLowerCase(), entry);
      };
      add(root, null);
      for (const child of root.children ?? []) add(child, root);
    }
    return { byId, bySlug };
  }, [tree]);

  return { tree, loading, byId, bySlug };
}

/** URL for a category page. */
export function categoryPath(node: { slug?: string | null; _id: string }): string {
  return `/c/${node.slug || node._id}`;
}
