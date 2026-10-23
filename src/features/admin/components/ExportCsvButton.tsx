import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { apiDownloadAdminExport, type AdminExportKind } from '@/api/services/adminExports';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';

const RIGHT: Record<AdminExportKind, string> = {
  users: 'users.export',
  orders: 'orders.export',
  listings: 'marketplace.export',
  proofs: 'payments.export',
};

/** "Export CSV" for an admin list. Hidden for staff without the matching export right; shows the server's error otherwise. */
export function ExportCsvButton({ kind, params, label = 'Export CSV' }: {
  kind: AdminExportKind;
  params?: Record<string, string | number | boolean | undefined | null>;
  label?: string;
}) {
  const access = useAdminAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!access.can(RIGHT[kind])) return null;

  async function run() {
    setBusy(true);
    setError('');
    try { await apiDownloadAdminExport(kind, params); }
    catch (err) { setError(err instanceof Error ? err.message : 'Export failed.'); }
    finally { setBusy(false); }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" icon={<Download size={12} />} loading={busy} onClick={run}>{label}</Button>
      {error && <span role="alert" className="text-[12px] text-error max-w-[240px] text-end">{error}</span>}
    </span>
  );
}
