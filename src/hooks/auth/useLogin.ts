import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogin, apiResendOtp, AuthContext, TokenStorage, getRoleRedirect, LastRolePreference, RememberedAccount, type LoginPayload, type AppRole } from '@/api/services/auth';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';
import { useToast } from '@/contexts/ToastContext';

export function useLogin() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // `redirectTo` is the page the user was trying to reach before being
  // bounced to login (see client.ts's 401 interceptor / RequireRole guards,
  // which both append `?redirect=`) — only ever a same-origin relative path
  // (validated by the caller), so a successful login returns them to where
  // they actually were instead of always the role's default dashboard.
  async function execute(payload: LoginPayload, redirectTo?: string | null) {
    setError('');
    setLoading(true);
    try {
      const res        = await apiLogin(payload);
      const { token, user } = res.data;
      TokenStorage.save(token.accessToken, token.refreshToken);
      TokenStorage.saveUser(user);
      const serverRole = (user.role ?? payload.role) as AppRole;
      LastRolePreference.set(serverRole);
      RememberedAccount.set({ name: user.name, email: user.email, role: serverRole, image: user.image ?? null, authMethod: 'password' });
      toast.success('Logged in successfully');
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
        return;
      }
      // An existing seller's own real store state (not a hardcoded guess)
      // decides where they land — onboarding if they never finished setup,
      // verification if a store is pending/rejected, dashboard once active.
      const destination = serverRole === 'seller' ? await resolveSellerDestinationRemote() : getRoleRedirect(serverRole);
      navigate(destination, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      // A registered-but-unverified account can't sign in until its email is confirmed:
      // send a fresh code and continue on the verify page (which also has Resend).
      if (/not verified/i.test(message)) {
        AuthContext.set({ email: payload.email, role: payload.role, flow: 'register' });
        try { await apiResendOtp({ email: payload.email, role: payload.role }); toast.success('We sent a new verification code to your email.'); }
        catch { toast.error('Please verify your email — use Resend code on the next page if the code does not arrive.'); }
        navigate('/verify-otp');
        return;
      }
      setError(message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return { execute, loading, error };
}
