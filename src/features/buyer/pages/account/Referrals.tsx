import { useEffect, useState } from 'react';
import { Gift, Copy, Share2, Users, Award } from 'lucide-react';
import { Card, Button, EmptyState, SkeletonBox, MetricCard } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { shareLink } from '@/utils/share';
import { apiGetMyReferral, type ReferralInfo } from '@/api/services/retention';
import { AccountPageHeader } from './AccountPageHeader';

/** Account → Refer & Earn: invite link + code, invited friends and rewards earned (GET /api/referrals/me). */
export function Referrals() {
  const toast = useToast();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    apiGetMyReferral()
      .then(r => { if (alive) { setInfo(r.data); setError(''); } })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load your referral details.'); });
    return () => { alive = false; };
  }, [reload]);

  const copy = async (text: string, done: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(done); } catch { toast.error('Could not copy. Select the text and copy it.'); }
  };
  const share = async () => {
    if (!info?.shareUrl) return;
    const r = await shareLink(info.shareUrl, 'Join me on Edudeen', `Use my code ${info.code} on Edudeen.`);
    if (r === 'copied') toast.success('Invite link copied');
    else if (r === 'failed') toast.error('Could not share the link.');
  };

  return (
    <div className="flex flex-col gap-5">
      <AccountPageHeader title="Refer & Earn" description="Invite friends to Edudeen and earn a reward when they complete their first order." />

      {error ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-[13px] text-error text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setReload(n => n + 1)}>Try again</Button>
          </div>
        </Card>
      ) : !info ? (
        <div className="flex flex-col gap-3"><SkeletonBox height={140} rounded="12px" /><SkeletonBox height={90} rounded="12px" /></div>
      ) : !info.enabled || !info.code ? (
        <Card><EmptyState icon={<Gift size={26} className="text-brand-orange opacity-55" />} title="Referrals are not available right now" description="Please check back later." /></Card>
      ) : (
        <>
          <Card>
            <p className="text-[12px] font-semibold text-charcoal mb-2 flex items-center gap-1.5"><Gift size={13} className="text-brand-orange" /> Your invite</p>
            <p className="text-[13px] text-graphite">
              When a friend you invite completes their first order, you get <strong>{info.reward.label}</strong>
              {info.reward.friendLabel ? <> and they get <strong>{info.reward.friendLabel}</strong></> : null}. Rewards are single-use codes valid for {info.reward.expiryDays} days.
            </p>
            {info.shareUrl && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <input readOnly aria-label="Your referral link" value={info.shareUrl} onFocus={e => e.currentTarget.select()}
                  className="flex-1 min-w-[220px] rounded-lg border border-bone bg-cream px-3 py-2 text-[13px] text-charcoal" />
                <Button variant="outline" size="sm" icon={<Copy size={13} />} onClick={() => copy(info.shareUrl!, 'Invite link copied')}>Copy link</Button>
                <Button variant="primary" size="sm" icon={<Share2 size={13} />} onClick={share}>Share</Button>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-slate">Your code</span>
              <code className="rounded-lg bg-cream px-3 py-2 text-[15px] font-bold tracking-[0.12em] text-carbon">{info.code}</code>
              <Button variant="ghost" size="sm" icon={<Copy size={13} />} onClick={() => copy(info.code!, 'Code copied')}>Copy code</Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard label="Friends invited" value={info.stats.pending + info.stats.rewarded} icon={<Users size={16} />} />
            <MetricCard label="Rewards earned" value={info.stats.rewarded} icon={<Award size={16} />} sub={`of up to ${info.stats.cap}`} />
            <MetricCard label="Waiting for a first order" value={info.stats.pending} icon={<Gift size={16} />} />
          </div>
        </>
      )}
    </div>
  );
}
