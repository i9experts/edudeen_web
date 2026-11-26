import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button, SkeletonBox } from '@/components/comman/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TokenStorage } from '@/api/services/auth';
import { apiAcceptInvite, apiInviteInfo, type InviteInfo } from '@/api/services/storeTeam';
import { useOpenTeamStore } from '@/hooks/useTeamStores';
import { invalidateCache } from '@/api/services/requestCache';

const msg = (e: any, fallback: string) => e?.response?.data?.message ?? e?.message ?? fallback;

/** /store-invite/:token : what the invitation is for, then sign in (same e-mail) and accept. The token works once. */
export function StoreInvitePage() {
  usePageTitle('Store invitation');
  const { token = '' } = useParams();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [joined, setJoined] = useState<{ storeId: string; storeName: string } | null>(null);
  const { open, busyId, error: openError } = useOpenTeamStore();
  const role = TokenStorage.getRole();
  const signedIn = TokenStorage.isLoggedIn() && (role === 'user' || role === 'seller');
  const here = `/store-invite/${token}`;

  const load = () => {
    setLoading(true); setError('');
    apiInviteInfo(token).then(setInfo).catch(e => setError(msg(e, 'This invitation is not valid any more.'))).finally(() => setLoading(false));
  };
  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function accept() {
    if (accepting) return;
    setAccepting(true); setAcceptError('');
    try { setJoined(await apiAcceptInvite(token)); invalidateCache('team:mine'); }
    catch (e) { setAcceptError(msg(e, 'Could not accept the invitation. Try again.')); }
    finally { setAccepting(false); }
  }

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
              <p className="mt-1 text-[12.5px] text-slate">Sent to {info.emailHint}. Sign in with that e-mail address to accept.</p>
              {signedIn ? (
                <>
                  <Button className="mt-5" variant="primary" loading={accepting} onClick={accept}>Accept invitation</Button>
                  {acceptError && <p role="alert" className="mt-3 text-[12.5px] text-error">{acceptError}</p>}
                </>
              ) : (
                <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                  <Button variant="primary" to={`/login?redirect=${encodeURIComponent(here)}`}>Sign in</Button>
                  <Button variant="outline" onClick={() => { try { sessionStorage.setItem('afterAuthPath', here); } catch { /* storage blocked */ } window.location.assign('/register?role=user'); }}>Create an account</Button>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
