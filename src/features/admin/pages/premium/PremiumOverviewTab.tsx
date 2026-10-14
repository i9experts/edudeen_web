import { Link } from 'react-router-dom';
import { Crown, Clock, Hourglass, DollarSign, Users, Percent } from 'lucide-react';
import { MetricCard } from '@/components/comman/ui';
import { apiAdminPremiumStats } from '@/api/services/adminPremium';
import { useLoad, money } from './useLoad';

export function PremiumOverviewTab({ goTo }: { goTo: (tab: string, extra?: string) => string }) {
  const { data, loading, error, refetch } = useLoad(() => apiAdminPremiumStats().then(r => r.data), []);

  if (error) {
    return (
      <div className="bg-white border border-bone rounded-xl px-5 py-6 text-center">
        <p className="text-[13px] text-error mb-2">{error}</p>
        <button type="button" onClick={() => refetch()} className="text-[13px] font-semibold text-brand-orange cursor-pointer bg-transparent border-0">Try again</button>
      </div>
    );
  }

  const s = data;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricCard loading={loading} icon={<Crown size={15} />} label="Active members" value={s?.activeMembers ?? 0}
          sub={s ? `${s.activeByInterval.monthly} monthly · ${s.activeByInterval.yearly} yearly` : undefined} to={goTo('members', 'status=active')} />
        <MetricCard loading={loading} icon={<Clock size={15} />} label="Expiring in 3 days" value={s?.expiringIn3Days ?? 0}
          sub="Renewal reminders go out automatically" to={goTo('members', 'status=expiring')} />
        <MetricCard loading={loading} icon={<Hourglass size={15} />} label="Pending payments" value={s?.pendingPayments ?? 0}
          sub="Bank-transfer proofs to review" to={goTo('payments', 'status=pending')} />
        <MetricCard loading={loading} icon={<DollarSign size={15} />} label="Revenue (last 30 days)" value={money(s?.revenueLast30DaysUSD ?? 0)}
          sub="Approved payments" to={goTo('payments', 'status=approved')} />
        <MetricCard loading={loading} icon={<DollarSign size={15} />} label="Revenue (all time)" value={money(s?.revenueUSD ?? 0)}
          sub={s ? `${s.approvedPayments} approved payment${s.approvedPayments === 1 ? '' : 's'}` : undefined} to={goTo('payments', 'status=approved')} />
        <MetricCard loading={loading} icon={<Users size={15} />} label="Lapsed members" value={s?.lapsedMembers ?? 0}
          sub="Expired or cancelled" to={goTo('members', 'status=expired')} />
      </div>

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bone flex items-center gap-2">
          <Percent size={15} className="text-brand-orange" />
          <div>
            <p className="text-[13.5px] font-semibold text-charcoal">Premium orders and member discounts</p>
            <p className="text-[12px] text-slate">Seller-funded discount plus the part Edudeen funds (Platform offer tab). Shown per order currency.</p>
          </div>
        </div>
        {loading ? (
          <p className="px-5 py-5 text-[13px] text-slate">Loading…</p>
        ) : !s || s.premiumOrders.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-slate text-center">No Premium orders yet.</p>
        ) : (
          <div className="divide-y divide-bone">
            {s.premiumOrders.map(o => (
              <div key={o.currency} className="px-5 py-3 flex items-center justify-between gap-3 text-[13px]">
                <span className="font-semibold text-charcoal">{o.currency}</span>
                <span className="text-slate">{o.orders} order{o.orders === 1 ? '' : 's'}</span>
                <span className="font-semibold text-carbon">{money(o.premiumDiscount, o.currency)} seller-funded{(o.platformFundedPremiumDiscount ?? 0) > 0 ? ` + ${money(o.platformFundedPremiumDiscount ?? 0, o.currency)} platform-funded` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[12px] text-slate">
        Buyers pay by bank transfer into the platform account; approve their proofs under Payments. Premium senders on the{' '}
        <Link to="/admin/messages?tab=contact" className="text-brand-orange font-semibold">Contact messages</Link> page are shown first.
      </p>
    </div>
  );
}
