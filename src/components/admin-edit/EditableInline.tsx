import { lazy, Suspense, useState, type ReactNode } from 'react';
import { EditableRegion } from './EditableRegion';

// Admin-only editors: lazy chunks, never downloaded for normal visitors.
const SocialLinksEditorModal = lazy(() => import('./SocialLinksEditorModal'));
const CategoriesEditorModal = lazy(() => import('./CategoriesEditorModal'));
const DealsEditorModal = lazy(() => import('./DealsEditorModal'));
const FaqEditorModal = lazy(() => import('./FaqEditorModal'));

/** Footer social icons, editable by an admin in Edit mode. */
export function EditableSocialLinks({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EditableRegion label="social links" hint="Social media icons in the footer" global onEdit={() => setOpen(true)} className={className}>{children}</EditableRegion>
      {open && <Suspense fallback={null}><SocialLinksEditorModal onClose={() => setOpen(false)} /></Suspense>}
    </>
  );
}

/** Home subject tabs, editable by an admin in Edit mode. `onChanged` refetches the category tree. */
export function EditableCategories({ onChanged, className, children }: { onChanged: () => void; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EditableRegion label="categories" hint="Subject tabs - add, rename, reorder" onEdit={() => setOpen(true)} className={className}>{children}</EditableRegion>
      {open && <Suspense fallback={null}><CategoriesEditorModal onChanged={onChanged} onClose={() => setOpen(false)} /></Suspense>}
    </>
  );
}

/** The home deals banner, editable by an admin in Edit mode (even when no sale is live and the banner is empty). */
export function EditableDeals({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EditableRegion label="deals banner" hint="Running sales and campaign countdown" onEdit={() => setOpen(true)} className={className}>{children}</EditableRegion>
      {open && <Suspense fallback={null}><DealsEditorModal onClose={() => setOpen(false)} /></Suspense>}
    </>
  );
}

/** The public FAQ list, editable by an admin in Edit mode (add / edit / show-hide / delete). `onChanged` refetches the list. */
export function EditableFaqs({ onChanged, className, children }: { onChanged: () => void; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EditableRegion label="FAQ list" hint="Add, edit, hide or delete questions" onEdit={() => setOpen(true)} className={className}>{children}</EditableRegion>
      {open && <Suspense fallback={null}><FaqEditorModal onChanged={onChanged} onClose={() => setOpen(false)} /></Suspense>}
    </>
  );
}
