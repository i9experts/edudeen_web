import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Input, Select } from '@/components/comman/ui/Input';
import { ImageUpload } from '@/components/comman/ui/Upload';
import { EmptyState } from '@/components/comman/ui/EmptyState';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { LinkTargetPicker } from '@/features/admin/components/LinkTargetPicker';
import { invalidateHomeCards } from '@/hooks/useHomeCards';
import { cloudinaryUrl } from '@/utils/cloudinaryImage';
import {
  apiCreateHomeCard, apiDeleteHomeCard, apiGetAdminHomeCards, apiReorderHomeCards, apiUpdateHomeCard,
  type HomeCard, type HomeCardLayout, type HomeCardTile,
} from '@/api/services/homeCards';

const emptyTile = (): HomeCardTile => ({ label: '', imageUrl: '', link: '' });

function CardForm({ card, onClose, onSaved }: { card: HomeCard | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(card?.title ?? '');
  const [layout, setLayout] = useState<HomeCardLayout>(card?.layout ?? 'grid4');
  const [tiles, setTiles] = useState<HomeCardTile[]>(() => {
    const t = [...(card?.tiles ?? [])];
    while (t.length < 4) t.push(emptyTile());
    return t.slice(0, 4);
  });
  const [imageUrl, setImageUrl] = useState(card?.imageUrl ?? '');
  const [link, setLink] = useState(card?.link ?? '');
  const [ctaLabel, setCtaLabel] = useState(card?.ctaLabel ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setTile = (i: number, patch: Partial<HomeCardTile>) => setTiles(prev => prev.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  async function submit(status: 'active' | 'draft') {
    if (!title.trim()) { setError('Give the card a title.'); return; }
    if (layout === 'single' && !imageUrl) { setError('Upload the card image.'); return; }
    const usedTiles = tiles.filter(t => t.label.trim() || t.imageUrl || t.link);
    if (layout === 'grid4' && status === 'active' && usedTiles.length < 1) { setError('Add at least one tile (a link, a label or a picture).'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = { title: title.trim(), layout, tiles: layout === 'grid4' ? usedTiles : [], imageUrl: layout === 'single' ? imageUrl : '', link, ctaLabel: ctaLabel.trim(), status };
      if (card) await apiUpdateHomeCard(card._id, payload);
      else await apiCreateHomeCard(payload);
      invalidateHomeCards();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the card.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal mobileSheet title={card ? 'Edit card' : 'Add card'} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="outline" onClick={() => submit('draft')} disabled={saving}>Save as draft</Button>
        <Button onClick={() => submit('active')} loading={saving}>{card && card.status === 'active' ? 'Save changes' : 'Publish'}</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <Input label="Card title" value={title} maxLength={60} onChange={e => setTitle(e.target.value)} placeholder="e.g. Shop by class" />
        <Select label="Layout" value={layout} onChange={e => setLayout(e.target.value as HomeCardLayout)}>
          <option value="grid4">4 small pictures (like Amazon)</option>
          <option value="single">One big picture</option>
        </Select>

        {layout === 'single' ? (
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Card picture</label>
            <ImageUpload value={imageUrl ? [imageUrl] : []} onChange={u => setImageUrl(u[0] ?? '')} maxFiles={1} />
            <p className="mt-1.5 text-[12px] text-slate/70">Recommended 800×600px. Clicking the picture opens the link below.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-slate m-0">Up to 4 tiles. Leave the picture empty on a category tile and its product photo is used automatically.</p>
            {tiles.map((t, i) => (
              <div key={i} className="rounded-xl border border-bone p-3 flex flex-col gap-2.5">
                <p className="text-[12px] font-semibold text-charcoal m-0">Tile {i + 1}</p>
                <Input label="Label" value={t.label} maxLength={40} onChange={e => setTile(i, { label: e.target.value })} placeholder="e.g. Class 5" />
                <div>
                  <label className="block text-[12px] font-medium text-charcoal mb-1.5">Picture (optional)</label>
                  <ImageUpload value={t.imageUrl ? [t.imageUrl] : []} onChange={u => setTile(i, { imageUrl: u[0] ?? '' })} maxFiles={1} />
                </div>
                <LinkTargetPicker value={t.link} onChange={l => setTile(i, { link: l })} label="Tile opens" />
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-bone bg-cream/50 p-3 flex flex-col gap-2.5">
          <p className="text-[12px] font-semibold text-charcoal m-0">“See more” link of the whole card</p>
          <LinkTargetPicker value={link} onChange={setLink} label="Card opens" />
          <Input label="Link text (optional)" value={ctaLabel} maxLength={30} onChange={e => setCtaLabel(e.target.value)} placeholder="See more" />
        </div>
        {error && <p className="text-[12px] text-error m-0">{error}</p>}
      </div>
    </Modal>
  );
}

export function AdminHomeCards() {
  usePageTitle('Home cards');
  const [cards, setCards] = useState<HomeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<HomeCard | 'new' | null>(null);
  const [deleting, setDeleting] = useState<HomeCard | null>(null);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    return apiGetAdminHomeCards()
      .then(r => { setCards(r.data ?? []); setError(''); })
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load the cards.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(id: string, fn: () => Promise<unknown>) {
    if (busyId) return;
    setBusyId(id);
    setError('');
    try { await fn(); invalidateHomeCards(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusyId(''); }
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cards.length) return;
    const ids = cards.map(c => c._id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    return run(cards[i]._id, () => apiReorderHomeCards(ids));
  };

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Content"
        title="Home cards"
        subtitle="The picture cards under the home page banner (like Amazon). Add as many as you want: every published card shows on the home page, in this order. Each tile or card opens the matching products."
        actions={<Button icon={<Plus size={14} />} onClick={() => setEditing('new')} className="shrink-0">Add card</Button>}
      />
      <div className="px-4 sm:px-7 pt-6 pb-8">
        {error && <p role="alert" className="text-[13px] text-error mb-3">{error}</p>}
        {loading ? (
          <div className="grid gap-3">{[0, 1, 2].map(i => <SkeletonBox key={i} height={84} className="rounded-xl" />)}</div>
        ) : cards.length === 0 ? (
          <EmptyState icon={<LayoutGrid size={22} />} title="No home cards yet" description="Until you add a card, the home page shows the automatic “Shop by category” tiles." action={{ label: 'Add card', onClick: () => setEditing('new') }} />
        ) : (
          <ul className="list-none m-0 p-0 grid gap-3">
            {cards.map((c, i) => {
              const thumbs = c.layout === 'single' ? [c.imageUrl] : c.tiles.map(t => t.imageUrl);
              return (
                <li key={c._id} className="flex flex-wrap items-center gap-3 rounded-xl border border-bone bg-white p-3">
                  <div className="flex gap-1 shrink-0">
                    {thumbs.slice(0, 4).map((u, k) => (u
                      ? <img key={k} src={cloudinaryUrl(u, 96)} alt="" className="size-12 rounded object-cover" />
                      : <span key={k} className="size-12 rounded bg-cream border border-bone" />))}
                    {!thumbs.length && <span className="size-12 rounded bg-cream border border-bone" />}
                  </div>
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="text-[14px] font-semibold text-carbon m-0 truncate">{c.title}</p>
                    <p className="text-[12px] text-slate m-0">
                      {c.layout === 'single' ? 'One big picture' : `${c.tiles.length} tile${c.tiles.length === 1 ? '' : 's'}`} · <span className={c.status === 'active' ? 'text-brand-green' : ''}>{c.status === 'active' ? 'Showing on home' : 'Draft (hidden)'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button variant="ghost" size="sm" aria-label="Move up" disabled={i === 0 || !!busyId} onClick={() => move(i, -1)} icon={<ArrowUp size={14} />} />
                    <Button variant="ghost" size="sm" aria-label="Move down" disabled={i === cards.length - 1 || !!busyId} onClick={() => move(i, 1)} icon={<ArrowDown size={14} />} />
                    <Button variant="outline" size="sm" disabled={!!busyId} icon={c.status === 'active' ? <EyeOff size={14} /> : <Eye size={14} />}
                      onClick={() => run(c._id, () => apiUpdateHomeCard(c._id, { status: c.status === 'active' ? 'draft' : 'active' }))}>
                      {c.status === 'active' ? 'Hide' : 'Show'}
                    </Button>
                    <Button variant="outline" size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(c)}>Edit</Button>
                    <Button variant="danger" size="sm" aria-label="Delete" icon={<Trash2 size={14} />} onClick={() => setDeleting(c)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && <CardForm card={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && (
        <Modal title="Delete card?" onClose={() => setDeleting(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" loading={busyId === deleting._id} onClick={async () => { const d = deleting; await run(d._id, () => apiDeleteHomeCard(d._id)); setDeleting(null); }}>Delete</Button>
          </>}>
          <p className="text-[13px] text-charcoal m-0">“{deleting.title}” will disappear from the home page. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}