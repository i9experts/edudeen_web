import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Construction, Database, CreditCard, ShieldCheck, Gauge, Siren, Wrench, Clock, type LucideIcon } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useMaintenanceStatus } from '@/hooks/useMaintenanceStatus';
import { EdudeenLogo } from '@/components/comman/ui';
import { MAINTENANCE_SCOPE_INFO, MAINTENANCE_TYPE_INFO, type MaintenanceType } from '@/api/services/maintenance';

const ICON: Record<MaintenanceType, LucideIcon> = {
  scheduled_upgrade: Construction, database: Database, payments: CreditCard, security: ShieldCheck, performance: Gauge, emergency: Siren, other: Wrench,
};

function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!target) return; const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return 'any moment now';
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

/** Shown when the backend answers a maintenance 503. Says what is down, why, and when it should be back; returns to the site on its own once it is over. */
export function MaintenancePage() {
  usePageTitle('Under Maintenance');
  const status = useMaintenanceStatus(15_000);
  const left = useCountdown(status?.state === 'active' ? status.endsAt : null);

  // Maintenance ended (or never applied to the whole site) — go back.
  if (status && status.state !== 'active') return <Navigate to="/" replace />;

  const type: MaintenanceType = status?.type ?? 'scheduled_upgrade';
  const info = MAINTENANCE_TYPE_INFO[type];
  const Icon = ICON[type];
  const scopes = status?.scopes ?? ['all'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-6 py-10 text-center">
      <EdudeenLogo className="mb-8" />
      <div className="w-16 h-16 rounded-2xl bg-brand-pale-orange flex items-center justify-center mb-6">
        <Icon size={28} className="text-brand-orange" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange mb-2">{info.label}</span>
      <h1 className="text-[22px] font-bold text-charcoal mb-2">{status?.title || info.defaultTitle}</h1>
      <p className="text-[14px] text-slate max-w-[440px] leading-[1.6] mb-5">{status?.message || info.defaultMessage}</p>

      {status?.statusNote && (
        <p className="text-[13px] font-medium text-carbon bg-white border border-bone rounded-lg px-4 py-2 mb-4 max-w-[440px]">{status.statusNote}</p>
      )}

      <ul className="list-none m-0 p-0 flex flex-wrap justify-center gap-2 mb-5" aria-label="Affected areas">
        {scopes.map(s => (
          <li key={s} className="text-[12px] text-charcoal bg-white border border-bone rounded-full px-3 py-1">{MAINTENANCE_SCOPE_INFO[s].label}</li>
        ))}
      </ul>

      {status?.endsAt && (
        <p className="text-[13px] text-charcoal inline-flex items-center gap-1.5 mb-6">
          <Clock size={14} className="text-slate" />
          Expected back {new Date(status.endsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}{left && left !== 'any moment now' ? ` · in ${left}` : left ? ` · ${left}` : ''}
        </p>
      )}

      <button onClick={() => window.location.assign('/')}
        className="px-5 py-2.5 bg-brand-orange text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-brand-deep-orange transition-colors duration-150">
        Try again
      </button>
      <p className="text-[11.5px] text-slate mt-4 m-0">This page refreshes by itself — you'll be taken back as soon as we're done.</p>
    </div>
  );
}