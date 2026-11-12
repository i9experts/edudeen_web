import { Badge } from '@/components/comman/ui/Badge';
import { MetricCard } from '@/components/comman/ui/MetricCard';
import { Table, type TableColumn } from '@/components/comman/ui';
import type { BadgeColor } from '@/types';
import { formatPrice } from '@/utils/formatPrice';
import type { EarningsSummary, Payout, PayoutMethodType, PayoutStatus, FeeRule } from '@/api/services/finance';
import { fmtDate } from './EarningsStatement';

export const METHOD_LABEL: Record<PayoutMethodType, string> = {
  bank_transfer: 'Bank Transfer', paypal: 'PayPal', stripe: 'Stripe',
};

const PAYOUT_STATUS_COLOR: Record<PayoutStatus, BadgeColor> = {
  pending: 'yellow', processing: 'blue', completed: 'green', failed: 'red',
};

/** `view` values the hero tiles link to; the transactions list reads them from the URL. */
export type EarningsView = 'available' | 'clearing' | 'owed';
export const VIEW_FILTER: Record<EarningsView, { type: 'sale' | 'fee'; status?: 'completed' | 'pending'; label: string }> = {
  available: { type: 'sale', status: 'completed', label: 'Available sales' },
  clearing:  { type: 'sale', status: 'pending',   label: 'Sales still clearing' },
  owed:      { type: 'fee',  label: 'Fees and commission' },
};

// ── Balance hero ─────────────────────────────────────────────────────────────
export function EarningsHero({ s, storeId }: { s: EarningsSummary; storeId: string }) {
  const c = s.currency;
  const money = (n: number) => formatPrice(n, c);
  const e = s.expected;
  const expectedInfo = [
    `Estimate only. ${e.orders} open order${e.orders === 1 ? '' : 's'} not credited yet, minus the platform fee set by Edudeen (${money(e.feeEstimate)}).`,
    e.platformCollectedCod > 0 ? `${e.platformCollectedCod} are cash-on-delivery packages collected by Edudeen's courier - no commission is debited from you on those.` : '',
    e.sellerCollectedCod > 0 ? `${e.sellerCollectedCod} cash-on-delivery package${e.sellerCollectedCod === 1 ? '' : 's'} you collect yourself are not counted: you keep that cash and the commission is debited later.` : '',
    !e.feeEstimateOk ? 'The platform fee could not be estimated for some orders.' : '',
    e.skipped > 0 ? `${e.skipped} order${e.skipped === 1 ? '' : 's'} in another currency are left out.` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={`Available (${c})`} value={money(s.available)}
          sub="Ready for the next payout" to="?view=available"
          info="Money from sales that finished clearing. It is paid out in the next monthly payout after admin approval."
        />
        <MetricCard
          label="Clearing" value={money(s.clearing)}
          sub={s.clearing > 0 && s.clearingReleaseAt ? `Earliest release ${fmtDate(s.clearingReleaseAt, false)}` : 'Nothing clearing'} to="?view=clearing"
          info={`New sales are held while they clear (${s.clearingDays.card} days for card payments, ${s.clearingDays.other} days for bank transfer and cash on delivery), then move to Available.`}
        />
        <MetricCard
          label="Expected from open orders" value={e.orders > 0 ? `~ ${money(e.amount)}` : money(0)}
          sub={e.orders > 0 ? `Estimate · ${e.orders} order${e.orders === 1 ? '' : 's'}` : 'No open orders to estimate'} to={`/store/${storeId}/orders?tab=needs_action`}
          info={expectedInfo}
        />
        <MetricCard
          label="Commission owed" value={money(s.commissionOwed)}
          sub={s.commissionOwed > 0 ? 'From cash-on-delivery orders you collected' : 'Nothing owed'} to="?view=owed"
          info="When you collect cash on delivery yourself, Edudeen's commission on that order is taken from your balance. Later sales pay it down."
        />
      </div>
      {s.isFlaggedForReview && (
        <p role="alert" className="text-[12.5px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
          Your balance is negative, so payouts are paused until future sales cover it.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-slate">
        <span>Next payout: <span className="font-bold text-carbon">{s.nextPayoutDate ? fmtDate(s.nextPayoutDate) : '—'}</span>
          <span className="ml-1.5">{s.nextPayoutDate ? '(monthly, after admin approval)' : '· No payout due yet'}</span>
        </span>
        {s.defaultMethod && (
          <span>Pays to: {METHOD_LABEL[s.defaultMethod.type as PayoutMethodType] ?? s.defaultMethod.type}{s.defaultMethod.last4 ? ` ••${s.defaultMethod.last4}` : ''}</span>
        )}
      </div>
    </div>
  );
}

// ── Payout history ───────────────────────────────────────────────────────────
function settlementMonth(p: Payout) {
  const m = /Monthly settlement (\d{4})-(\d{2})/.exec(p.notes ?? '');
  const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : new Date(p.createdAt);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function PayoutHistory({ payouts, loading, error, onOpen, onRetry }: {
  payouts: Payout[]; loading: boolean; error: string; onOpen: (id: string) => void; onRetry: () => void;
}) {
  const methodText = (p: Payout) => {
    const m = p.payoutMethodSnapshot;
    if (!m) return '—';
    return `${METHOD_LABEL[m.type as PayoutMethodType] ?? m.type}${m.accountLast4 ? ` ••${m.accountLast4}` : ''}`;
  };
  const status = (p: Payout) => <Badge color={PAYOUT_STATUS_COLOR[p.status]} size="sm">{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Badge>;
  const columns: TableColumn<Payout>[] = [
    { key: 'month', header: 'Month', render: p => <span className="text-carbon">{settlementMonth(p)}</span> },
    { key: 'amount', header: 'Amount', render: p => <span className="font-semibold whitespace-nowrap">{formatPrice(p.amount, p.currency)}</span> },
    { key: 'status', header: 'Status', render: status },
    { key: 'paid', header: 'Paid on', render: p => <span className="text-slate whitespace-nowrap">{fmtDate(p.processedAt)}</span> },
    { key: 'method', header: 'Method', render: p => <span className="text-graphite">{methodText(p)}</span> },
    { key: 'view', header: '', render: p => <button type="button" onClick={() => onOpen(p._id)} className="text-[12.5px] font-semibold text-brand-orange bg-transparent border-none cursor-pointer">Details</button> },
  ];
  return (
    <section aria-labelledby="payout-history-h" className="bg-white border border-bone rounded-xl overflow-hidden">
      <h2 id="payout-history-h" className="font-serif font-normal text-[20px] text-carbon px-5 py-4">Payout history</h2>
      {error ? (
        <div role="alert" className="px-5 pb-5 flex items-center gap-3 flex-wrap">
          <p className="text-[13px] text-error">{error}</p>
          <button type="button" onClick={onRetry} className="text-[13px] font-semibold text-brand-orange bg-transparent border-none cursor-pointer">Try again</button>
        </div>
      ) : (
        <Table
          columns={columns}
          data={payouts}
          keyExtractor={p => p._id}
          loading={loading}
          compact
          cardsBelow="md"
          renderCard={p => (
            <button type="button" onClick={() => onOpen(p._id)} className="w-full text-left bg-transparent border-none p-0 cursor-pointer flex flex-col gap-1">
              <span className="flex items-center justify-between gap-2"><span className="font-semibold text-carbon">{settlementMonth(p)}</span>{status(p)}</span>
              <span className="text-[13px]">{formatPrice(p.amount, p.currency)} · {methodText(p)}</span>
              <span className="text-[12px] text-slate">{p.processedAt ? `Paid ${fmtDate(p.processedAt)}` : 'Not paid yet'}</span>
            </button>
          )}
          emptyState={{ title: 'No payouts yet.', description: 'Your first monthly payout appears here once an admin approves it.' }}
        />
      )}
    </section>
  );
}

// ── How fees and payouts work (the ONLY place fee rules appear) ─────────────
function ruleText(r: FeeRule | null | undefined, fallbackRate: number): string {
  if (r?.mode === 'percentage') return `${Number(Number(r.value).toFixed(2))}% of the item price`;
  if (r?.mode === 'fixed') return `${formatPrice(Number(r.value), 'USD')} USD per item sold`;
  return `${Number((fallbackRate * 100).toFixed(2))}% of the sale`;
}

export function HowFeesWork({ s }: { s: EarningsSummary }) {
  const c = s.currency;
  const fees = s.platformFees;
  const same = fees?.digital && fees?.physical && fees.digital.mode === fees.physical.mode && fees.digital.value === fees.physical.value;
  const card = c === 'USD'
    ? `${s.cardProcessing.percent}% + ${formatPrice(s.cardProcessing.fixedUSD, 'USD')}`
    : `${s.cardProcessing.percent}% + a small fixed fee`;
  return (
    <details className="group bg-white border border-bone rounded-xl">
      <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 font-serif text-[18px] text-carbon">
        How fees and payouts work
        <span aria-hidden className="text-slate text-[14px] group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-5 pb-5 flex flex-col gap-3 text-[13.5px] text-graphite leading-relaxed">
        <p><span className="font-semibold text-carbon">Buyers pay Edudeen.</span> Each paid sale is credited to your wallet after the platform fee; shipping is never charged a fee.</p>
        <div>
          <p className="font-semibold text-carbon mb-1">Platform fee</p>
          <ul className="list-disc ps-5 flex flex-col gap-0.5">
            {same ? <li>All products: {ruleText(fees!.digital, s.fallbackFeeRate)}</li> : (
              <>
                <li>Digital products and courses: {ruleText(fees?.digital, s.fallbackFeeRate)}</li>
                <li>Physical products: {ruleText(fees?.physical, s.fallbackFeeRate)}</li>
              </>
            )}
            <li>Card payments also carry a processing fee of {card}. It is not charged on bank transfer or cash on delivery.</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-carbon mb-1">Clearing</p>
          <p>New sales stay in Clearing for {s.clearingDays.card} days (card) or {s.clearingDays.other} days (bank transfer, cash on delivery), then become Available.</p>
        </div>
        <div>
          <p className="font-semibold text-carbon mb-1">Cash on delivery</p>
          <p>If your own rider collects the cash, you keep it and Edudeen&apos;s commission is taken from your balance. If Edudeen&apos;s courier collects it, you are credited after Edudeen receives the cash and no commission is debited.</p>
        </div>
        <div>
          <p className="font-semibold text-carbon mb-1">Payouts</p>
          <p>Payouts are monthly. Edudeen reviews and approves each one, then sends it to your default payout method.</p>
        </div>
      </div>
    </details>
  );
}
