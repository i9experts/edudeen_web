import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { noteNavigation } from '@/utils/visitTracking';

/** Remembers the previous in-app URL so a visit can be tagged "came from Edudeen search / a category". Renders nothing. */
export function VisitNavTracker() {
  const { pathname, search } = useLocation();
  // Layout effects run before the page's own (passive) effects, so the page sees the right "previous" URL.
  useLayoutEffect(() => { noteNavigation(`${pathname}${search}`); }, [pathname, search]);
  return null;
}
