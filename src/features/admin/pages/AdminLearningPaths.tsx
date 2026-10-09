import { useEffect, useState } from 'react';
import { Route as RouteIcon, Plus, Pencil, Trash2, ExternalLink, X, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Modal, EmptyState, SkeletonBox, Input, Textarea, Select, Card } from '@/components/comman/ui';
import { AdminStudioHeader, ADMIN_GUTTER } from '@/features/admin/components/studio';
import { useToast } from '@/contexts/ToastContext';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { apiAdminSearchProducts } from '@/api/services/classroom';
import {
  apiAdminCreateLearningPath, apiAdminDeleteLearningPath, apiAdminGetLearningPath, apiAdminListLearningPaths, apiAdminUpdateLearningPath,
  type LearningPathAdmin,
} from '@/api/services/retention';

type Step = { title: string; note: string; picked: { _id: string; name: string }[] };
type Draft = { _id?: string; title: string; slug: string; educationLevel: string; ageLabel: string; subtitle: string; description: string; status: 'active' | 'draft'; order: number; steps: Step[] };

const empty = (): Draft => ({ title: '', slug: '', educationLevel: '', ageLabel: '', subtitle: '', description: '', status: 'draft', order: 0, steps: [{ title: '', note: '', picked: [] }] });

function PathForm({ initial, onClose, onSaved }: { initial: Draft; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [openStep, setOpenStep] = useState(0);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ _id: string; name: string; image: string | null }[]>([]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(prev => ({ ...prev, [k]: v }));
  const setStep = (i: number, patch: Partial<Step>) => setD(prev => ({ ...prev, steps: prev.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  const move = (i: number, by: number) => setD(prev => {
    const j = i + by; if (j < 0 || j >= prev.steps.length) return prev;
    const steps = [...prev.steps]; [steps[i], steps[j]] = [steps[j], steps[i]]; return { ...prev, steps };
  });

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => { apiAdminSearchProducts(q.trim()).then(res => setResults(res.data ?? [])).catch(() => setResults([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const addPick = (p: { _id: string; name: string }) => {
    const step = d.steps[openStep]; if (!step) return;
    if (step.picked.some(x => x._id === p._id) || step.picked.length >= 12) return;
    setStep(openStep, { picked: [...step.picked, { _id: p._id, name: p.name }] });
  };

  const save = async () => {
    setBusy(true);
    const body = {
      title: d.title, slug: d.slug || undefined, educationLevel: d.educationLevel || null, ageLabel: d.ageLabel, subtitle: d.subtitle,
      description: d.description, status: d.status, order: d.order,
      steps: d.steps.filter(s => s.title.trim() || s.picked.length).map(s => ({ title: s.title, note: s.note, productIds: s.picked.map(p => p._id) })),
    };
    try {
      if (d._id) await apiAdminUpdateLearningPath(d._id, body); else await apiAdminCreateLearningPath(body);
      toast.success('Saved'); onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={d._id ? 'Edit learning path' : 'New learning path'} onClose={onClose} width={720} mobileSheet footer={<>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={save} loading={busy} disabled={!d.title.trim()}>Save</Button>
    </>}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Title" value={d.title} maxLength={100} onChange={e => set('title', e.target.value)} placeholder="Class 3 - first term" />
          <Input label="Web address" value={d.slug} maxLength={80} onChange={e => set('slug', e.target.value)} placeholder="auto from title" />
          <Select label="Grade / level" value={d.educationLevel} onChange={e => set('educationLevel', e.target.value)}>
            <option value="">Any grade</option>
            {EDUCATION_LEVELS.filter(l => l.value !== 'other').map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </Select>
          <Input label="Age (optional)" value={d.ageLabel} maxLength={40} onChange={e => set('ageLabel', e.target.value)} placeholder="Ages 8-9" />
        </div>
        <Input label="Subtitle" value={d.subtitle} maxLength={160} onChange={e => set('subtitle', e.target.value)} />
        <Textarea label="Description (optional)" rows={2} maxLength={2000} value={d.description} onChange={e => set('description', e.target.value)} />

        <fieldset className="border border-bone rounded-xl p-3 flex flex-col gap-3">
          <legend className="text-[12px] font-semibold text-charcoal px-1">Steps, in order ({d.steps.length}/12)</legend>
          {d.steps.map((s, i) => (
            <div key={i} className={clsx('rounded-lg border p-3 flex flex-col gap-2', i === openStep ? 'border-brand-orange' : 'border-bone')} onClick={() => setOpenStep(i)}>
              <div className="flex items-end gap-2">
                <span className="size-7 rounded-full bg-brand-pale-orange text-brand-orange text-[12px] font-bold flex items-center justify-center shrink-0 mb-1">{i + 1}</span>
                <div className="flex-1"><Input label="Step title" value={s.title} maxLength={80} onChange={e => setStep(i, { title: e.target.value })} placeholder="Maths" /></div>
                <Button variant="ghost" size="xs" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp size={12} /></Button>
                <Button variant="ghost" size="xs" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown size={12} /></Button>
                <Button variant="ghost" size="xs" className="text-error" aria-label="Remove step" onClick={() => setD(prev => ({ ...prev, steps: prev.steps.filter((_, idx) => idx !== i) }))}><Trash2 size={12} /></Button>
              </div>
              <Input label="Note for parents (optional)" value={s.note} maxLength={200} onChange={e => setStep(i, { note: e.target.value })} placeholder="Start here - 15 minutes a day" />
              {s.picked.length > 0 && (
                <ol className="list-decimal pl-5 m-0 flex flex-col gap-1">
                  {s.picked.map(p => (
                    <li key={p._id} className="text-[12.5px]"><span className="inline-flex items-center gap-1">{p.name}
                      <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setStep(i, { picked: s.picked.filter(x => x._id !== p._id) })} className="bg-transparent border-none p-0 cursor-pointer text-slate hover:text-error"><X size={12} /></button></span></li>
                  ))}
                </ol>
              )}
              {i === openStep && (
                <div className="flex flex-col gap-2">
                  <Input aria-label="Search products" placeholder="Search a live product to add to this step" value={q} onChange={e => setQ(e.target.value)} rightIcon={<Search size={14} />} />
                  {results.length > 0 && (
                    <ul className="list-none p-0 m-0 max-h-[160px] overflow-y-auto flex flex-col gap-1">
                      {results.map(r => (
                        <li key={r._id}><button type="button" onClick={() => addPick(r)} className="w-full flex items-center gap-2 text-left rounded-lg border border-bone bg-white px-2 py-1.5 cursor-pointer hover:border-brand-orange">
                          {r.image ? <img src={r.image} alt="" className="w-7 h-7 rounded object-cover" /> : <span className="w-7 h-7 rounded bg-bone" />}
                          <span className="flex-1 text-[12.5px] truncate">{r.name}</span><Plus size={13} className="text-brand-orange" /></button></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
          {d.steps.length < 12 && <Button variant="outline" size="sm" icon={<Plus size={13} />} onClick={() => { setD(prev => ({ ...prev, steps: [...prev.steps, { title: '', note: '', picked: [] }] })); setOpenStep(d.steps.length); }}>Add step</Button>}
        </fieldset>

        <div className="grid grid-cols-2 gap-3 items-end">
          <Input label="Order" type="number" min={0} max={999} value={String(d.order)} onChange={e => set('order', Number(e.target.value) || 0)} />
          <Select label="Status" value={d.status} onChange={e => set('status', e.target.value as Draft['status'])}>
            <option value="draft">Draft</option>
            <option value="active">Live</option>
          </Select>
        </div>
      </div>
    </Modal>
  );
}

/** Admin -> Learning paths: ordered, per-grade paths of subject picks. Nothing is pre-created. */
export function AdminLearningPaths() {
  usePageTitle('Learning paths');
  const toast = useToast();
  const [rows, setRows] = useState<LearningPathAdmin[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = () => apiAdminListLearningPaths().then(res => setRows(res.data ?? [])).catch(() => setRows([]));
  useEffect(() => { void load(); }, []);

  const edit = async (p: LearningPathAdmin) => {
    try {
      const full = (await apiAdminGetLearningPath(p._id)).data;
      const names = full.productNames ?? {};
      setEditing({
        _id: full._id, title: full.title, slug: full.slug, educationLevel: full.educationLevel ?? '', ageLabel: full.ageLabel, subtitle: full.subtitle,
        description: full.description, status: full.status, order: full.order,
        steps: full.steps.map(s => ({ title: s.title, note: s.note, picked: s.productIds.map(id => ({ _id: id, name: names[id] ?? `Product ${id.slice(-6)}` })) })),
      });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not open.'); }
  };
  const remove = async (p: LearningPathAdmin) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try { await apiAdminDeleteLearningPath(p._id); setRows(prev => (prev ?? []).filter(x => x._id !== p._id)); } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete.'); }
  };

  return (
    <>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Growth"
        title="Learning paths"
        subtitle="Ordered paths of subject picks for each grade. Parents can save a whole path as their reading list. Live paths appear at /learning-paths."
        actions={<><Link to="/admin/picks" className="text-[12.5px] text-slate no-underline hover:text-brand-orange me-3">Edudeen Picks</Link><Button variant="primary" icon={<Plus size={15} />} onClick={() => setEditing(empty())}>New path</Button></>}
      />
      <div className={clsx(ADMIN_GUTTER, 'pt-6 pb-8 flex flex-col gap-3')}>
        {rows === null ? <SkeletonBox height={120} rounded="12px" /> : rows.length === 0 ? (
          <Card><EmptyState icon={<RouteIcon size={22} />} title="No learning paths yet" description="Create one per grade, e.g. “Class 3 - first term”, with a step for each subject. Nothing is created automatically." action={{ label: 'Create a path', onClick: () => setEditing(empty()) }} /></Card>
        ) : rows.map(p => (
          <Card key={p._id}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14.5px] font-bold text-carbon">{p.title}</p>
                  <span className={clsx('rounded-full px-2 py-[2px] text-[12px] font-semibold', p.status === 'active' ? 'bg-green-50 text-success' : 'bg-fog text-slate')}>{p.status === 'active' ? 'Live' : 'Draft'}</span>
                </div>
                <p className="text-[12.5px] text-slate">{p.steps.length} step{p.steps.length === 1 ? '' : 's'} · {EDUCATION_LEVELS.find(l => l.value === p.educationLevel)?.label ?? 'Any grade'} · /learning-paths/{p.slug}</p>
              </div>
              <a href={`/learning-paths/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-slate no-underline hover:text-brand-orange"><ExternalLink size={12} /> View</a>
              <Button variant="ghost" size="xs" onClick={() => edit(p)}><Pencil size={12} /> Edit</Button>
              <Button variant="ghost" size="xs" className="text-error" aria-label="Delete" onClick={() => remove(p)}><Trash2 size={12} /></Button>
            </div>
          </Card>
        ))}
      </div>
      {editing && <PathForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
    </>
  );
}
