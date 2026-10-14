import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Plus } from 'lucide-react';
import { BannerCarousel } from '@/components/comman/marketplace/BannerCarousel';
import { type PromotionPlacement } from '@/api/services/banner';
import { BANNERS_CHANGED_EVENT, cachedBanners, loadPlacementBanners } from '@/components/comman/marketplace/placementBannerCache';
import { useAdminEdit } from '@/contexts/adminEditCtx';
import { EditableRegion } from '@/components/admin-edit/EditableRegion';
import { PLACEMENT_NAME } from '@/components/admin-edit/placementLabels';
import { useRegisterEditable } from '@/contexts/editRegistryCtx';

// Admin-only editor: its own chunk, never downloaded for normal visitors.
const PlacementEditorModal = lazy(() => import('@/components/admin-edit/PlacementEditorModal'));

/**
 * The live banners for one placement - Edudeen's own (Admin -> Banners) and
 * sellers' approved paid promotions, which run as banners in the same slot.
 * Renders nothing when the placement has no active banner, so pages look
 * exactly as before until the admin publishes one. Views and clicks are
 * tracked (and credited to the seller's promotion) by BannerCarousel.
 * When an admin has inline Edit mode on, it also offers Edit / "Add banner here".
 */
export function PlacementBanner({ placement, className }: { placement: PromotionPlacement; className?: string }) {
  const [items, setItems] = useState(() => cachedBanners(placement));
  const [editorOpen, setEditorOpen] = useState(false);
  const { editing } = useAdminEdit();
  // The slide visible right now, so the editor can open focused on it (a ref: no re-render on every rotation).
  const visibleId = useRef<string | undefined>(undefined);
  const trackVisible = useRef((id: string) => { visibleId.current = id; }).current;
  const [focusId, setFocusId] = useState<string | undefined>();
  // An empty placement is not wrapped in EditableRegion, so it lists itself in the Edit-mode sidebar here.
  const addRef = useRef<HTMLButtonElement>(null);
  useRegisterEditable(
    { id: `banner:${placement}`, label: `${PLACEMENT_NAME[placement]} banner`, group: 'Banners', placement, open: () => setEditorOpen(true), elRef: addRef },
    editing && !items.length,
  );

  useEffect(() => {
    let alive = true;
    const run = () => loadPlacementBanners(placement).then(list => { if (alive) setItems(list); });
    run();
    window.addEventListener(BANNERS_CHANGED_EVENT, run);
    return () => { alive = false; window.removeEventListener(BANNERS_CHANGED_EVENT, run); };
  }, [placement]);

  const editor = editorOpen && (
    <Suspense fallback={null}>
      <PlacementEditorModal placement={placement} focusId={focusId} onClose={() => setEditorOpen(false)} />
    </Suspense>
  );

  if (!items.length) {
    if (!editing) return null;
    return (
      <>
        <button
          ref={addRef}
          type="button"
          onClick={() => setEditorOpen(true)}
          className={clsx('w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-orange/70 bg-cream/60 text-brand-orange text-[13px] font-semibold py-8 cursor-pointer', className)}
        >
          <Plus size={16} /> Add banner here
        </button>
        {editor}
      </>
    );
  }
  return (
    <>
      <EditableRegion label={`${PLACEMENT_NAME[placement]} banner`} id={`banner:${placement}`} group="Banners" placement={placement} onEdit={() => { setFocusId(visibleId.current); setEditorOpen(true); }}>
        <section aria-label="Featured promotions" className={clsx('relative w-full overflow-hidden rounded-2xl bg-cream aspect-[2/1] sm:aspect-[3/1] lg:aspect-[4/1]', className)}>
          <BannerCarousel entityType="banner" banners={items} onActiveChange={trackVisible} />
        </section>
      </EditableRegion>
      {editor}
    </>
  );
}