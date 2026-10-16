import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';
import { Button, Input, EdudeenLogo } from '@/components/comman/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import { apiInviteInfo, apiAcceptInvite, apiActivate2fa } from '@/api/services/staff';

/** Staff invitation: choose a password → scan the QR in an authenticator app → confirm a code → save recovery codes. */
export function AdminAcceptInvitePage() {
  usePageTitle('Join the Edudeen team');
  const { token = '' } = useParams();
  const [step, setStep] = useState<'loading' | 'invalid' | 'password' | 'twofactor' | 'done'>('loading');
  const [info, setInfo] = useState<{ email: string; name: string } | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[]>([]);
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
      const r = await apiAcceptInvite(token, { password, name });
      setSecret(r.data.secret);
      setQr(await QRCode.toDataURL(r.data.otpauthUrl, { margin: 1, width: 192 }));
      setStep('twofactor');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your password.'); }
    finally { setBusy(false); }
  };
  const submitCode = async () => {
    setError(''); setBusy(true);
    try { const r = await apiActivate2fa(token, code); setRecovery(r.data.recoveryCodes); setStep('done'); }
    catch (e) { setError(e instanceof Error ? e.message : 'That code did not work.'); }
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
          <p className="text-[13px] text-slate mt-0 mb-5">Signing up as <b>{info?.email}</b>. Step 1 of 2 — choose a password.</p>
          <div className="flex flex-col gap-3">
            <Input label="Your name" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
            <Input label="Repeat password" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitPassword()} />
            <p className="text-[12px] text-slate m-0">At least 10 characters, with letters and numbers.</p>
          </div>
          {error && <p role="alert" className="text-[13px] text-error mt-3 mb-0">{error}</p>}
          <Button variant="primary" size="lg" fullWidth className="mt-5" loading={busy} onClick={submitPassword}>Continue</Button>
        </>)}
        {step === 'twofactor' && (<>
          <h1 className="text-[20px] font-bold text-carbon mt-0 mb-1">Turn on two-step sign-in</h1>
          <p className="text-[13px] text-slate mt-0 mb-4">Step 2 of 2 — scan this with Google Authenticator, Authy or 1Password, then enter the 6-digit code it shows.</p>
          <div className="flex flex-col items-center gap-2 mb-4">
            {qr && <img src={qr} alt="Authenticator QR code" width={192} height={192} className="rounded-lg border border-bone" />}
            <p className="text-[12px] text-slate m-0">Can't scan? Enter this key: <code className="font-mono break-all">{secret}</code></p>
          </div>
          <Input label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitCode()} />
          {error && <p role="alert" className="text-[13px] text-error mt-3 mb-0">{error}</p>}
          <Button variant="primary" size="lg" fullWidth className="mt-5" loading={busy} onClick={submitCode}>Finish setup</Button>
        </>)}
        {step === 'done' && (<>
          <div className="flex items-center gap-2 mb-2"><ShieldCheck size={22} className="text-success" /><h1 className="text-[20px] font-bold text-carbon m-0">You're all set</h1></div>
          <p className="text-[13px] text-slate mt-0">Save these one-time recovery codes somewhere safe. Each works once if you lose your phone — they will not be shown again.</p>
          <ul className="grid grid-cols-2 gap-2 list-none p-0 my-4 font-mono text-[13px]">{recovery.map(r => <li key={r} className="bg-cream border border-bone rounded-lg px-3 py-2 text-center">{r}</li>)}</ul>
          <Link to="/admin/login" className="inline-block w-full text-center bg-brand-orange text-white rounded-xl py-3 font-semibold no-underline">Sign in</Link>
        </>)}
      </main>
    </div>
  );
}
