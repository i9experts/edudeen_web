import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { AppCrashScreen } from '@/components/comman/AppCrashScreen';
import { reloadOnceForStaleChunk } from '@/utils/lazyWithRetry';

/** `errorElement` of both routers: shown when something throws outside RootLayout's own boundary (the layout itself, router internals). */
export function RouterErrorScreen() {
  const error = useRouteError();
  useEffect(() => {
    console.error('[Router] Uncaught route error:', error);
    // A page chunk that no longer exists after a deploy: one guarded reload fetches the new build.
    const msg = error instanceof Error ? error.message : '';
    if (/dynamically imported module|Importing a module script failed|Loading chunk/i.test(msg)) reloadOnceForStaleChunk();
    const sentry = (window as unknown as { __sentry?: { captureException?: (e: unknown) => void } }).__sentry;
    sentry?.captureException?.(error);
  }, [error]);
  return <AppCrashScreen />;
}
