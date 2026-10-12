import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { clsx } from 'clsx';
import { useAdminEdit } from '@/contexts/adminEditCtx';

/** Wraps an admin-editable part of a public page. For everyone except an admin in Edit mode it renders just its children. */
export function EditableRegion({ label, onEdit, children, className }: { label: string; onEdit: () => void; children: ReactNode; className?: string }) {
  const { editing } = useAdminEdit();
  if (!editing) return <>{children}</>;
  return (
    <div className={clsx('relative outline-2 outline-dashed outline-brand-orange/70 outline-offset-2 rounded-md', className)} translate="no">
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