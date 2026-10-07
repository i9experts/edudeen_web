import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiVerifyOtp, AuthContext, TokenStorage, LastRolePreference, RememberedAccount, getRoleRedirect, type AppRole } from '@/api/services/auth';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';

export function useVerifyOtp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function execute(otp: string) {
    const ctx = AuthContext.get();
    if (!ctx?.email) { setError('Session expired. Please register again.'); return; }

    setError('');
    setLoading(true);
    try {
      const res = await apiVerifyOtp({ email: ctx.email, role: ctx.role, otp });
      TokenStorage.save(res.data.token.accessToken, res.data.token.refreshToken);
      const role = ctx.role as AppRole;
      // The verify-otp response's `user` has no `role` field at all (backend
      // only returns id/name/email/phone/address here) — saving it as-is
      // would leave every downstream role guard (SellerLayout, StoreLayout,
      // this page's own /onboard guard) reading `role: undefined`, which
      // reads as "not a seller" and bounces them straight back to /login
      // right after they just verified. Stamping the role we already know
      // client-side (the one they registered with) onto the saved user
      // object is what makes the rest of the app's guards work at all.
      TokenStorage.saveUser({ ...res.data.user, role });
      LastRolePreference.set(role);
      RememberedAccount.set({ name: res.data.user.name, email: res.data.user.email, role, image: null, authMethod: 'password' });
      AuthContext.clear();
      // Inspect the seller's REAL store state instead of assuming — this
      // path runs right after fresh registration (an already-verified
      // account is rejected earlier by the backend), so a seller here
      // almost always has zero stores yet and lands on /onboard, but the
      // resolver is still the source of truth rather than a hardcoded
      // guess. The token is already saved above, so there's no reason to
      // ever bounce through /login.
      let afterAuth: string | null = null;
      try { afterAuth = sessionStorage.getItem('afterAuthPath'); sessionStorage.removeItem('afterAuthPath'); } catch { /* storage blocked */ }
      const destination = role === 'seller' ? await resolveSellerDestinationRemote() : (afterAuth?.startsWith('/') && !afterAuth.startsWith('//') ? afterAuth : getRoleRedirect(role));
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return { execute, loading, error };
}
