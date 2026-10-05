import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { AuthContext, apiResendOtp, type AppRole } from '@/api/services/auth';
import { Shield, Mail, Check, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { apiChangePassword } from '@/api/services/users';
import { Card, PageHeader, Badge, SkeletonBox } from '@/components/comman/ui';

const INPUT_CLS = 'w-full py-[11px] px-[14px] text-[13px] border border-bone rounded-[10px] outline-none text-charcoal bg-white box-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 transition-colors';
const LABEL_CLS = 'text-[12px] font-medium text-graphite mb-[6px] block';

// Same show/hide affordance the Login/Register password fields already use.
function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={clsx(INPUT_CLS, 'pe-10')}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute end-[12px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate p-0 flex hover:text-charcoal transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

// Real route for what used to live behind Settings' ?tab=security.
export function Security() {
  const navigate = useNavigate();
  const { profile, loading } = useGetProfile();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  // A social-only account (e.g. created with Google) has no password at all.
  // `hasPassword` comes from the profile API; older API builds don't send it,
  // in which case we assume a password exists (the pre-existing behaviour).
  const provider = profile?.authProvider ?? null;
  const providerLabel =
    provider === 'google' ? 'Google' :
    provider === 'facebook' ? 'Facebook' :
    provider === 'apple' ? 'Apple' : null;
  const socialOnly = profile?.hasPassword === false;

  // Unverified email → send a fresh OTP and hand off to the existing verify page.
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState('');
  const handleResendVerification = async () => {
    if (!profile) return;
    setResendError('');
    setResending(true);
    try {
      const role: AppRole = profile.role === 'seller' ? 'seller' : 'user';
      await apiResendOtp({ email: profile.email, role });
      AuthContext.set({ email: profile.email, role, flow: 'register' });
      navigate('/verify-otp');
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Failed to send a verification code.');
    } finally {
      setResending(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess(false);
    if (!currentPassword || !newPassword) { setPwError('Please fill in both password fields.'); return; }
    setPwSaving(true);
    try {
      await apiChangePassword({ currentPassword, newPassword });
      setPwSuccess(true);
      setCurrentPassword(''); setNewPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="hidden lg:block">
        <PageHeader eyebrow="Account" title="Login & Security" description="Manage your password and account security." />
      </div>

      <Card padding="none" className="rounded-2xl overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-br from-brand-pale-orange/60 to-cream flex items-center gap-3 border-b border-bone">
          <div className="w-10 h-10 rounded-[10px] bg-white border border-bone flex items-center justify-center shrink-0">
            <Mail size={16} className="text-brand-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-charcoal">Email Verification</p>
            {loading ? (
              <SkeletonBox width={140} height={11} className="mt-1" />
            ) : (
              <p className="text-[11.5px] text-slate mt-[2px] truncate">{profile?.email ?? '—'}</p>
            )}
          </div>
          {!loading && (
            <Badge color={profile?.isVerified ? 'green' : 'gray'} size="sm">
              {profile?.isVerified ? (<><Check size={9} className="me-[2px]" /> Verified</>) : 'Unverified'}
            </Badge>
          )}
          {!loading && profile && !profile.isVerified && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className={clsx(
                'px-3 py-[6px] rounded-[8px] text-[11px] font-semibold bg-brand-orange text-white border-none flex items-center gap-1 shrink-0',
                resending ? 'cursor-wait opacity-70' : 'cursor-pointer hover:bg-brand-deep-orange transition-colors',
              )}
            >
              {resending && <Loader2 size={11} className="animate-spin" />}
              {resending ? 'Sending…' : 'Verify email'}
            </button>
          )}
        </div>
        {resendError && <p className="px-6 pt-3 text-[11px] text-error font-medium">{resendError}</p>}

        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-[9px] bg-brand-pale-orange flex items-center justify-center shrink-0">
              <KeyRound size={14} className="text-brand-orange" />
            </div>
            <p className="text-[13px] font-bold text-charcoal">{socialOnly ? 'Password' : 'Change Password'}</p>
          </div>

          {socialOnly ? (
            <div className="flex flex-col gap-3">
              <p className="text-[12px] text-slate leading-relaxed">
                You sign in with {providerLabel ?? 'a social account'}, so this account has no password yet.
                To add one, request a reset code for {profile?.email ?? 'your email'} and choose a new password.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="px-6 py-[11px] bg-brand-orange border-none rounded-[10px] text-[13px] font-semibold text-white cursor-pointer hover:bg-brand-deep-orange transition-colors"
                >
                  Set a password
                </button>
              </div>
            </div>
          ) : (<>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <PasswordField label="Current Password" value={currentPassword} onChange={setCurrentPassword} />
            <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} />
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-[#f0ede5]">
            <button
              onClick={handleChangePassword}
              disabled={pwSaving}
              className={clsx(
                'mt-4 px-6 py-[11px] bg-brand-orange border-none rounded-[10px] text-[13px] font-semibold text-white flex items-center gap-2',
                pwSaving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-brand-deep-orange transition-colors',
              )}
            >
              {pwSaving && <Loader2 size={13} className="animate-spin" />}
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
            {pwSuccess && <span className="text-[11px] text-success font-medium mt-4">Password changed successfully</span>}
            {pwError && <span className="text-[11px] text-error font-medium mt-4">{pwError}</span>}
          </div>
          </>)}
        </div>
      </Card>

      <Card padding="none" className="rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-bone flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-brand-pale-orange flex items-center justify-center shrink-0">
            <Shield size={14} className="text-brand-orange" />
          </div>
          <p className="text-[13px] font-bold text-charcoal">Security Overview</p>
        </div>
        <div className="p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-graphite">Password protection</span>
            {loading ? (
              <SkeletonBox width={60} height={16} rounded="999px" />
            ) : socialOnly ? (
              <Badge color="gray" size="sm" dot>Not set</Badge>
            ) : (
              <Badge color="green" size="sm" dot>Active</Badge>
            )}
          </div>
          {!loading && providerLabel && (
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-graphite">Sign-in method</span>
              <Badge color="gray" size="sm">Signed in with {providerLabel}</Badge>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-graphite">Email verification</span>
            <Badge color={profile?.isVerified ? 'green' : 'gray'} size="sm" dot>{profile?.isVerified ? 'Verified' : 'Unverified'}</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
