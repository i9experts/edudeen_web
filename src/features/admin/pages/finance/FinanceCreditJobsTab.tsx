import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button, Table, type TableColumn } from '@/components/comman/ui';
import { apiAdminListCreditJobs, apiAdminRetryCreditJob, type CreditJobRow, type CreditJobStatus } from '@/api/services/finance/adminFinance';
import { formatDate } from '@/components/comman/analytics/format';

const STATUS_FILTERS: { id: CreditJobStatus | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending retry' },
  { id: 'failed_final', label: 'Failed (needs action)' },
  { id: 'done', label: 'Credited' },
];

const STATUS_STYLE: Record<CreditJobStatus, string> = {
  pending: 'bg-warning-bg text-warning',
  failed_final: 'bg-error-bg text-error',
  done: 'bg-success-bg text-success',
};
const STATUS_LABEL: Record<CreditJobStatus, string> = { pending: 'Pending retry', failed_final: 'Failed', done: 'Credited' };

export function FinanceCreditJobsTab() {
  const [status, setStatus] = useState<CreditJobStatus | ''>('pending');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CreditJobRow[]>([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return apiAdminListCreditJobs({ status, page, limit: 20 })
      .then(res => { setRows(res.data?.items ?? []); setPages(res.data?.pages ?? 1); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load credit jobs.'))
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  async function retry(job: CreditJobRow) {
    setRetryingId(job._id);
    setNotice('');
    try {
      const res = await apiAdminRetryCreditJob(job._id);
      setNotice(res.data?.creditStatus === 'credited'
        ? `Order #${job.orderId} was credited to the seller.`
        : `Order #${job.orderId} is still failing: ${res.data?.job?.lastError ?? 'unknown error'}`);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Retry failed.');
    } finally {
      setRetryingId(null);
    }
  }

  const columns: TableColumn<CreditJobRow>[] = [
    { key: 'order', header: 'Order', render: j => <span className="font-mono text-[12px] text-charcoal">#{j.orderId}</span> },
    { key: 'store', header: 'Store', render: j => <span className="font-mono text-[12px] text-graphite">{j.storeId}</span> },
    {
      key: 'amount', header: 'Amount',
      render: j => <span className="text-graphite whitespace-nowrap">{j.payload?.currency ?? ''} {(j.payload?.saleAmount ?? 0).toFixed(2)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: j => <span className={`inline-flex rounded-full px-2 py-[1px] text-[12px] font-semibold ${STATUS_STYLE[j.status]}`}>{STATUS_LABEL[j.status]}</span>,
    },
    { key: 'attempts', header: 'Attempts', render: j => <span className="text-graphite">{j.attempts}</span> },
    {
      key: 'error', header: 'Last error',
      render: j => <span className="text-[12px] text-slate break-words">{j.lastError ?? '—'}</span>,
    },
    {
      key: 'next', header: 'Next try / done',
      render: j => <span className="text-slate whitespace-nowrap">{formatDate(j.status === 'done' ? (j.doneAt ?? j.updatedAt) : j.nextAttemptAt)}</span>,
    },
    {
      key: 'actions', header: '', align: 'right',
      render: j => j.status === 'done' ? null : (
        <Button size="xs" variant="outline" icon={<RefreshCw size={12} />} loading={retryingId === j._id} onClick={() => retry(j)}>Retry</Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-slate">
        When crediting a seller after a paid order fails (for example an exchange-rate outage), the credit is queued here and retried automatically every 5 minutes. After 10 failed attempts it needs a manual retry.
      </p>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <Button key={f.id || 'all'} size="sm" variant={status === f.id ? 'primary' : 'outline'} onClick={() => { setStatus(f.id); setPage(1); }}>
            {f.label}
          </Button>
        ))}
      </div>

      {notice && <p className="text-[12px] text-graphite bg-cream border border-bone rounded-lg px-3 py-2">{notice}</p>}

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        {error ? (
          <div className="px-4 py-6 text-center flex flex-col items-center gap-3">
            <p className="text-[13px] text-error">{error}</p>
            <Button size="sm" variant="outline" onClick={() => load()}>Try again</Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={rows}
            keyExtractor={j => j._id}
            loading={loading}
            emptyState={{
              icon: status === 'done' || status === '' ? <CheckCircle2 size={28} className="text-slate" /> : <AlertTriangle size={28} className="text-slate" />,
              title: 'No credit jobs',
              description: 'Every seller credit has been recorded successfully.',
            }}
          />
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-[12px] text-slate">Page {page} of {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
