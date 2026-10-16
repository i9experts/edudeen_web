import { formatPrice } from '@/utils/formatPrice';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Crown, PackageCheck } from 'lucide-react';
import { Button, Modal, SkeletonBox } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import {
  apiGetPremiumBankDetails, apiSubmitPremiumProof, apiSubscribePremium,
  type PremiumBankDetails, type PremiumInterval, type PremiumPayment, type PremiumPlan,
} from '@/api/services/premium';
import { refreshPremium } from '@/hooks/usePremium';
import { BankDetailsCard, ProofFields } from './BankDetailsCard';

type Step = 'confirm' | 'pay' | 'done';

const money = (usd: number, pkr: number | null | undefined) => (pkr != null ? `${formatPrice(pkr, 'PKR')}` : `${formatPrice(usd, 'USD')}`);

/**
 * Edudeen Premium purchase by bank transfer: choose interval -> subscribe -> pay into the platform account ->
 * upload the receipt -> "we're checking it". Also resumes an unpaid purchase (`payment`, awaiting_proof) and
 * re-upload after a rejection.
 */
export function PremiumCheckoutModal({ plan, interval: initialInterval, payment: existing, onClose }: {
  /** Needed to start a new purchase; not needed when resuming `payment`. */
  plan?: PremiumPlan | null;
  interval?: PremiumInterval;
  payment?: PremiumPayment | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const resuming = !!existing && (existing.status === 'awaiting_proof' || existing.status === 'rejected');
  const [interval, setInterval] = useState<PremiumInterval>(initialInterval ?? 'monthly');
  const [step, setStep] = useState<Step>(resuming ? 'pay' : 'confirm');
  const [payment, setPayment] = useState<PremiumPayment | null>(resuming ? existing! : null);
  const [bank, setBank] = useState<PremiumBankDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingBank, setLoadingBank] = useState(resuming);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [sender, setSender] = useState('');

  useEffect(() => {
    if (!resuming) return;
    let cancelled = false;
    apiGetPremiumBankDetails()
      .then(res => { if (!cancelled) setBank(res.data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Bank transfer is not available right now.'); })
      .finally(() => { if (!cancelled) setLoadingBank(false); });
    return () => { cancelled = true; };
  }, [resuming]);

  const monthlyPKR = plan?.monthlyPricePKR ?? null;
  const yearlyPKR = plan?.yearlyPricePKR ?? null;
  const planPrice = plan ? (interval === 'yearly' ? plan.yearlyPriceUSD : plan.monthlyPriceUSD) : 0;
  const planPKR = interval === 'yearly' ? yearlyPKR : monthlyPKR;

  async function startPurchase() {
    if (!plan) return;
    setBusy(true); setError('');
    try {
      const res = await apiSubscribePremium(plan._id, interval);
      setPayment(res.data.payment);
      setBank(res.data.bankDetails);
      setStep('pay');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start your Premium purchase. Please try again.');
    } finally { setBusy(false); }
  }

  async function sendProof() {
    if (!payment) return;
    if (!file) { setError('Please upload a screenshot or photo of your transfer receipt.'); return; }
    setBusy(true); setError('');
    try {
      await apiSubmitPremiumProof(payment._id, file, { transactionReference: reference || undefined, senderName: sender || undefined });
      await refreshPremium();
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit your payment proof. Please try again.');
    } finally { setBusy(false); }
  }

  const err = error && (
    <div role="alert" className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-2">
      <AlertCircle size={13} className="mt-[1px] flex-shrink-0" />
      {error}
    </div>
  );

  return (
    <Modal
      title={step === 'done' ? 'Payment received' : 'Get Edudeen Premium'}
      onClose={() => { if (step === 'done') toast.success('We will notify you once your payment is confirmed.'); onClose(); }}
      width={480}
      mobileSheet
      footer={
        step === 'confirm' ? (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="md" loading={busy} disabled={!plan} onClick={startPurchase}>Continue to payment</Button>
          </div>
        ) : step === 'pay' ? (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={onClose}>Later</Button>
            <Button variant="primary" size="md" loading={busy} disabled={!bank || !payment} icon={!busy && <PackageCheck size={15} />} onClick={sendProof}>
              {busy ? 'Submitting…' : "I've made the transfer"}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end"><Button variant="primary" size="md" onClick={onClose}>Done</Button></div>
        )
      }
    >
      <div className="px-5 py-4 flex flex-col gap-4">
        {step === 'confirm' && plan && (
          <>
            <div className="rounded-[10px] border border-[#f1d98a] bg-[#fff6d6] px-4 py-3 flex items-center gap-3">
              <Crown size={20} className="text-[#8a6100] shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-carbon">{plan.name}</p>
                <p className="text-[12px] text-slate">{plan.description || 'Member prices, early access to sales and more.'}</p>
              </div>
            </div>
            <div role="group" aria-label="Billing interval" className="flex w-fit rounded-full border border-bone p-[3px]">
              {(['monthly', 'yearly'] as const).map(iv => (
                <button key={iv} type="button" aria-pressed={interval === iv} onClick={() => setInterval(iv)}
                  className={'px-4 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer border-none transition-colors ' + (interval === iv ? 'bg-brand-orange text-white' : 'bg-transparent text-slate hover:text-carbon')}>
                  {iv === 'monthly' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-slate">{interval === 'yearly' ? 'You pay once a year' : 'You pay once a month'}</span>
              <span className="text-[22px] font-bold text-carbon">{money(planPrice, planPKR)}</span>
            </div>
            {planPKR != null && <p className="text-[12px] text-slate -mt-3 text-end">{`≈ ${formatPrice(planPrice, 'USD')} USD`}</p>}
            <p className="text-[12px] text-slate leading-[1.6]">You pay by bank transfer or mobile wallet to Edudeen. Next you will see the account details and upload your receipt. Your membership starts once we confirm the payment.</p>
            {err}
          </>
        )}

        {step === 'pay' && (
          <>
            {payment?.status === 'rejected' && (
              <div role="alert" className="flex items-start gap-2 text-[12.5px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-2.5">
                <AlertCircle size={14} className="mt-[1px] flex-shrink-0" />
                <div>
                  <p className="font-semibold">Your last payment proof was not accepted</p>
                  <p>{payment.rejectionReason || 'Please check the amount and upload a clear receipt.'}</p>
                  <p className="mt-1 text-charcoal">Upload a new receipt below.</p>
                </div>
              </div>
            )}
            {loadingBank ? (
              <div className="flex flex-col gap-3"><SkeletonBox height={140} rounded="10px" /><SkeletonBox height={44} rounded="8px" /></div>
            ) : bank && payment ? (
              <>
                <BankDetailsCard
                  bankDetails={bank}
                  amountText={`${formatPrice(payment.amountPKR, 'PKR')}`}
                  note={(
                    <p className="text-[10.5px] text-slate">
                      {`${payment.planName ?? 'Edudeen Premium'} · ${payment.interval === 'yearly' ? 'yearly' : 'monthly'} · ≈ ${formatPrice(payment.amountUSD, 'USD')}`}
                      {payment.fxRateUsed ? ` at PKR ${payment.fxRateUsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}/USD` : ''}
                    </p>
                  )}
                />
                <ProofFields
                  file={file} onFile={setFile}
                  transactionReference={reference} onTransactionReference={setReference}
                  senderName={sender} onSenderName={setSender}
                />
              </>
            ) : null}
            {err}
          </>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center text-center gap-2 py-4">
            <span className="size-12 rounded-full bg-success-bg flex items-center justify-center"><CheckCircle2 size={24} className="text-success" /></span>
            <p className="text-[15px] font-bold text-carbon">Payment received - we are checking it</p>
            <p className="text-[13px] text-slate max-w-[340px]">This usually takes up to 24 hours. We will notify you the moment your Premium membership is active.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
