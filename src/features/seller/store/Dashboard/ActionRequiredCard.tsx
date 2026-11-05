import { Link } from 'react-router-dom';
import {
  Truck, Undo2, MessageSquare, HelpCircle, ClipboardCheck, XCircle, Wallet, CheckCircle2, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SkeletonBox } from '@/components/comman/ui';
import { StudioPanel } from '@/features/seller/components/studio/Studio';
import { useStoreActionItems } from '@/hooks/store/useStoreDashboardSummary';
import type { ActionItems } from '@/api/services/storeDashboard';
import { formatNumber } from '@/components/comman/analytics/format';

interface Row { key: string; Icon: LucideIcon; label: string; count: number; to: string; overdue?: { count: number; to: string } }

/** One row per thing that needs the seller; each links to the page whose list has exactly that many rows. */
export function buildActionRows(storeId: string, a: ActionItems): Row[] {
  const base = `/store/${storeId}`;
  const rows: Row[] = [
    { key: 'ship',      Icon: Truck,          label: 'Orders to ship',       count: a.ordersToShip,       to: `${base}/orders?action=toship`,
      overdue: a.ordersOverdue > 0 ? { count: a.ordersOverdue, to: `${base}/orders?action=overdue` } : undefined },
    { key: 'returns',   Icon: Undo2,          label: 'Return requests',      count: a.returnsPending,     to: `${base}/returns?status=requested` },
    { key: 'messages',  Icon: MessageSquare,  label: 'Unread messages',      count: a.unreadMessages,     to: `${base}/messages` },
    { key: 'questions', Icon: HelpCircle,     label: 'Unanswered questions', count: a.unansweredQuestions, to: `${base}/questions` },
    { key: 'review',    Icon: ClipboardCheck, label: 'Products in review',   count: a.pendingReview,      to: `${base}/products?status=pending_review` },
    { key: 'rejected',  Icon: XCircle,        label: 'Products not approved', count: a.rejected,          to: `${base}/products?status=rejected` },
    { key: 'payout',    Icon: Wallet,         label: 'Add payout details',   count: a.payoutMissing,      to: `${base}/finance` },
  ];
  // 0 rows are hidden. An overdue-only situation cannot happen (overdue is a subset of to-ship).
  return rows.filter(r => r.count > 0);
}

export function ActionRequiredCard({ storeId }: { storeId: string }) {
  const { items, loading, error, refetch } = useStoreActionItems(storeId);

  if (loading) {
    return (
      <StudioPanel title="Action required">
        <div aria-busy="true" aria-label="Loading action items" className="flex flex-col gap-2">
          {[0, 1, 2].map(i => <SkeletonBox key={i} width="100%" height={44} rounded="12px" />)}
        </div>
      </StudioPanel>
    );
  }
  if (error) {
    return (
      <StudioPanel title="Action required">
        <div role="alert" className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-error-bg text-error text-[13px] border border-error/10">
          <span>{error}</span>
          <button type="button" onClick={refetch} className="font-semibold underline bg-transparent border-none cursor-pointer text-error shrink-0">Try again</button>
        </div>
      </StudioPanel>
    );
  }
  if (!items) return null; // older API without actionItems

  const rows = buildActionRows(storeId, items);

  return (
    <StudioPanel title="Action required" sub={rows.length ? 'Things waiting for you' : undefined}>
      {rows.length === 0 ? (
        <p className="m-0 flex items-center gap-2 text-[14px] text-charcoal">
          <CheckCircle2 size={18} className="text-success shrink-0" />
          You&apos;re all caught up
        </p>
      ) : (
        <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map(({ key, Icon, label, count, to, overdue }) => (
            <li key={key} className="flex items-center gap-2 rounded-2xl border border-bone bg-white hover:bg-cream transition-colors">
              <Link to={to} className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 min-h-11 no-underline text-carbon">
                <span className="size-9 rounded-xl bg-brand-pale-orange text-brand-orange flex items-center justify-center shrink-0"><Icon size={16} /></span>
                <span className="flex-1 min-w-0 truncate text-[14px] font-medium">{label}</span>
                <span className="font-serif text-[18px] text-carbon">{key === 'payout' ? '' : formatNumber(count)}</span>
                <ChevronRight size={14} className="text-slate shrink-0 rtl:rotate-180" aria-hidden />
              </Link>
              {overdue && (
                <Link
                  to={overdue.to}
                  className="me-3 shrink-0 text-[12px] font-bold px-2.5 py-1 rounded-full bg-error-bg text-error no-underline"
                  aria-label={`${overdue.count} overdue orders`}
                >
                  {formatNumber(overdue.count)} overdue
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </StudioPanel>
  );
}
