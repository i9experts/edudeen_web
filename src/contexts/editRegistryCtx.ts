import { createContext, useContext, useEffect, useRef, type RefObject } from 'react';
import type { PromotionPlacement } from '@/api/services/banner';

/** One admin-editable region on the page currently shown (listed in the Edit-mode sidebar's "On this page" tab). */
export interface EditableEntry {
  id: string;
  label: string;
  /** Heading it is listed under; regions inside the page <footer> are always grouped as "Footer". */
  group?: string;
  /** One-line description shown under the name in the sidebar. */
  hint?: string;
  /** True when the region has nothing yet (empty banner slot) - the sidebar flags it "Empty - add one". */
  empty?: boolean;
  /** True for site-wide items (header/footer, social links, categories...) that appear on many pages. */
  global?: boolean;
  /** Set for banner placements. */
  placement?: PromotionPlacement;
  getEl: () => HTMLElement | null;
  /** Opens the region's own editor. */
  open: () => void;
}

export interface EditRegistryState {
  entries: EditableEntry[];
  register: (entry: EditableEntry) => () => void;
}

export const EditRegistryCtx = createContext<EditRegistryState>({ entries: [], register: () => () => {} });

/** Safe outside the provider (no entries). */
export function useEditableRegistry() {
  return useContext(EditRegistryCtx);
}

/**
 * Registers an editable region while `enabled` (= admin Edit mode is on); unregisters on unmount, so the list always
 * matches what the current page renders. EditableRegion / PlacementBanner call this - pages normally do not need to.
 */
export function useRegisterEditable(
  o: { id: string; label: string; group?: string; hint?: string; empty?: boolean; global?: boolean; placement?: PromotionPlacement; open: () => void; elRef: RefObject<HTMLElement | null> },
  enabled: boolean,
) {
  const { register } = useEditableRegistry();
  const openRef = useRef(o.open);
  openRef.current = o.open;
  const { id, label, group, hint, empty, global, placement, elRef } = o;
  useEffect(() => {
    if (!enabled) return;
    return register({ id, label, group, hint, empty, global, placement, getEl: () => elRef.current, open: () => openRef.current() });
  }, [enabled, id, label, group, hint, empty, global, placement, elRef, register]);
}

/** Scrolls an element to the middle of the screen and flashes an outline around it. */
export function pulseElement(el: HTMLElement | null) {
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  try {
    el.animate(
      [{ boxShadow: '0 0 0 0 rgba(242,101,34,.75)' }, { boxShadow: '0 0 0 14px rgba(242,101,34,0)' }],
      { duration: 900, iterations: 2, easing: 'ease-out' },
    );
  } catch { /* animate unsupported - scrolling alone is enough */ }
}
