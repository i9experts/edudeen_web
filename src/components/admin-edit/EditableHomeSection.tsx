import { lazy, Suspense, useState, type ReactNode } from 'react';
import { EditableRegion } from './EditableRegion';
import type { HomeSection } from './HomeContentEditorModal';
import type { effectiveHomeContent } from './homeDefaults';

// Admin-only editor: lazy chunk, never downloaded for normal visitors.
const HomeContentEditorModal = lazy(() => import('./HomeContentEditorModal'));

/** An admin-editable block of platform home content (hero, tick strip, trust items, feature block, About, legal). */
export function EditableHomeSection({ section, label, legalKey, legalInitialText, defaults, className, children }: {
  section: HomeSection; label: string; legalKey?: string; legalInitialText?: string; className?: string; children: ReactNode;
  /** What the page shows now (stored value, else built-in text); the editor opens pre-filled with it. */
  defaults?: ReturnType<typeof effectiveHomeContent>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EditableRegion label={label} onEdit={() => setOpen(true)} className={className}>{children}</EditableRegion>
      {open && (
        <Suspense fallback={null}>
          <HomeContentEditorModal section={section} legalKey={legalKey} legalInitialText={legalInitialText} defaults={defaults} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}