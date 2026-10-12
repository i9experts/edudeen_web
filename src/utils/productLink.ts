import type { MouseEvent } from 'react';

/** True for a plain left click (no new-tab / modifier keys) — the only click we handle in JS. */
export function isPlainLeftClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/** Capture-phase guard for a card-wide link: clicks on inner buttons must not follow the link. */
export function blockLinkForButtons(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('button, [role="button"]')) e.preventDefault();
}
