import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Baby, Crown, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, Button, Input, Modal, SkeletonBox, EmptyState } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { CLASS_LEVELS, canonicalClass, levelForClass } from '@/constants/classLevels';
import {
  apiCreateChild, apiDeleteChild, apiUpdateChild, MAX_CHILDREN, type ChildInput, type ChildProfile,
} from '@/api/services/children';
import { useChildren, childLevelLabel, refreshChildren, selectChild } from '@/hooks/useChildren';
import { usePremium } from '@/hooks/usePremium';

const parseSubjects = (s: string) => [...new Set(s.split(',').map(x => x.trim()).filter(Boolean))].slice(0, 10);

function ChildForm({ initial, onSave, onClose }: {
  initial?: ChildProfile; onSave: (v: ChildInput) => Promise<void>; onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [level, setLevel] = useState(initial?.educationLevel ?? 'primary_school');
  // Class is a real class value; old free text that isn't a known class is kept (LEGACY) until changed.
  const LEGACY = '__legacy';
  const legacyText = initial?.gradeLabel && !canonicalClass(initial.gradeLabel) ? initial.gradeLabel : '';
  const [classSel, setClassSel] = useState(canonicalClass(initial?.gradeLabel) ?? (legacyText ? LEGACY : ''));
  const changeClass = (v: string) => { setClassSel(v); const l = levelForClass(v); if (l) setLevel(l); };
  const [age, setAge] = useState(initial?.age != null ? String(initial.age) : '');
  const [subjects, setSubjects] = useState((initial?.subjects ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const ageNum = age === '' ? null : Number(age);
  const ageBad = ageNum !== null && (!Number.isInteger(ageNum) || ageNum < 2 || ageNum > 25);
  const save = async () => {
    setBusy(true);
    try { await onSave({ name: name.trim(), educationLevel: level, gradeLabel: classSel === LEGACY ? legacyText : classSel, age: ageNum, subjects: parseSubjects(subjects) }); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={initial ? 'Edit child' : 'Add a child'} onClose={onClose} width={460} mobileSheet footer={
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="md" loading={busy} disabled={!name.trim() || ageBad} onClick={save}>Save</Button>
      </div>
    }>
      <div className="px-5 py-4 flex flex-col gap-3">
        <Input label="Child's name" value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="e.g. Ayesha" />
        <label className="flex flex-col gap-1 text-[13px] font-medium text-charcoal">
          Class (optional)
          <select value={classSel} onChange={e => changeClass(e.target.value)} className="rounded-lg border border-bone px-3 py-[10px] text-[14px] bg-white font-normal">
            <option value="">Not set</option>
            {legacyText && <option value={LEGACY}>{legacyText}</option>}
            {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-medium text-charcoal">
          Level
          <select value={level} onChange={e => setLevel(e.target.value)} disabled={!!levelForClass(classSel)} className="rounded-lg border border-bone px-3 py-[10px] text-[14px] bg-white font-normal">
            {EDUCATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        <Input label="Age (optional)" type="number" min={2} max={25} value={age} onChange={e => setAge(e.target.value)} error={ageBad ? 'Enter an age between 2 and 25' : undefined} />
        <Input label="Subjects of interest (optional)" value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="Maths, Urdu, Science" />
      </div>
    </Modal>
  );
}

/** Account → My children: save child profiles used to personalise shopping. */
export function MyChildren() {
  const toast = useToast();
  const { children, loading, error, reload } = useChildren();
  const [editing, setEditing] = useState<ChildProfile | 'new' | null>(null);
  // The limit comes from Edudeen Premium (the server enforces it): members get the plan's limit, everyone else the default.
  const { isPremium, entitlements } = usePremium();
  const limit = entitlements?.childrenLimit ?? MAX_CHILDREN;
  const full = children.length >= limit;

  const save = async (v: ChildInput) => {
    try {
      if (editing === 'new') {
        const res = await apiCreateChild(v);
        if (children.length === 0 && res.data?._id) selectChild(res.data._id);
      } else if (editing) await apiUpdateChild(editing._id, v);
      toast.success('Saved');
      setEditing(null);
      await refreshChildren();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save.'); }
  };

  const remove = async (c: ChildProfile) => {
    if (!window.confirm(`Remove ${c.name}?`)) return;
    try { await apiDeleteChild(c._id); toast.success('Removed'); await refreshChildren(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not remove.'); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-carbon">My children</h1>
          <p className="text-[13px] text-slate">Save your children's class so Edudeen can show resources that fit them.</p>
        </div>
        <Button variant="primary" size="sm" className="ms-auto" disabled={full || !!error} onClick={() => setEditing('new')}>
          <Plus size={14} /> Add a child
        </Button>
      </div>
      {!!children.length && <p className="text-[12.5px] text-slate">{` of ${limit} children`}</p>}
      {full && !isPremium && (
        <div className="flex items-center gap-2 flex-wrap rounded-lg border border-[#f1d98a] bg-[#fff6d6] px-3 py-2.5 text-[12.5px] text-[#8a6100]">
          <Crown size={14} className="shrink-0" aria-hidden />
          <span>{`You have reached the limit of ${limit} children.`}</span>
          <Link to="/premium" className="font-bold text-[#8a6100] underline">Upgrade to Premium for more</Link>
        </div>
      )}
      {full && isPremium && <p className="text-[12.5px] text-slate">{`You have reached your limit of ${limit} children.`}</p>}

      {loading && children.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><SkeletonBox height={110} rounded="12px" /><SkeletonBox height={110} rounded="12px" /></div>
      ) : error && children.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-[13px] text-error text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void reload()}>Try again</Button>
          </div>
        </Card>
      ) : children.length === 0 ? (
        <Card><EmptyState icon={<Baby size={22} />} title="No children yet" description="Add a child to see picks for their class on the home page and in search." action={{ label: 'Add a child', onClick: () => setEditing('new') }} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {children.map(c => (
            <Card key={c._id} className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-full bg-brand-pale-orange flex items-center justify-center shrink-0"><Baby size={18} className="text-brand-orange" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-carbon truncate">{c.name}</p>
                  <p className="text-[13px] text-graphite">{childLevelLabel(c)}{c.age != null ? ` · ${c.age} years` : ''}</p>
                </div>
                <button type="button" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)} className="size-9 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-charcoal hover:bg-cream"><Pencil size={15} /></button>
                <button type="button" aria-label={`Remove ${c.name}`} onClick={() => void remove(c)} className="size-9 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-error hover:bg-cream"><Trash2 size={15} /></button>
              </div>
              {c.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.subjects.map(s => <span key={s} className="rounded-full bg-[#eaf2f8] text-brand-royal px-2.5 py-[3px] text-[12px] font-medium">{s}</span>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {editing && <ChildForm initial={editing === 'new' ? undefined : editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}
