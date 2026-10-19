import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button, Input, EdudeenLogo } from '@/components/comman/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import { apiInviteInfo, apiAcceptInvite } from '@/api/services/staff';

/** Staff invitation: choose a password. Sign-in later uses a 6-digit code sent by e-mail. */
export function AdminAcceptInvitePage() {
  usePageTitle('Join the Edudeen team');
  const { token = '' } = useParams();
  const [step, setStep] = useState<'loading' | 'invalid' | 'password' | 'done'>('loading');
  const [info, setInfo] = useState<{ email: string; name: string } | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiInviteInfo(token).then(r => { setInfo(r.data); setName(r.data.name); setStep('password'); }).catch(() => setStep('invalid'));
  }, [token]);

  const submitPassword = async () => {
    setError('');
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      await apiAcceptInvite(token, { password, name });
      setStep('done');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your password.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <main className="w-full max-w-[460px] bg-white border border-bone rounded-2xl px-6 sm:px-8 py-8">
        <EdudeenLogo className="mb-6" />
        {step === 'loading' && <p className="text-[14px] text-slate m-0">Checking your invitation…</p>}
        {step === 'invalid' && (<>
          <h1 className="text-[20px] font-bold text-carbon mt-0">This invitation is not valid</h1>
          <p className="text-[14px] text-slate">The link may have expired (they last 48 hours) or was already used. Ask the owner to send a new one.</p>
          <Link to="/admin/login" className="text-brand-orange font-semibold text-[14px]">Go to sign in</Link>
        </>)}
        {step === 'password' && (<>
          <h1 className="text-[20px] font-bold text-carbon mt-0 mb-1">Join the Edudeen team</h1>
          <p className="text-[13px] text-slate mt-0 mb-5">Signing up as <b>{info?.email}</b>. Choose a password to finish.</p>
          <div className="flex flex-col gap-3">
            <Input label="Your name" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
            <Input label="Repeat password" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitPassword()} />
            <p className="text-[12px] text-slate m-0">At least 10 characters, with letters and numbers.</p>
          </div>
          {error && <p role="alert" className="text-[13px] text-error mt-3 mb-0">{error}</p>}
          <Button variant="primary" size="lg" fullWidth className="mt-5" loading={busy} onClick={submitPassword}>Save password</Button>
        </>)}
        {step === 'done' && (<>
          <div className="flex items-center gap-2 mb-2"><ShieldCheck size={22} className="text-success" /><h1 className="text-[20px] font-bold text-carbon m-0">You're all set</h1></div>
          <p className="text-[13px] text-slate mt-0">Your password is saved. When you sign in, we email a 6-digit code to <b>{info?.email}</b>. Enter it to continue.</p>
          <Link to="/admin/login" className="inline-block w-full text-center bg-brand-orange text-white rounded-xl py-3 font-semibold no-underline mt-4">Go to sign in</Link>
        </>)}
      </main>
    </div>
  );
}
