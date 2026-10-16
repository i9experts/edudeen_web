import { formatPrice } from '@/utils/formatPrice';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Copy, Crown } from 'lucide-react';
import { Badge, Button, Card, Modal, SkeletonBox } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { usePremium, refreshPremium } from '@/hooks/usePremium';
import {
  apiCancelPremium, apiGetPremiumPayments, apiResumePremium,
  type PremiumBenefits, type PremiumCoupon, type PremiumPayment, type PremiumPaymentStatus,
} from '@/api/services/premium';
import { PremiumCheckoutModal } from '@/features/buyer/components/PremiumCheckoutModal';
import { usePageTitle } from '@/hooks/usePageTitle';

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const STATUS: Record<PremiumPaymentStatus, { label: string; color: 'yellow' | 'blue' | 'green' | 'red' | 'gray' }> = {
  awaiting_proof: { label: 'Waiting for receipt', color: 'yellow' },
  pending: { label: 'Under review', color: 'blue' },
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'gray' },
};

function perkLines(b: PremiumBenefits): string[] {
  const lines = ['Member prices on selected products'];
  if (b.earlyAccessHours > 0) lines.push(`${b.earlyAccessHours} hour${b.earlyAccessHours === 1 ? '' : 's'} early access to every sale`);
  if (b.monthlyCouponValue > 0) lines.push(`A personal ${b.monthlyCouponType === 'fixed' ? formatPrice(b.monthlyCouponValue, 'USD') : `${b.monthlyCouponValue}%`} coupon every month`);
  lines.push(`Up to ${b.childrenLimit} children profiles`);
  if (b.prioritySupport) lines.push('Priority support');
  return lines;
}

function CouponCard({ coupon }: { coupon: PremiumCoupon }) {
  const toast = useToast();
  const navigate = useNavigate();
  const off = coupon.discountType === 'fixed' ? `${formatPrice(coupon.discountValue, 'USD')} off` : `${coupon.discountValue}% off`;
  const inactive = coupon.used || coupon.expired;
  const copy = async () => {
    try { await navigator.clipboard.writeText(coupon.code); toast.success('Coupon code copied'); } catch { toast.error('Could not copy. Select the code and copy it.'); }
  };
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[14px] font-bold text-carbon">This month's coupon</p>
        {coupon.used && <Badge color="gray" size="sm">Used</Badge>}
        {!coupon.used && coupon.expired && <Badge color="red" size="sm">Expired</Badge>}
        {!inactive && <Badge color="green" size="sm">Ready to use</Badge>}
      </div>
      <p className="text-[13px] text-slate">{off}{coupon.expiresAt ? ` · valid until ${fmtDate(coupon.expiresAt)}` : ''}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <code className={`font-mono text-[15px] font-bold px-3 py-1.5 rounded-lg border ${inactive ? 'border-bone text-slate line-through' : 'border-[#f1d98a] bg-[#fff6d6] text-[#8a6100]'}`}>{coupon.code}</code>
        <Button variant="outline" size="sm" onClick={copy} disabled={coupon.expired}><Copy size={13} /> Copy</Button>
        {!inactive && <Button variant="primary" size="sm" onClick={() => navigate('/cart')}>Use at checkout</Button>}
      </div>
      <p className="text-[12px] text-slate">Paste the code into the coupon box when you check out.</p>
    </Card>
  );
}

/** Account → Premium: membership, perks, monthly coupon and payment history. */
export function PremiumAccount() {
  usePageTitle('Edudeen Premium');
  const toast = useToast();
  const navigate = useNavigate();
  const { me, isPremium, membership, coupon, pendingPayment, loading, error, reload } = usePremium();
  const [payments, setPayments] = useState<PremiumPayment[] | null>(null);
  const [payError, setPayError] = useState('');
  const [confirm, setConfirm] = useState<'cancel' | 'resume' | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<PremiumPayment | null>(null);

  const loadPayments = useCallback(() => {
    setPayError('');
    return apiGetPremiumPayments()
      .then(res => setPayments(res.data ?? []))
      .catch(err => { setPayments([]); setPayError(err instanceof Error ? err.message : 'Could not load your payments.'); });
  }, []);
  useEffect(() => { void loadPayments(); }, [loadPayments, me?.pendingPayment?.status, me?.membership?.status]);

  async function doConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm === 'cancel') { await apiCancelPremium(); toast.success('Your membership will not renew. Benefits stay until the end of your paid period.'); }
      else { await apiResumePremium(); toast.success('Your membership will continue.'); }
      setConfirm(null);
      await refreshPremium();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }

  const live = isPremium && membership?.status === 'active';
  const b = membership?.benefits ?? null;

  return (
    <div className="flex flex-col gap-4 max-w-[760px]">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-carbon flex items-center gap-2"><Crown size={20} className="text-[#8a6100]" aria-hidden /> Edudeen Premium</h1>
          <p className="text-[13px] text-slate">Your membership, member perks and payments.</p>
        </div>
      </div>

      {loading && !me ? (
        <div className="flex flex-col gap-3"><SkeletonBox height={150} rounded="12px" /><SkeletonBox height={100} rounded="12px" /></div>
      ) : error && !me ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-[13px] text-error text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void reload()}>Try again</Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Payment in progress */}
          {pendingPayment && pendingPayment.status !== 'approved' && (
            <Card className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[14px] font-bold text-carbon">
                  {pendingPayment.status === 'pending' ? 'Payment received - we are checking it' : pendingPayment.status === 'rejected' ? 'Your payment proof was not accepted' : 'Finish your Premium payment'}
                </p>
                <Badge color={STATUS[pendingPayment.status].color} size="sm">{STATUS[pendingPayment.status].label}</Badge>
              </div>
              {pendingPayment.status === 'pending' && <p className="text-[13px] text-slate">Usually within 24 hours. We will notify you once it is confirmed.</p>}
              {pendingPayment.status === 'rejected' && (
                <p className="flex items-start gap-1.5 text-[13px] text-error"><AlertCircle size={14} className="mt-[2px] shrink-0" />{pendingPayment.rejectionReason || 'Please check the amount and upload a clear receipt.'}</p>
              )}
              {(pendingPayment.status === 'awaiting_proof' || pendingPayment.status === 'rejected') && (
                <div><Button variant="primary" size="sm" onClick={() => setUploading(pendingPayment)}>{pendingPayment.status === 'rejected' ? 'Upload a new receipt' : 'Upload receipt'}</Button></div>
              )}
            </Card>
          )}

          {live && membership ? (
            <>
              <Card className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[16px] font-bold text-carbon">{membership.planName ?? 'Edudeen Premium'}</p>
                  <Badge color="green" size="sm">Active</Badge>
                  {membership.cancelAtPeriodEnd && <Badge color="yellow" size="sm">Will not renew</Badge>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
                  <div><p className="text-slate text-[12px]">Billing</p><p className="font-semibold text-carbon">{membership.interval === 'yearly' ? 'Yearly' : 'Monthly'}</p></div>
                  <div><p className="text-slate text-[12px]">Member since</p><p className="font-semibold text-carbon">{fmtDate(membership.startedAt)}</p></div>
                  <div><p className="text-slate text-[12px]">{membership.cancelAtPeriodEnd ? 'Ends on' : 'Renew by'}</p><p className="font-semibold text-carbon">{fmtDate(membership.currentPeriodEnd)}</p></div>
                  <div><p className="text-slate text-[12px]">Days left</p><p className="font-semibold text-carbon">{membership.daysLeft}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => navigate('/premium#premiumPlans')}>Renew</Button>
                  {membership.cancelAtPeriodEnd
                    ? <Button variant="outline" size="sm" onClick={() => setConfirm('resume')}>Keep my membership</Button>
                    : <Button variant="outline" size="sm" onClick={() => setConfirm('cancel')}>Cancel membership</Button>}
                </div>
                {membership.source === 'admin_grant' && <p className="text-[12px] text-slate">This membership was given to you by the Edudeen team.</p>}
              </Card>

              {b && (
                <Card className="flex flex-col gap-2">
                  <p className="text-[14px] font-bold text-carbon">Your perks</p>
                  <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                    {perkLines(b).map(l => <li key={l} className="flex items-start gap-2 text-[13px] text-charcoal"><Check size={14} className="text-success mt-[2px] shrink-0" />{l}</li>)}
                  </ul>
                </Card>
              )}

              {coupon && <CouponCard coupon={coupon} />}
            </>
          ) : (
            <Card className="flex flex-col gap-2">
              <p className="text-[15px] font-bold text-carbon">{membership?.status === 'expired' || membership?.status === 'cancelled' ? 'Your Premium membership has ended' : 'Join Edudeen Premium'}</p>
              <p className="text-[13px] text-slate">Member prices from sellers, early access to sales, a monthly coupon and priority support.</p>
              <div><Link to="/premium" className="no-underline"><Button variant="primary" size="sm">{membership?.status === 'expired' || membership?.status === 'cancelled' ? 'Renew Premium' : 'See Premium plans'}</Button></Link></div>
            </Card>
          )}

          {/* Payments */}
          <Card className="flex flex-col gap-2">
            <p className="text-[14px] font-bold text-carbon">Payments</p>
            {payments === null ? <SkeletonBox height={60} rounded="8px" />
              : payError ? <p className="text-[13px] text-error">{payError}</p>
              : payments.length === 0 ? <p className="text-[13px] text-slate">No Premium payments yet.</p>
              : (
                <div className="flex flex-col divide-y divide-bone">
                  {payments.map(p => (
                    <div key={p._id} className="py-2.5 flex items-center gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-carbon">{p.planName ?? 'Edudeen Premium'} · {p.interval === 'yearly' ? 'Yearly' : 'Monthly'}</p>
                        <p className="text-[12px] text-slate">{fmtDate(p.createdAt)} · {formatPrice(p.amountPKR, 'PKR')}</p>
                        {p.status === 'rejected' && p.rejectionReason && <p className="text-[12px] text-error mt-0.5">{p.rejectionReason}</p>}
                      </div>
                      <Badge color={STATUS[p.status].color} size="sm">{STATUS[p.status].label}</Badge>
                      {(p.status === 'rejected' || p.status === 'awaiting_proof') && p._id === pendingPayment?._id && (
                        <Button variant="outline" size="xs" onClick={() => setUploading(p)}>Upload receipt</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </Card>
        </>
      )}

      {confirm && (
        <Modal
          title={confirm === 'cancel' ? 'Cancel your membership?' : 'Keep your membership?'}
          onClose={() => setConfirm(null)}
          width={420}
          mobileSheet
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => setConfirm(null)}>Not now</Button>
              <Button variant={confirm === 'cancel' ? 'danger' : 'primary'} size="md" loading={busy} onClick={doConfirm}>{confirm === 'cancel' ? 'Yes, cancel' : 'Yes, keep it'}</Button>
            </div>
          }
        >
          <p className="px-5 py-4 text-[13px] text-charcoal leading-[1.6]">
            {confirm === 'cancel'
              ? `Your membership will not renew. You keep all benefits until ${fmtDate(membership?.currentPeriodEnd)}.`
              : 'Your membership will stay active and you can renew before it ends.'}
          </p>
        </Modal>
      )}

      {uploading && <PremiumCheckoutModal payment={uploading} onClose={() => { setUploading(null); void loadPayments(); }} />}
    </div>
  );
}
