import { lazy, Suspense, useState, type ReactNode } from 'react';
import { EditableRegion } from './EditableRegion';
import type { HomeSection } from './HomeContentEditorModal';

// Admin-only editor: lazy chunk, never downloaded for normal visitors.
const HomeContentEditorModal = lazy(() => import('./HomeContentEditorModal'));

/** An admin-editable block of platform home content (hero, tick strip, trust items, feature block, About, legal). */
export function EditableHomeSection({ section, label, legalKey, legalInitialText, className, children }: {
  section: HomeSection; label: string; legalKey?: string; legalInitialText?: string; className?: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EditableRegion label={label} onEdit={() => setOpen(true)} className={className}>{children}</EditableRegion>
      {open && (
        <Suspense fallback={null}>
          <HomeContentEditorModal section={section} legalKey={legalKey} legalInitialText={legalInitialText} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}