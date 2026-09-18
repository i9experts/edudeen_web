import { Construction } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { EdudeenLogo } from '@/components/comman/ui';

/** Shown when the backend returns a maintenance-mode 503 (see client.ts).
 * Admin routes stay reachable so an admin can log in and turn it back off. */
export function MaintenancePage() {
  usePageTitle('Under Maintenance');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-6 text-center">
      <EdudeenLogo className="mb-8" />
      <div className="w-16 h-16 rounded-2xl bg-brand-pale-orange flex items-center justify-center mb-6">
        <Construction size={28} className="text-brand-orange" />
      </div>
      <h1 className="text-[22px] font-bold text-charcoal mb-2">We'll be right back</h1>
      <p className="text-[14px] text-slate max-w-[380px] leading-[1.6] mb-6">
        Edudeen is undergoing scheduled maintenance. We're working to get everything back up and running as quickly as possible.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2.5 bg-brand-orange text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-brand-deep-orange transition-colors duration-150"
      >
        Try Again
      </button>
    </div>
  );
}
