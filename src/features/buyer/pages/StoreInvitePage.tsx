import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button, Input, SkeletonBox } from '@/components/comman/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TokenStorage } from '@/api/services/auth';
import { apiAcceptInvite, apiAcceptWithExistingPassword, apiAcceptWithNewPassword, apiInviteInfo, type InviteInfo } from '@/api/services/storeTeam';
import { useOpenTeamStore } from '@/hooks/useTeamStores';
import { invalidateCache } from '@/api/services/requestCache';

const msg = (e: any, fallback: string) => e?.response?.data?.message ?? e?.message ?? fallback;

/**
 * /store-invite/:token : what the invitation is for, then ONE step to join, on this page:
 *  - no account yet            -> choose a password (creates the account, joins, signs in)
 *  - account with a password   -> enter the existing password (no separate password for the team)
 *  - signed in already         -> one tap to accept
 * The token works once.
 */
export function StoreInvitePage() {
  usePageTitle('Store invitation');
  const { token = '' } = useParams();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [touched, setTouched] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [joined, setJoined] = useState<{ storeId: string; storeName: string } | null>(null);
  const { open, busyId, error: openError } = useOpenTeamStore();
  const role = TokenStorage.getRole();
  const signedIn = TokenStorage.isLoggedIn() && (role === 'user' || role === 'seller');
  const here = `/store-invite/${token}`;
  const loginHref = `/login?redirect=${encodeURIComponent(here)}`;

  const load = () => {
    setLoading(true); setError('');
    apiInviteInfo(token).then(setInfo).catch(e => setError(msg(e, 'This invitation is not valid any more.'))).finally(() => setLoading(false));
  };
  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn: () => Promise<{ storeId: string; storeName: string }>) {
    if (busy) return;
    setBusy(true); setFormError('');
    try { setJoined(await fn()); invalidateCache('team:mine'); }
    catch (e) { setFormError(msg(e, 'Could not join. Try again.')); }
    finally { setBusy(false); }
  }

  const newPwError = touched && password.length < 8 ? 'Password must be at least 8 characters' : '';
  const confirmError = touched && confirm !== password ? 'Passwords do not match' : '';

  const createAndJoin = () => {
    setTouched(true);
    if (password.length < 8 || confirm !== password) return;
    void run(async () => {
      const r = await apiAcceptWithNewPassword(token, password, name.trim() || undefined);
      TokenStorage.save(r.token.accessToken, r.token.refreshToken);
      TokenStorage.saveUser(r.user);
      return r;
    });
  };
  const signInAndJoin = () => {
    setTouched(true);
    if (!password) return;
    void run(async () => {
      const r = await apiAcceptWithExistingPassword(token, password);
      TokenStorage.save(r.token.accessToken, r.token.refreshToken);
      TokenStorage.saveUser(r.user);
      return r;
    });
  };

  return (
    <div className="mx-auto max-w-[520px] px-4 py-14">
      <div className="rounded-2xl border border-bone bg-white p-6 text-center">
        <Users size={30} className="mx-auto text-brand-royal" aria-hidden="true" />
        <h1 className="mt-3 font-serif text-[24px] text-carbon font-normal">Store invitation</h1>

        {loading ? <div className="mt-5 flex flex-col gap-3"><SkeletonBox height={18} /><SkeletonBox height={44} /></div>
          : error ? (
            <div role="alert" className="mt-4">
              <p className="text-[13.5px] text-error">{error}</p>
              <p className="mt-2 text-[12.5px] text-slate">Ask the store owner to send you a new invitation.</p>
              <div className="mt-4 flex justify-center gap-2"><Button variant="outline" size="sm" onClick={load}>Try again</Button><Link to="/" className="inline-flex items-center px-3 text-[13px] text-brand-royal underline">Go to Edudeen</Link></div>
            </div>
          ) : joined ? (
            <div role="status" className="mt-4">
              <p className="text-[14px] text-carbon">You joined <strong>{joined.storeName}</strong>.</p>
              <p className="mt-1 text-[12.5px] text-slate">You can open it any time from your profile menu.</p>
              <Button className="mt-4" variant="primary" loading={busyId === joined.storeId} onClick={() => open(joined.storeId)}>Open the store</Button>
              {openError && <p role="alert" className="mt-2 text-[12.5px] text-error">{openError}</p>}
            </div>
          ) : info && (
            <div className="mt-3">
              <p className="text-[14px] text-charcoal leading-[1.6]">You are invited to help run <strong>{info.storeName}</strong> as <strong>{info.roleName}</strong>.</p>
              <p className="mt-1 text-[12.5px] text-slate">Sent to {info.emailHint}.</p>

              {signedIn ? (
                <>
                  <Button className="mt-5" variant="primary" loading={busy} onClick={() => run(() => apiAcceptInvite(token))}>Accept invitation</Button>
                </>
              ) : !info.hasAccount ? (
                <form className="mt-5 flex flex-col gap-3 text-start" onSubmit={e => { e.preventDefault(); createAndJoin(); }} noValidate>
                  <p className="text-[12.5px] text-slate leading-[1.6]">You do not have an Edudeen account yet. Choose a password to create it and join this store.</p>
                  <Input label="Your name (optional)" value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" />
                  <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} maxLength={72} autoComplete="new-password" error={newPwError} />
                  <Input label="Confirm password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} maxLength={72} autoComplete="new-password" error={confirmError} />
                  <p className="text-[12px] text-slate">At least 8 characters.</p>
                  <Button type="submit" variant="primary" loading={busy}>Create password and join</Button>
                </form>
              ) : info.hasPassword && info.accountVerified !== false ? (
                <form className="mt-5 flex flex-col gap-3 text-start" onSubmit={e => { e.preventDefault(); signInAndJoin(); }} noValidate>
                  <p className="text-[12.5px] text-slate leading-[1.6]">You already have an Edudeen account with this e-mail. Enter your usual password to join. You do not need a new password.</p>
                  <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} maxLength={72} autoComplete="current-password" error={touched && !password ? 'Enter your password' : ''} />
                  <Button type="submit" variant="primary" loading={busy}>Sign in and join</Button>
                  <div className="flex flex-wrap justify-between gap-2 text-[12.5px]">
                    <Link to="/forgot-password" className="text-brand-royal underline">Forgot your password?</Link>
                    <Link to={loginHref} className="text-brand-royal underline">Sign in another way</Link>
                  </div>
                </form>
              ) : (
                <div className="mt-5">
                  <p className="text-[12.5px] text-slate leading-[1.6]">{info.hasPassword ? 'Please verify your account first, then come back to this invitation.' : 'This account signs in with Google or another method. Sign in, then accept the invitation.'}</p>
                  <Button className="mt-4" variant="primary" to={loginHref}>Sign in</Button>
                </div>
              )}
              {formError && <p role="alert" className="mt-3 text-[12.5px] text-error">{formError}</p>}
            </div>
          )}
      </div>
    </div>
  );
}
