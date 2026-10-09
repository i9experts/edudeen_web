import { useEffect, useState } from 'react';
import { BookMarked, Plus, Pencil, Trash2, ExternalLink, X, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Modal, EmptyState, SkeletonBox, Input, Textarea, Select, Card, Toggle, ImageUpload } from '@/components/comman/ui';
import { AdminStudioHeader, ADMIN_GUTTER } from '@/features/admin/components/studio';
import { useToast } from '@/contexts/ToastContext';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { CURRICULA } from '@/constants/learning';
import {
  apiAdminListShelves, apiAdminGetShelf, apiAdminCreateShelf, apiAdminUpdateShelf, apiAdminDeleteShelf, apiAdminSearchProducts,
  type CuratedCollectionAdmin,
} from '@/api/services/classroom';

// Ready-made shelves for the education calendar — one click fills the form.
const SHELF_PRESETS: { title: string; subtitle: string; rule: Partial<CuratedCollectionAdmin['rule']>; tags?: string[] }[] = [
  { title: 'Exam ki tayyari', subtitle: 'Past papers, notes and revision packs for board exams.', rule: { educationLevel: 'secondary_school', tags: ['past papers', 'notes', 'revision'] } },
  { title: 'Back to school', subtitle: 'Everything for the first week of the new session.', rule: { educationLevel: 'primary_school' } },
  { title: 'Ramzan for kids', subtitle: 'Duas, Seerah stories and Ramzan activity books.', rule: { educationLevel: 'islamic_education', tags: ['ramzan', 'ramadan'] } },
  { title: 'O/A Level revision', subtitle: 'Topical past papers and guides for the Cambridge series.', rule: { curriculum: 'cambridge_o', tags: ['past papers'] } },
  { title: 'Summer holiday work', subtitle: 'Holiday homework, reading packs and fun learning.', rule: { tags: ['summer', 'holiday'] } },
];

type Draft = Omit<CuratedCollectionAdmin, '_id' | 'products'> & { _id?: string; picked: { _id: string; name: string }[] };

const empty = (): Draft => ({
  title: '', slug: '', subtitle: '', description: '', image: null, productIds: [], picked: [],
  rule: { educationLevel: null, curriculum: null, categoryId: null, tags: [] },
  status: 'draft', showOnHome: true, order: 0, startsAt: null, endsAt: null,
});
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

function ShelfForm({ initial, onClose, onSaved }: { initial: Draft; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<Draft>(initial);
  const [tagText, setTagText] = useState(initial.rule.tags.join(', '));
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ _id: string; name: string; image: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(prev => ({ ...prev, [k]: v }));
  const setRule = (k: keyof Draft['rule'], v: string | null) => setD(prev => ({ ...prev, rule: { ...prev.rule, [k]: v || null } }));

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => { apiAdminSearchProducts(q.trim()).then(res => setResults(res.data ?? [])).catch(() => setResults([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const add = (p: { _id: string; name: string }) => setD(prev => prev.picked.some(x => x._id === p._id) || prev.picked.length >= 60 ? prev : { ...prev, picked: [...prev.picked, p] });

  const save = async () => {
    setBusy(true);
    const body = {
      title: d.title, slug: d.slug || undefined, subtitle: d.subtitle, description: d.description, image: d.image,
      productIds: d.picked.map(p => p._id),
      rule: { ...d.rule, tags: tagText.split(',').map(t => t.trim()).filter(Boolean) },
      status: d.status, showOnHome: d.showOnHome, order: d.order,
      startsAt: d.startsAt ? new Date(`${toDateInput(d.startsAt)}T00:00:00`).toISOString() : null,
      endsAt: d.endsAt ? new Date(`${toDateInput(d.endsAt)}T23:59:59`).toISOString() : null,
    };
    try {
      if (d._id) await apiAdminUpdateShelf(d._id, body);
      else await apiAdminCreateShelf(body);
      toast.success('Saved');
      onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={d._id ? 'Edit pick' : 'New Edudeen pick'} onClose={onClose} width={680} mobileSheet footer={<>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={save} loading={busy} disabled={!d.title.trim()}>Save</Button>
    </>}>
      <div className="flex flex-col gap-4">
        {!d._id && (
          <div>
            <p className="text-[12px] font-medium text-charcoal mb-1.5">Quick start</p>
            <div className="flex flex-wrap gap-2">
              {SHELF_PRESETS.map(p => (
                <button key={p.title} type="button"
                  onClick={() => { setD(prev => ({ ...prev, title: p.title, subtitle: p.subtitle, rule: { ...prev.rule, ...p.rule, tags: [] } })); setTagText((p.rule.tags ?? []).join(', ')); }}
                  className={clsx('px-3 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer', d.title === p.title ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-white hover:border-brand-orange')}>
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Title" value={d.title} maxLength={100} onChange={e => set('title', e.target.value)} placeholder="Exam ki tayyari" />
          <Input label="Web address" value={d.slug} maxLength={80} onChange={e => set('slug', e.target.value)} placeholder="auto from title" />
        </div>
        <Input label="Subtitle" value={d.subtitle} maxLength={160} onChange={e => set('subtitle', e.target.value)} />
        <Textarea label="Description (optional)" rows={2} maxLength={2000} value={d.description} onChange={e => set('description', e.target.value)} />
        <div>
          <p className="text-[12px] font-medium text-charcoal mb-1.5">Banner image (optional)</p>
          <ImageUpload value={d.image ? [d.image] : []} onChange={urls => set('image', urls[0] ?? null)} maxFiles={1} />
        </div>

        <fieldset className="border border-bone rounded-xl p-3 flex flex-col gap-3">
          <legend className="text-[12px] font-semibold text-charcoal px-1">Hand-picked products ({d.picked.length})</legend>
          <Input aria-label="Search products" placeholder="Search any live product by name" value={q} onChange={e => setQ(e.target.value)} rightIcon={<Search size={14} />} />
          {results.length > 0 && (
            <ul className="list-none p-0 m-0 max-h-[180px] overflow-y-auto flex flex-col gap-1">
              {results.map(r => (
                <li key={r._id}>
                  <button type="button" onClick={() => add(r)} className="w-full flex items-center gap-2 text-left rounded-lg border border-bone bg-white px-2 py-1.5 cursor-pointer hover:border-brand-orange">
                    {r.image ? <img src={r.image} alt="" className="w-7 h-7 rounded object-cover" /> : <span className="w-7 h-7 rounded bg-bone" />}
                    <span className="flex-1 text-[12.5px] truncate">{r.name}</span><Plus size={13} className="text-brand-orange" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {d.picked.length > 0 && (
            <ol className="list-decimal pl-5 m-0 flex flex-col gap-1">
              {d.picked.map(p => (
                <li key={p._id} className="text-[12.5px]">
                  <span className="inline-flex items-center gap-1">{p.name}
                    <button type="button" aria-label={`Remove ${p.name}`} onClick={() => set('picked', d.picked.filter(x => x._id !== p._id))} className="bg-transparent border-none p-0 cursor-pointer text-slate hover:text-error"><X size={12} /></button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </fieldset>

        <fieldset className="border border-bone rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <legend className="text-[12px] font-semibold text-charcoal px-1">Fill the rest automatically (optional)</legend>
          <Select label="Grade / level" value={d.rule.educationLevel ?? ''} onChange={e => setRule('educationLevel', e.target.value)}>
            <option value="">Any</option>
            {EDUCATION_LEVELS.filter(l => l.value !== 'other').map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </Select>
          <Select label="Exam board" value={d.rule.curriculum ?? ''} onChange={e => setRule('curriculum', e.target.value)}>
            <option value="">Any</option>
            {CURRICULA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Input label="Tags (comma separated)" value={tagText} onChange={e => setTagText(e.target.value)} placeholder="past papers, notes" />
          <p className="sm:col-span-3 text-[12px] text-slate m-0">After your hand-picked items, the best-selling live products matching these are added (up to 60).</p>
        </fieldset>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <Input label="Show from" type="date" value={toDateInput(d.startsAt)} onChange={e => set('startsAt', e.target.value || null)} />
          <Input label="Until" type="date" value={toDateInput(d.endsAt)} onChange={e => set('endsAt', e.target.value || null)} />
          <Input label="Order on home" type="number" min={0} max={999} value={String(d.order)} onChange={e => set('order', Number(e.target.value) || 0)} />
          <Select label="Status" value={d.status} onChange={e => set('status', e.target.value as Draft['status'])}>
            <option value="draft">Draft</option>
            <option value="active">Live</option>
          </Select>
        </div>
        <label className="inline-flex items-center gap-2 text-[13px] text-charcoal cursor-pointer"><Toggle label="Show as a row on the homepage" size="sm" checked={d.showOnHome} onChange={v => set('showOnHome', v)} /> Show as a row on the homepage</label>
      </div>
    </Modal>
  );
}

/** Admin → Edudeen Picks: curated, marketplace-wide shelves. */
export function AdminShelves() {
  usePageTitle('Edudeen Picks');
  const toast = useToast();
  const [rows, setRows] = useState<CuratedCollectionAdmin[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = () => apiAdminListShelves().then(res => setRows(res.data ?? [])).catch(() => setRows([]));
  useEffect(() => { void load(); }, []);

  const edit = async (c: CuratedCollectionAdmin) => {
    try {
      const res = await apiAdminGetShelf(c._id);
      const full = res.data;
      setEditing({ ...full, picked: (full.products ?? []).map(p => ({ _id: p._id, name: p.name })) });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not open.'); }
  };
  const remove = async (c: CuratedCollectionAdmin) => {
    if (!window.confirm(`Delete "${c.title}"?`)) return;
    try { await apiAdminDeleteShelf(c._id); setRows(prev => (prev ?? []).filter(x => x._id !== c._id)); } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete.'); }
  };

  const window_ = (c: CuratedCollectionAdmin) => c.startsAt || c.endsAt
    ? `${c.startsAt ? new Date(c.startsAt).toLocaleDateString() : 'now'} → ${c.endsAt ? new Date(c.endsAt).toLocaleDateString() : 'no end'}`
    : 'Always on';

  return (
    <>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Growth"
        title="Edudeen Picks"
        subtitle="Curated shelves across every store — “Exam ki tayyari”, “Back to school”, “Ramzan for kids”. Live picks show as rows on the homepage and at /picks/…"
        actions={<><Link to="/admin/learning-paths" className="text-[12.5px] text-slate no-underline hover:text-brand-orange me-3">Learning paths</Link><Button variant="primary" icon={<Plus size={15} />} onClick={() => setEditing(empty())}>New pick</Button></>}
      />
      <div className={clsx(ADMIN_GUTTER, 'pt-6 pb-8 flex flex-col gap-3')}>
        {rows === null ? <SkeletonBox height={120} rounded="12px" /> : rows.length === 0 ? (
          <Card><EmptyState icon={<BookMarked size={22} />} title="No picks yet" description="Start with “Exam ki tayyari” — one click fills the form." action={{ label: 'Create a pick', onClick: () => setEditing(empty()) }} /></Card>
        ) : rows.map(c => (
          <Card key={c._id}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14.5px] font-bold text-carbon">{c.title}</p>
                  <span className={clsx('rounded-full px-2 py-[2px] text-[12px] font-semibold', c.status === 'active' ? 'bg-green-50 text-success' : 'bg-fog text-slate')}>{c.status === 'active' ? 'Live' : 'Draft'}</span>
                  {c.showOnHome && <span className="rounded-full px-2 py-[2px] text-[12px] font-semibold bg-brand-pale-orange text-brand-orange">Homepage #{c.order}</span>}
                </div>
                <p className="text-[12.5px] text-slate">{c.productIds.length} hand-picked · {window_(c)} · /picks/{c.slug}</p>
              </div>
              <a href={`/picks/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-slate no-underline hover:text-brand-orange"><ExternalLink size={12} /> View</a>
              <Button variant="ghost" size="xs" onClick={() => edit(c)}><Pencil size={12} /> Edit</Button>
              <Button variant="ghost" size="xs" className="text-error" onClick={() => remove(c)}><Trash2 size={12} /></Button>
            </div>
          </Card>
        ))}
      </div>
      {editing && <ShelfForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
    </>
  );
}
