import { useEffect, useState } from 'react';
import { Play, History } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { PlanLockedCard, isPlanLockedError } from '@/components/comman/ui/PlanLockedCard';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { TableCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { ScoreCircle, SeoIssueList } from '@/components/comman/seo';
import { useLatestSeoAudit, useSeoAuditHistory, useRunSeoAudit } from '@/hooks/seller/seo/useSeoAudit';

interface AuditTabProps {
  storeId: string;
}

export function AuditTab({ storeId }: AuditTabProps) {
  const { data: latest, loading, error, refetch } = useLatestSeoAudit(storeId);
  const { data: history, loading: historyLoading } = useSeoAuditHistory(storeId, { page: 1, limit: 10 });
  const { runAudit, submitting, error: runError } = useRunSeoAudit();
  const toast = useToast();
  const [locked, setLocked] = useState(false);

  const handleRun = async () => {
    const ok = await runAudit(storeId);
    if (ok) {
      setLocked(false);
      setTimeout(refetch, 1500);
    }
  };

  // Surface every failed run: plan gate -> upgrade card, anything else -> toast.
  useEffect(() => {
    if (!runError) return;
    if (isPlanLockedError(runError)) setLocked(true);
    else toast.error(runError);
  }, [runError]); // eslint-disable-line react-hooks/exhaustive-deps

  if (locked) return <PlanLockedCard storeId={storeId} feature="SEO Audit" />;

  if (error && !loading) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[15px] font-bold text-carbon mb-1">SEO Audit</p>
            <p className="text-[12px] text-slate">No audit has been run for this store yet.</p>
          </div>
          <Button variant="primary" size="sm" icon={<Play size={13} />} loading={submitting} onClick={handleRun}>
            Run Audit
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-[84px] h-[84px] rounded-full bg-bone animate-pulse shrink-0" />
            ) : (
              <ScoreCircle score={latest?.score ?? 0} />
            )}
            <div>
              <p className="text-[15px] font-bold text-carbon mb-1">Latest Audit Score</p>
              <p className="text-[12px] text-slate">
                {latest?.runAt ? `Run on ${new Date(latest.runAt).toLocaleString()}` : 'Not run yet'}
              </p>
              <p className="text-[12px] text-slate mt-1">
                Checklist completion: {latest?.checklistCompletionPercent ?? 0}%
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" icon={<Play size={13} />} loading={submitting} onClick={handleRun}>
            Run New Audit
          </Button>
        </div>
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-carbon mb-3">Issues Found</p>
        <SeoIssueList issues={latest?.issues ?? []} loading={loading} />
      </Card>

      <Card>
        <p className="text-[13px] font-semibold text-carbon mb-3 flex items-center gap-[6px]">
          <History size={14} /> Audit History
        </p>
        {historyLoading ? (
          <TableCardSkeleton rows={4} />
        ) : (
          <div className="flex flex-col gap-2">
            {(history?.items ?? []).map(item => (
              <div key={item._id} className="flex items-center justify-between py-2 border-b border-[#f0eee6] last:border-b-0">
                <span className="text-[12px] text-slate">{new Date(item.runAt).toLocaleString()}</span>
                <span className="text-[13px] font-semibold text-carbon">{item.score}/100</span>
              </div>
            ))}
            {(history?.items ?? []).length === 0 && (
              <p className="text-[12px] text-slate py-4 text-center">No audit history yet.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
