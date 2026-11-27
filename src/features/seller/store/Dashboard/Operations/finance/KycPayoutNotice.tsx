import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { apiGetMyKyc, type KycStatus } from '@/api/services/kyc';

const COPY: Record<Exclude<KycStatus, 'approved'>, string> = {
  not_started: 'Payouts are on hold until you verify your identity (KYC). Your earnings keep adding up in the meantime.',
  pending: 'Your identity verification (KYC) is being reviewed. Payouts start as soon as it is approved.',
  rejected: 'Your identity verification (KYC) needs changes. Fix it to start receiving payouts.',
};

/** Earnings page banner: payouts wait for an approved KYC. Shows nothing once approved (or if the check fails). */
export function KycPayoutNotice({ storeId }: { storeId: string }) {
  const [status, setStatus] = useState<KycStatus | null>(null);
  useEffect(() => {
    let alive = true;
    apiGetMyKyc().then(r => { if (alive) setStatus(r.data.status); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!status || status === 'approved') return null;
  return (
    <div className="px-4 md:px-8 pt-4">
      <div role="status" className="flex flex-wrap items-center gap-2 text-[12.5px] text-carbon bg-warning-bg border border-warning-border rounded-lg px-3 py-2">
        <ShieldAlert size={14} className="shrink-0 text-warning" />
        <span className="flex-1 min-w-[200px]">{COPY[status]}</span>
        {status !== 'pending' && (
          <Link to={`/store/${storeId}/verification`} className="font-semibold text-brand-orange underline whitespace-nowrap">
            {status === 'rejected' ? 'Update verification' : 'Verify now'}
          </Link>
        )}
      </div>
    </div>
  );
}
