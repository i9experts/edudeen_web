import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Modal, EmptyState, SkeletonBox, ImageUpload } from '@/components/comman/ui';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { Toggle } from '@/components/comman/ui/Toggle';
import { AdminStudioHeader, ADMIN_GUTTER } from '@/features/admin/components/studio';
import { useToast } from '@/contexts/ToastContext';
import {
  apiAdminListOnboardingSlides, apiCreateOnboardingSlide, apiUpdateOnboardingSlide, apiReorderOnboardingSlides, apiDeleteOnboardingSlide,
  type OnboardingSlide,
} from '@/api/services/onboardingSlides';

function SlideForm({ slide, nextOrder, onClose, onSaved }: { slide: OnboardingSlide | null; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(slide?.title ?? '');
  const [subtitle, setSubtitle] = useState(slide?.subtitle ?? '');
  const [image, setImage] = useState(slide?.imageUrl ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (slide) await apiUpdateOnboardingSlide(slide._id, { title: title.trim(), subtitle: subtitle.trim(), imageUrl: image });
      else await apiCreateOnboardingSlide({ title: title.trim(), subtitle: subtitle.trim(), imageUrl: image, order: nextOrder });
      toast.success(slide ? 'Slide saved' : 'Slide added');
      onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save the slide.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={slide ? 'Edit slide' : 'New slide'} onClose={onClose} width={520} mobileSheet footer={<>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={save} loading={busy} disabled={!title.trim() || !image}>Save</Button>
    </>}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[12px] font-medium text-charcoal mb-1.5">Image (portrait works best)</p>
          <ImageUpload value={image ? [image] : []} onChange={urls => setImage(urls[0] ?? '')} maxFiles={1} />
        </div>
        <Input label="Title" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} placeholder="Learn with purpose" />
        <Textarea label="Subtitle (optional)" rows={2} maxLength={200} value={subtitle} onChange={e => setSubtitle(e.target.value)} />
      </div>
    </Modal>
  );
}

/** Admin → App intro slides: the screens the Edudeen mobile app shows on first launch. */
export function AdminOnboardingSlides() {
  usePageTitle('App intro slides');
  const toast = useToast();
  const [slides, setSlides] = useState<OnboardingSlide[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<OnboardingSlide | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError('');
    apiAdminListOnboardingSlides()
      .then(res => setSlides([...(res.data ?? [])].sort((a, b) => a.order - b.order)))
      .catch(err => { setError(err instanceof Error ? err.message : 'Could not load slides.'); setSlides([]); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const move = async (i: number, d: -1 | 1) => {
    if (!slides) return;
    const j = i + d;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    setSlides(next);
    try { await apiReorderOnboardingSlides(next.map((s, k) => ({ id: s._id, order: k }))); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not reorder.'); load(); }
  };

  const toggle = async (s: OnboardingSlide, isActive: boolean) => {
    setBusyId(s._id);
    try { await apiUpdateOnboardingSlide(s._id, { isActive }); setSlides(prev => (prev ?? []).map(x => x._id === s._id ? { ...x, isActive } : x)); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not update.'); }
    finally { setBusyId(null); }
  };

  const remove = async (s: OnboardingSlide) => {
    if (!window.confirm(`Delete the slide "${s.title}"?`)) return;
    setBusyId(s._id);
    try { await apiDeleteOnboardingSlide(s._id); setSlides(prev => (prev ?? []).filter(x => x._id !== s._id)); toast.success('Slide deleted'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete.'); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Content"
        title="App intro slides"
        subtitle="The screens the Edudeen mobile app shows the first time someone opens it. Only active slides are shown, in this order."
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setEditing('new')}>New slide</Button>}
      />
      <div className={clsx(ADMIN_GUTTER, 'pt-6 pb-8 flex flex-col gap-3')}>
        {error && <p className="text-[13px] text-error" role="alert">{error}</p>}
        {slides === null ? <SkeletonBox height={120} rounded="12px" /> : slides.length === 0 ? (
          <div className="bg-white border border-bone rounded-xl"><EmptyState icon={<Smartphone size={22} />} title="No intro slides yet" description="Add two or three slides that explain what Edudeen is." action={{ label: 'Add a slide', onClick: () => setEditing('new') }} /></div>
        ) : slides.map((s, i) => (
          <div key={s._id} className={clsx('bg-white border border-bone rounded-xl p-3 flex items-center gap-4', !s.isActive && 'opacity-60')}>
            <img src={s.imageUrl} alt="" className="w-16 h-24 object-cover rounded-lg bg-cream shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-carbon truncate">{i + 1}. {s.title}</p>
              {s.subtitle && <p className="text-[12.5px] text-slate line-clamp-2">{s.subtitle}</p>}
            </div>
            <label className="inline-flex items-center gap-1.5 text-[12px] text-slate cursor-pointer">
              <Toggle label={`Slide ${s.title} active`} size="sm" checked={s.isActive} disabled={busyId === s._id} onChange={v => toggle(s, v)} /> {s.isActive ? 'Active' : 'Hidden'}
            </label>
            <div className="flex">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 bg-transparent border-none cursor-pointer text-slate disabled:opacity-30"><ChevronUp size={16} /></button>
              <button type="button" aria-label="Move down" disabled={i === slides.length - 1} onClick={() => move(i, 1)} className="p-1.5 bg-transparent border-none cursor-pointer text-slate disabled:opacity-30"><ChevronDown size={16} /></button>
              <button type="button" aria-label="Edit" onClick={() => setEditing(s)} className="p-1.5 bg-transparent border-none cursor-pointer text-slate hover:text-brand-orange"><Pencil size={15} /></button>
              <button type="button" aria-label="Delete" disabled={busyId === s._id} onClick={() => remove(s)} className="p-1.5 bg-transparent border-none cursor-pointer text-slate hover:text-error"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      {editing && <SlideForm slide={editing === 'new' ? null : editing} nextOrder={slides?.length ?? 0} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
