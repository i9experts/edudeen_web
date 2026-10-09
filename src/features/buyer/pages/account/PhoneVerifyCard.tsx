import { useEffect, useState } from 'react';
import { Phone, Check } from 'lucide-react';
import { Card, Button, Input, Badge } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { apiGetPhoneStatus, apiSendPhoneCode, apiVerifyPhoneCode, type PhoneStatus } from '@/api/services/retention';

/**
 * Optional: verify your phone with a 6-digit code over WhatsApp/SMS. Email login is unchanged. The whole card is
 * hidden unless the server has a WhatsApp/SMS channel configured, so nobody is offered something that cannot work.
 */
export function PhoneVerifyCard({ profilePhone }: { profilePhone?: string | null }) {
  const toast = useToast();
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => { apiGetPhoneStatus().then(r => setStatus(r.data)).catch(() => setStatus(null)); }, []);
  useEffect(() => { if (profilePhone && !phone) setPhone(profilePhone); }, [profilePhone]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (!status || !status.available) return null;

  const send = async () => {
    setBusy(true);
    try {
      const r = await apiSendPhoneCode(phone.trim());
      setSent(true); setCode(''); setWait(r.data.resendAfterSec ?? 60);
      toast.success('If this number can receive messages, a code is on its way.');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not send the code.'); }
    finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true);
    try {
      const r = await apiVerifyPhoneCode(phone.trim(), code.trim());
      setStatus({ available: true, phone: r.data.phone, verified: true }); setSent(false); setCode('');
      toast.success('Phone number verified');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'That code did not work.'); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <p className="text-[12px] font-semibold text-charcoal mb-2 flex items-center gap-1.5">
        <Phone size={13} className="text-brand-orange" /> Phone verification
        {status.verified && <Badge color="green" size="sm"><Check size={9} className="me-[2px]" /> Verified</Badge>}
      </p>
      {status.verified ? (
        <p className="text-[13px] text-graphite">{status.phone} is verified on your account. You still sign in with your email.</p>
      ) : (
        <>
          <p className="text-[13px] text-graphite mb-3">Verify your mobile number with a code sent on WhatsApp. This is optional - you still sign in with your email.</p>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]"><Input label="Mobile number" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0300 1234567" inputMode="tel" maxLength={20} /></div>
            <Button variant="outline" size="sm" loading={busy && !sent} disabled={!phone.trim() || wait > 0} onClick={send}>{sent ? (wait > 0 ? `Resend in ${wait}s` : 'Resend code') : 'Send code'}</Button>
          </div>
          {sent && (
            <div className="flex items-end gap-2 mt-3 flex-wrap">
              <div className="w-[160px]"><Input label="6-digit code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} /></div>
              <Button variant="primary" size="sm" loading={busy} disabled={code.length !== 6} onClick={verify}>Verify</Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
