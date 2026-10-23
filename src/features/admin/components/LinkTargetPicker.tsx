import { useEffect, useMemo, useState } from 'react';
import { Input, Select } from '@/components/comman/ui';
import { useCategoryTree } from '@/hooks/marketplace/useCategoryTree';
import { apiGetPublicActiveCampaigns, type PublicCampaign } from '@/api/services/marketing/publicCampaigns';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { LINK_TYPES, buildLink, parseLink, type LinkKind } from '@/utils/linkTarget';
import type { CategoryNode } from '@/api/services/categories';

const KINDS: { value: LinkKind; label: string }[] = [
  { value: 'none', label: 'No link' },
  { value: 'category', label: 'A category' },
  { value: 'campaign', label: 'A running sale' },
  { value: 'type', label: 'A product type' },
  { value: 'class', label: 'A class / grade' },
  { value: 'free', label: 'Free resources' },
  { value: 'custom', label: 'Custom link' },
];

function flatten(nodes: CategoryNode[], depth = 0, out: { slug: string; label: string }[] = []) {
  for (const n of nodes) {
    if (n.slug) out.push({ slug: n.slug, label: `${'\u2014 '.repeat(depth)}${n.name}` });
    if (n.children?.length) flatten(n.children, depth + 1, out);
  }
  return out;
}

/** Admin picks WHAT the banner/card opens (category, sale, type, class, free, custom); the matching `/?...` link is built for them. */
export function LinkTargetPicker({ value, onChange, label = 'When clicked, show', defaultKind }: { value: string; onChange: (link: string) => void; label?: string; /** Pre-selected option while no link is set yet (banners start on 'A category'). */ defaultKind?: LinkKind }) {
  const parsed = useMemo(() => parseLink(value), [value]);
  const [kind, setKind] = useState<LinkKind>(parsed.kind === 'none' && defaultKind ? defaultKind : parsed.kind);
  const { tree } = useCategoryTree();
  const cats = useMemo(() => flatten(tree), [tree]);
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);

  useEffect(() => {
    if (kind !== 'campaign' || campaigns.length) return;
    let alive = true;
    apiGetPublicActiveCampaigns().then(r => { if (alive) setCampaigns(r.data ?? []); }).catch(() => {});
    return () => { alive = false; };
  }, [kind, campaigns.length]);

  const pickKind = (k: LinkKind) => {
    setKind(k);
    onChange(buildLink({ kind: k, value: k === parsed.kind ? parsed.value : '' }));
  };
  const setVal = (v: string) => onChange(buildLink({ kind, value: v }));
  const val = kind === 'custom' ? value : kind === parsed.kind ? parsed.value : '';

  return (
    <div className="flex flex-col gap-2">
      <Select label={label} value={kind} onChange={e => pickKind(e.target.value as LinkKind)}>
        {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
      </Select>
      {kind === 'category' && (
        <Select value={val} onChange={e => setVal(e.target.value)} aria-label="Category">
          <option value="">Choose a category…</option>
          {cats.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
        </Select>
      )}
      {kind === 'campaign' && (
        <Select value={val} onChange={e => setVal(e.target.value)} aria-label="Sale">
          <option value="">Choose a running sale…</option>
          {val && !campaigns.some(c => c._id === val) && <option value={val}>Current selection</option>}
          {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
      )}
      {kind === 'type' && (
        <Select value={val} onChange={e => setVal(e.target.value)} aria-label="Product type">
          <option value="">Choose a type…</option>
          {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      )}
      {kind === 'class' && (
        <Select value={val} onChange={e => setVal(e.target.value)} aria-label="Class">
          <option value="">Choose a class…</option>
          {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
      )}
      {kind === 'custom' && (
        <Input value={val} onChange={e => setVal(e.target.value)} placeholder="/?q=maths or https://example.com/sale" aria-label="Custom link" />
      )}
      {kind !== 'none' && value && <p className="text-[12px] text-slate m-0">Opens: <span className="font-mono">{value}</span></p>}
      {kind === 'category' && value && <p className="text-[12px] text-slate m-0">Visitors who click this banner land on the shop with every product of this category.</p>}
      {kind !== 'none' && kind !== 'free' && !value && <p className="text-[12px] text-error m-0">Choose what it should open, or pick “No link”.</p>}
    </div>
  );
}