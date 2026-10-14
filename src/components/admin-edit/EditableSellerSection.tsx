import { lazy, Suspense, useState, type ReactNode } from 'react';
import { EditableRegion } from './EditableRegion';
import { SELLER_PAGE_SECTIONS } from '@/components/seller-page/sellerPageDefaults';
import { useAdminEdit } from '@/contexts/adminEditCtx';
import type { SellerPageSectionKey } from '@/api/services/publicPlatformConfig';

// Admin-only editor: lazy chunk, never downloaded for normal visitors.
const SellerPageEditorModal = lazy(() => import('./SellerPageEditorModal'));

/**
 * One admin-editable section of /become-a-seller. Visitors see the children only (and nothing at all when the
 * section is hidden). An admin in Edit mode still sees a hidden section (dimmed) so it can be switched back on.
 */
export function EditableSellerSection({ section, visible, children }: { section: SellerPageSectionKey; visible: boolean; children: ReactNode }) {
  const { editing } = useAdminEdit();
  const [open, setOpen] = useState(false);
  if (!visible && !editing) return null;
  return (
    <>
      <EditableRegion label={SELLER_PAGE_SECTIONS.find(s => s.key === section)?.label ?? 'section'} onEdit={() => setOpen(true)}>
        <div className={visible ? undefined : 'opacity-40'}>
          {!visible && <p className="text-center text-[12px] font-semibold text-slate py-1">Hidden from visitors</p>}
          {children}
        </div>
      </EditableRegion>
      {open && (
        <Suspense fallback={null}>
          <SellerPageEditorModal section={section} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
