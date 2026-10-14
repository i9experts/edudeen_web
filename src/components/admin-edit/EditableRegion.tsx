import { useId, useRef, type ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { clsx } from 'clsx';
import { useAdminEdit } from '@/contexts/adminEditCtx';
import { useRegisterEditable } from '@/contexts/editRegistryCtx';
import type { PromotionPlacement } from '@/api/services/banner';

/**
 * Wraps an admin-editable part of a public page. For everyone except an admin in Edit mode it renders just its children.
 * In Edit mode it also lists itself in the Edit-mode sidebar ("On this page"); `id`/`group`/`placement` are optional hints.
 */
export function EditableRegion({ label, onEdit, children, className, id, group, placement }: {
  label: string; onEdit: () => void; children: ReactNode; className?: string;
  /** Stable id for the sidebar list (defaults to a generated one). */
  id?: string;
  /** Heading in the sidebar list (footer regions are grouped as "Footer" automatically). */
  group?: string;
  placement?: PromotionPlacement;
}) {
  const { editing } = useAdminEdit();
  const autoId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useRegisterEditable({ id: id ?? autoId, label, group, placement, open: onEdit, elRef: ref }, editing);
  if (!editing) return <>{children}</>;
  return (
    <div ref={ref} className={clsx('relative outline-2 outline-dashed outline-brand-orange/70 outline-offset-2 rounded-md', className)} translate="no">
      {children}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        className="absolute top-2 end-2 z-30 inline-flex items-center gap-1 rounded-full bg-brand-orange text-white text-[12px] font-semibold px-3 py-1.5 shadow-md cursor-pointer border-0 hover:opacity-90"
      >
        <Pencil size={12} /> Edit
      </button>
    </div>
  );
}
