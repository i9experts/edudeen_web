import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Clock } from 'lucide-react';
import { useMaintenanceStatus } from '@/hooks/useMaintenanceStatus';
import {
  isFeatureDown, MAINTENANCE_FEATURE_INFO, MAINTENANCE_TYPE_INFO, type MaintenanceFeature, type MaintenanceStatus,
} from '@/api/services/maintenance';
import { BuyerNavbar } from './BuyerNavbar';
import { Footer } from './Footer';

function Message({ status, feature, compact }: { status: MaintenanceStatus; feature: MaintenanceFeature; compact?: boolean }) {
  const info = MAINTENANCE_TYPE_INFO[status.type ?? 'other'];
  // This feature's own wording wins over the general message.
  const own = status.scopeMessages?.[`feature:${feature}`];
  return (
    <div role="status" className={`flex flex-col items-center text-center bg-cream border border-bone rounded-2xl ${compact ? 'px-5 py-8' : 'px-6 py-14'} max-w-[560px] mx-auto`}>
      <div className="w-12 h-12 rounded-xl bg-brand-pale-orange flex items-center justify-center mb-4"><Wrench size={22} className="text-brand-orange" /></div>
      <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-orange mb-1">{MAINTENANCE_FEATURE_INFO[feature].label} · {info.label}</span>
      <h2 className="text-[19px] font-bold text-charcoal m-0 mb-2">{own?.title || status.title || info.defaultTitle}</h2>
      <p className="text-[14px] text-slate leading-[1.6] m-0 max-w-[440px]">{own?.message || status.message || info.defaultMessage}</p>
      {status.statusNote && <p className="text-[13px] font-medium text-carbon bg-white border border-bone rounded-lg px-3 py-1.5 mt-3 mb-0">{status.statusNote}</p>}
      {status.endsAt && (
        <p className="text-[12.5px] text-charcoal inline-flex items-center gap-1.5 mt-3 mb-0">
          <Clock size={13} className="text-slate" /> Expected back {new Date(status.endsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </div>
  );
}

/**
 * Wraps one page or section. While an admin has that feature under maintenance,
 * the children are replaced by the admin's message — the rest of the site keeps working.
 *   variant="page"    → a full page (navbar + message + footer)
 *   variant="section" → just a card in place of the section (default)
 */
export function FeatureMaintenance({ feature, variant = 'section', children }: { feature: MaintenanceFeature; variant?: 'page' | 'section'; children: ReactNode }) {
  const status = useMaintenanceStatus();
  if (!status || !isFeatureDown(status, feature)) return <>{children}</>;

  if (variant === 'section') return <div className="my-6 px-4"><Message status={status} feature={feature} compact /></div>;
  return (
    <div className="bg-white min-h-full flex flex-col">
      <div className="sticky top-[var(--navbar-top,0px)] z-50"><BuyerNavbar /></div>
      <main className="flex-1 px-5 py-12">
        <Message status={status} feature={feature} />
        <p className="text-center mt-5 mb-0"><Link to="/" className="text-[13px] font-semibold text-brand-orange">Back to home</Link></p>
      </main>
      <Footer />
    </div>
  );
}
