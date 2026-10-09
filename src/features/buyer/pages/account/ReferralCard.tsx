import { useEffect, useState } from 'react';
import { Gift, Copy, Share2 } from 'lucide-react';
import { Card, Button, Input } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { shareLink } from '@/utils/share';
import { apiApplyReferralCode, apiGetMyReferral, type ReferralInfo } from '@/api/services/retention';

/** Account dashboard card: the buyer's referral code, share button, progress, and a box to enter a friend's code. Hidden when the programme is off. */
export function ReferralCard() {
  const toast = useToast();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => apiGetMyReferral().then(r => setInfo(r.data)).catch(() => setFailed(true));
  useEffect(() => { void load(); }, []);

  if (failed || !info || !info.enabled) return null;

  const copy = async () => {
    if (!info.code) return;
    try { await navigator.clipboard.writeText(info.code); toast.success('Code copied'); } catch { toast.error('Could not copy the code.'); }
  };
  const share = async () => {
    if (!info.shareUrl) return;
    const r = await shareLink(info.shareUrl, 'Join me on Edudeen', `Use my code ${info.code} on Edudeen and ${info.reward.friendLabel ? `get ${info.reward.friendLabel}` : 'find great learning resources'}.`);
    if (r === 'copied') toast.success('Invite link copied');
    else if (r === 'failed') toast.error('Could not share the link.');
  };
  const apply = async () => {
    setBusy(true);
    try { await apiApplyReferralCode(code.trim()); toast.success('Referral code applied'); setCode(''); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not apply that code.'); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <p className="text-[12px] font-semibold text-charcoal mb-2 flex items-center gap-1.5"><Gift size={13} className="text-brand-orange" /> Invite a friend</p>
      <p className="text-[13px] text-graphite">
        When a friend you invite completes their first order, you get <strong>{info.reward.label}</strong>
        {info.reward.friendLabel ? <> and they get <strong>{info.reward.friendLabel}</strong></> : null}. Rewards are single-use codes valid for {info.reward.expiryDays} days.
      </p>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <code className="rounded-lg bg-cream px-3 py-2 text-[15px] font-bold tracking-[0.12em] text-carbon">{info.code}</code>
        <Button variant="outline" size="sm" icon={<Copy size={13} />} onClick={copy}>Copy</Button>
        <Button variant="primary" size="sm" icon={<Share2 size={13} />} onClick={share}>Share invite</Button>
      </div>
      <p className="text-[12px] text-slate mt-2">{info.stats.rewarded} rewarded · {info.stats.pending} waiting for a first order (up to {info.stats.cap} rewards).</p>
      {!info.referredByAnyone && (
        <div className="mt-4 border-t border-bone pt-3">
          <p className="text-[12px] font-medium text-charcoal mb-1.5">Have a friend's code?</p>
          <div className="flex items-end gap-2">
            <Input aria-label="Friend's referral code" placeholder="e.g. K7QM2XPD" value={code} maxLength={8} onChange={e => setCode(e.target.value.toUpperCase())} />
            <Button variant="outline" size="sm" loading={busy} disabled={code.trim().length !== 8} onClick={apply}>Apply</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
