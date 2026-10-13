import type { CategoryNode } from '@/api/services/categories';

// Shared by /admin/categories and the inline (edit-mode) category editor.
export const MAX_LEVELS = 4; // main > sub > sub-sub > sub-sub-sub (server-enforced)
export const LEVEL_NAMES = ['Main category', 'Subcategory', 'Sub-subcategory', 'Level 4 subcategory'];

export function flattenTree(nodes: CategoryNode[], depth = 0, out: { node: CategoryNode; depth: number }[] = []) {
  for (const n of nodes) { out.push({ node: n, depth }); flattenTree(n.children ?? [], depth + 1, out); }
  return out;
}
export function subtreeIds(node: CategoryNode): string[] {
  return [node._id, ...(node.children ?? []).flatMap(subtreeIds)];
}
export function countDescendants(node: CategoryNode): number {
  return (node.children ?? []).reduce((a, c) => a + 1 + countDescendants(c), 0);
}
export function rootOf(roots: CategoryNode[], id: string): CategoryNode | null {
  return roots.find(r => subtreeIds(r).includes(id)) ?? null;
}

/** Where a deleted category's products can move: another main category (for a main one) or anything else in the same main category. */
export function deleteTargets(category: CategoryNode, roots: CategoryNode[]): { id: string; label: string }[] {
  if (!category.parentId) return roots.filter(r => r._id !== category._id && r.status !== 'inactive').map(r => ({ id: r._id, label: r.name }));
  const root = rootOf(roots, category._id);
  if (!root) return [];
  const banned = new Set(subtreeIds(category));
  return flattenTree([root]).filter(({ node }) => !banned.has(node._id) && node.status !== 'inactive')
    .map(({ node, depth }) => ({
      id: node._id,
      label: `${' '.repeat(depth)}${node.name}${depth === 0 ? ' (main category — no subcategory)' : ''}`,
    }));
}

/** Search: keep a matching node, every ancestor of it (so the path shows) and everything below it. */
export function searchTree(tree: CategoryNode[], query: string): { visible: Set<string> | null; autoExpanded: Set<string> } {
  const q = query.trim().toLowerCase();
  if (!q) return { visible: null, autoExpanded: new Set<string>() };
  const vis = new Set<string>();
  const open = new Set<string>();
  const walk = (n: CategoryNode, ancestors: string[], inMatch: boolean): boolean => {
    const self = n.name.toLowerCase().includes(q);
    const keep = self || inMatch;
    let any = keep;
    for (const c of n.children ?? []) if (walk(c, [...ancestors, n._id], keep)) any = true;
    if (any) { vis.add(n._id); if (!keep) open.add(n._id); if (self) ancestors.forEach(a => open.add(a)); }
    return any;
  };
  tree.forEach(r => walk(r, [], false));
  return { visible: vis, autoExpanded: open };
}