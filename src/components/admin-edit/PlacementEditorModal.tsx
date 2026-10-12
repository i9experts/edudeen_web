import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ImageIcon, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import type { AxiosRequestConfig } from 'axios';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import {
  apiDeleteBanner, apiGetAdminBanners, apiPauseBanner, apiResumeBanner, apiUpdateBanner,
  bannerPlacements, type Banner, type PromotionPlacement,
} from '@/api/services/banner';
import { BannerFormModal, PLACEMENT_LABEL, effectiveState, fmtWhen } from '@/features/admin/pages/BannerFormModal';
import { invalidatePlacementBanners } from '@/components/comman/marketplace/placementBannerCache';
import { useReauth } from '@/contexts/reauthCtx';
import { inlineEditConfig } from '@/api/services/reauth';

/** Inline editor for one banner placement. Every write asks for the admin password first. */
export default function PlacementEditorModal({ placement, onClose }: { placement: PromotionPlacement; onClose: () => void }) {
  const { confirm } = useReauth();
  const [all, setAll] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<{ banner: Banner | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setAll((await apiGetAdminBanners()).data ?? []); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load banners.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const banners = useMemo(
    () => all.filter(b => bannerPlacements(b).includes(placement)).sort((a, b) => a.order - b.order),
    [all, placement],
  );

  const beforeWrite = useCallback(async (): Promise<AxiosRequestConfig | null> => {
    const token = await confirm();
    return token ? inlineEditConfig(token) : null;
  }, [confirm]);

  const afterWrite = async () => { invalidatePlacementBanners(); await load(); };

  const run = async (id: string, fn: (cfg: AxiosRequestConfig) => Promise<unknown>) => {
    setError('');
    const cfg = await beforeWrite();
    if (!cfg) return; // password not confirmed - nothing changed
    setBusyId(id);
    try { await fn(cfg); await afterWrite(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save the change.'); }
    finally { setBusyId(null); }
  };

  const move = (i: number, dir: -1 | 1) => {
    const a = banners[i]; const b = banners[i + dir];
    if (!a || !b) return;
    void run(a._id, async cfg => {
      // Index-based values so equal/gapped orders still end up swapped.
      await apiUpdateBanner(a._id, { order: i + dir }, cfg);
      await apiUpdateBanner(b._id, { order: i }, cfg);
    });
  };

  return (
    <>
      <Modal mobileSheet width={620} title={`${PLACEMENT_LABEL[placement]} banners`} onClose={onClose}
        footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button onClick={() => setForm({ banner: null })}><Plus size={14} className="inline align-middle me-1" />Add banner</Button></>}>
        <p className="text-[12px] text-slate mb-3">Every change asks for your password and goes live immediately (drafts and scheduled banners stay hidden until their time).</p>
        {error && <p className="text-[12px] text-error mb-2" role="alert">{error}</p>}
        {loading ? (
          <div className="flex flex-col gap-2"><SkeletonBox className="h-[72px] w-full" /><SkeletonBox className="h-[72px] w-full" /></div>
        ) : banners.length === 0 ? (
          <p className="text-[13px] text-slate py-6 text-center">No banners for this placement yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {banners.map((b, i) => {
              const st = effectiveState(b);
              const busy = busyId === b._id;
              return (
                <li key={b._id} className="flex items-center gap-3 rounded-xl border border-bone p-2">
                  <div className="w-[96px] h-[54px] rounded-md bg-cream overflow-hidden shrink-0 flex items-center justify-center">
                    {b.bannerImage ? <img src={b.bannerImage} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-slate" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ background: st.style.bg, color: st.style.color }}>{st.style.label}</span>
                    {(b.startAt || b.endAt) && (
                      <p className="text-[12px] text-slate mt-0.5 truncate">{b.startAt ? `From ${fmtWhen(b.startAt)}` : ''}{b.startAt && b.endAt ? ' · ' : ''}{b.endAt ? `Until ${fmtWhen(b.endAt)}` : ''}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <IconBtn label="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></IconBtn>
                    <IconBtn label="Move down" disabled={busy || i === banners.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></IconBtn>
                    {b.status === 'paused'
                      ? <IconBtn label="Resume" disabled={busy} onClick={() => void run(b._id, cfg => apiResumeBanner(b._id, cfg))}><Play size={14} /></IconBtn>
                      : (b.status !== 'draft' && b.status !== 'expired') && <IconBtn label="Pause" disabled={busy} onClick={() => void run(b._id, cfg => apiPauseBanner(b._id, cfg))}><Pause size={14} /></IconBtn>}
                    <IconBtn label="Edit" disabled={busy} onClick={() => setForm({ banner: b })}><Pencil size={14} /></IconBtn>
                    <IconBtn label="Delete" disabled={busy} onClick={() => setConfirmDelete(b)}><Trash2 size={14} /></IconBtn>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>

      {form && (
        <BannerFormModal
          banner={form.banner}
          currentCount={banners.length}
          defaultPlacement={placement}
          beforeWrite={beforeWrite}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); void afterWrite(); }}
        />
      )}

      {confirmDelete && (
        <Modal title="Delete this banner?" onClose={() => setConfirmDelete(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button onClick={() => { const b = confirmDelete; setConfirmDelete(null); void run(b._id, cfg => apiDeleteBanner(b._id, cfg)); }}>Delete</Button></>}>
          <p className="text-[13px] text-slate">It is removed from every placement it runs on. You will be asked for your password next.</p>
        </Modal>
      )}
    </>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-bone bg-white text-charcoal cursor-pointer hover:bg-fog disabled:opacity-40 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}