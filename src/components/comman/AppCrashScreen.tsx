import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * Last-resort full-page screen. It sits ABOVE the providers and the router (main.tsx boundary, router errorElement),
 * so it must not use any context, router hook or app component: plain elements only, and `<a href>` instead of Link.
 */
export function AppCrashScreen() {
  return (
    <div role="alert" className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="size-12 rounded-full bg-brand-pale-orange flex items-center justify-center">
        <AlertTriangle size={22} className="text-brand-orange" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-[17px] font-bold text-carbon">Something went wrong</h1>
        <p className="text-[13px] text-slate mt-1 max-w-[360px]">
          Edudeen ran into an unexpected problem. Reloading usually fixes it; if it keeps happening, please contact support.
        </p>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <a href="/" className="inline-flex items-center rounded-md border border-bone bg-white px-3.5 py-2 text-[13px] font-medium text-charcoal no-underline">
          Go to home
        </a>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-md border-none bg-brand-royal px-3.5 py-2 text-[13px] font-medium text-white cursor-pointer"
        >
          <RotateCw size={13} aria-hidden="true" /> Reload page
        </button>
      </div>
    </div>
  );
}
