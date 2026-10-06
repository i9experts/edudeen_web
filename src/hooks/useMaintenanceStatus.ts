import { useEffect, useState } from 'react';
import { apiGetMaintenanceStatus, type MaintenanceStatus } from '@/api/services/maintenance';

/** Polls the public maintenance status (a cheap cached read) so pages and the notice react without a reload. */
export function useMaintenanceStatus(intervalMs = 60_000): MaintenanceStatus | null {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = () => apiGetMaintenanceStatus().then(r => { if (!cancelled) setStatus(r.data); }).catch(() => {});
    load();
    const id = window.setInterval(load, intervalMs);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [intervalMs]);
  return status;
}