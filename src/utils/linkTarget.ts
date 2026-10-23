// Admin link picker <-> the in-site URL stored on a banner / home card. The shop is the homepage, so every
// "related products" link is just `/?<filter>=...` (see utils/homeMode.ts BROWSE_KEYS + Homepage `?campaign=`).

export type LinkKind = 'none' | 'category' | 'campaign' | 'type' | 'class' | 'free' | 'custom';
export interface LinkTarget { kind: LinkKind; value: string }

export const LINK_TYPES = [
  { value: 'digital', label: 'Digital downloads' },
  { value: 'educational', label: 'Educational resources' },
  { value: 'physical', label: 'Physical products' },
] as const;

export function buildLink(t: LinkTarget): string {
  const v = t.value.trim();
  switch (t.kind) {
    case 'category': return v ? `/?category=${encodeURIComponent(v)}` : '';
    case 'campaign': return v ? `/?campaign=${encodeURIComponent(v)}` : '';
    case 'type': return v ? `/?type=${encodeURIComponent(v)}` : '';
    case 'class': return v ? `/?class=${encodeURIComponent(v)}` : '';
    case 'free': return '/?free=1';
    case 'custom': return v;
    default: return '';
  }
}

/** Reverse of buildLink; anything that is not one of our simple links is 'custom'. */
export function parseLink(link: string | null | undefined): LinkTarget {
  const l = (link ?? '').trim();
  if (!l) return { kind: 'none', value: '' };
  if (l.startsWith('/?')) {
    const p = new URLSearchParams(l.slice(2));
    const keys = [...p.keys()];
    if (keys.length === 1) {
      const k = keys[0];
      const v = p.get(k) ?? '';
      if (k === 'category' && v) return { kind: 'category', value: v };
      if (k === 'campaign' && v) return { kind: 'campaign', value: v };
      if (k === 'type' && v) return { kind: 'type', value: v };
      if (k === 'class' && v) return { kind: 'class', value: v };
      if (k === 'free' && v === '1') return { kind: 'free', value: '' };
    }
  }
  return { kind: 'custom', value: l };
}

/** The category slug a link points at, if it is a plain category link. */
export function categorySlugOf(link: string | null | undefined): string | null {
  const t = parseLink(link);
  return t.kind === 'category' ? t.value.toLowerCase() : null;
}