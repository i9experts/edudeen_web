import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarClock, AlertTriangle, X } from 'lucide-react';
import { useMaintenanceStatus } from '@/hooks/useMaintenanceStatus';
import { scopeLabel } from '@/api/services/maintenance';

/** Site-wide strip: a heads-up before scheduled maintenance, or "this part is down" while a partial one runs. */
export function MaintenanceNotice() {
  const status = useMaintenanceStatus();
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState<string | null>(null);

  if (!status || status.state === 'off') return null;
  if (pathname.startsWith('/admin') || pathname === '/maintenance') return null;
  const scopes = status.scopes ?? ['all'];
  // A whole-platform outage already shows the full page; only the heads-up needs a strip.
  if (status.state === 'active' && scopes.includes('all')) return null;

  const key = `${status.state}-${status.startsAt}-${status.updatedAt ?? ''}`;
  if (hidden === key) return null;

  const what = scopes.includes('all') ? 'The whole platform' : scopes.map(s => scopeLabel(s)).join(', ');
  const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
  const text = status.state === 'scheduled'
    ? `${status.title || 'Scheduled maintenance'}: ${what} will be unavailable from ${fmt(status.startsAt)}${status.endsAt ? ` until about ${fmt(status.endsAt)}` : ''}.`
    : `${what} ${scopes.length > 1 ? 'are' : 'is'} temporarily unavailable${status.endsAt ? ` — back around ${fmt(status.endsAt)}` : ''}. ${status.message ?? ''}`;

  return (
    <div role="status" className={`relative z-[70] flex items-center justify-center gap-2 px-10 py-2 text-[12.5px] font-medium text-center ${status.state === 'scheduled' ? 'bg-[#fff4d6] text-[#6b4c00]' : 'bg-error-bg text-error'}`}>
      {status.state === 'scheduled' ? <CalendarClock size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
      <span>{text}</span>
      <button type="button" aria-label="Dismiss" onClick={() => setHidden(key)} className="absolute end-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-current p-1"><X size={14} /></button>
    </div>
  );
}