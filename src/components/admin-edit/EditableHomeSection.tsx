import { lazy, Suspense, useState, type ReactNode } from 'react';
import { EditableRegion } from './EditableRegion';
import type { HomeSection } from './HomeContentEditorModal';
import type { effectiveHomeContent } from './homeDefaults';

// Admin-only editor: lazy chunk, never downloaded for normal visitors.
const HomeContentEditorModal = lazy(() => import('./HomeContentEditorModal'));

const SECTION_HINT: Record<string, string> = {
  hero: 'Title, text, image and buttons at the top',
  promise: 'The short tick-mark line under the banner',
  trust: 'Service points such as delivery and support',
  feature: 'The highlighted promo block',
  creator: 'The invitation block for sellers',
  apps: 'App Store and Google Play links',
  contact: 'Phone, WhatsApp, email and address in the footer',
  about: 'Heading and story text of this page',
  legal: 'The policy text of this page',
};

/** An admin-editable block of platform home content (hero, tick strip, trust items, feature block, About, legal). */
export function EditableHomeSection({ section, label, legalKey, legalInitialText, defaults, className, id, group, hint, global, children }: {
  section: HomeSection; label: string; legalKey?: string; legalInitialText?: string; className?: string; children: ReactNode;
  /** Optional sidebar hints (see EditableRegion). */
  id?: string; group?: string; hint?: string; global?: boolean;
  /** What the page shows now (stored value, else built-in text); the editor opens pre-filled with it. */
  defaults?: ReturnType<typeof effectiveHomeContent>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <EditableRegion label={label} id={id} group={group} hint={hint ?? SECTION_HINT[section]} global={global} onEdit={() => setOpen(true)} className={className}>{children}</EditableRegion>
      {open && (
        <Suspense fallback={null}>
          <HomeContentEditorModal section={section} legalKey={legalKey} legalInitialText={legalInitialText} defaults={defaults} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}