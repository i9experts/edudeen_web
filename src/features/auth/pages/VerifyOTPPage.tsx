import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useVerifyOtp } from '@/hooks/auth/useVerifyOtp';
import { Button } from '@/components/comman/ui/Button';
import { OTPInput } from '@/components/comman/ui/OTPInput';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { runSchema, otpSchema } from '@/utils/validation/schemas';
import { AuthContext, apiResendOtp, apiForgotPassword, type AppRole } from '@/api/services/auth';
import { AuthSplitLayout } from '@/features/auth/components/AuthSplitLayout';
import { Mail, ShieldCheck, KeyRound, Fingerprint } from 'lucide-react';
import { InboxMockup, IdentityMockup } from '@/features/auth/components/mockups/AuthMockups';
import { useToast } from '@/contexts/ToastContext';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { motion } from 'motion/react';

const fadeSlide = { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } };

const EMAIL_HIGHLIGHTS = [
  { Icon: Mail,        text: 'Check your inbox for a 6-digit code' },
  { Icon: KeyRound,    text: 'Codes expire after a short window' },
  { Icon: ShieldCheck, text: 'This keeps your account secure' },
];

const IDENTITY_HIGHLIGHTS = [
  { Icon: Fingerprint, text: "We're just confirming it's really you" },
  { Icon: KeyRound,    text: 'Codes expire after a short window' },
  { Icon: ShieldCheck, text: 'Your account stays protected throughout' },
];

function ResendTimer({ email, role, isIdentity }: { email: string; role: AppRole; isIdentity: boolean }) {
  const toast = useToast();
  const [seconds,    setSeconds]    = useState(59);
  const [canResend,  setCanResend]  = useState(false);
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState('');
  // Bumped on every successful resend so the countdown effect below re-runs
  // and starts a fresh interval — previously the interval was only ever
  // created once (inside a useState initializer, whose cleanup was never
  // actually invoked since only useEffect cleanup functions are), so after
  // the first countdown finished, resetting `seconds` to 59 froze the
  // display forever with no running timer to count it back down.
  const [resendKey,  setResendKey]  = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(t); setCanResend(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [resendKey]);

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      // Registration's resend-otp endpoint 400s with "User already verified"
      // for a forgot-password OTP — that account is, correctly, already
      // verified. Forgot-password's own endpoint already regenerates and
      // re-emails a fresh code, so it doubles as the real "resend" here.
      if (isIdentity) {
        await apiForgotPassword({ email, role });
      } else {
        await apiResendOtp({ email, role });
      }
      setSeconds(59);
      setCanResend(false);
      setResendKey(k => k + 1);
      toast.success('Code resent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code.');
    } finally {
      setSending(false);
    }
  };

  if (canResend) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Button variant="link" size="sm" onClick={handleResend} loading={sending} disabled={sending}>
          Resend code
        </Button>
        {error && <p className="text-[11px] text-error">{error}</p>}
      </div>
    );
  }
  return (
    <span className="text-[13px] text-slate">
      Resend in <span className="font-semibold text-charcoal">{seconds}s</span>
    </span>
  );
}

export function VerifyOTPPage() {
  usePageTitle('Verify OTP');
  const navigate   = useNavigate();
  const verifyOtp  = useVerifyOtp();
  const [otp, setOtp]     = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');

  const ctx        = AuthContext.get();
  const userEmail  = ctx?.email ?? '';
  const userRole   = ctx?.role ?? 'user';
  const isIdentity = ctx?.flow === 'forgot';

  const handleChange = (i: number, val: string) => {
    const next = [...otp]; next[i] = val; setOtp(next); setError('');
  };

  const handleVerify = async () => {
    const code = otp.join('');
    const errs = runSchema(otpSchema, { otp: code });
    if (errs.otp) { setError(errs.otp); return; }

    if (isIdentity) {
      // There's no standalone "verify this reset code" backend endpoint —
      // reset-password only accepts otp+newPassword together in one call.
      // Carry the code forward instead of re-verifying it here; if it's
      // actually wrong/expired, that surfaces on the next step when the
      // combined request is made, with a way back to re-enter it.
      AuthContext.set({ email: userEmail, role: userRole, flow: 'forgot', otp: code });
      navigate('/new-password');
      return;
    }

    await verifyOtp.execute(code);
    if (verifyOtp.error) setError(verifyOtp.error);
  };

  return (
    <AuthSplitLayout
      heading={isIdentity ? 'Confirm it\'s you.' : 'One last step.'}
      subtext={isIdentity
        ? "Enter the code we sent to confirm your identity before resetting your password."
        : 'Verify your email address to finish setting up your Edudeen account.'}
      highlights={isIdentity ? IDENTITY_HIGHLIGHTS : EMAIL_HIGHLIGHTS}
      visual={isIdentity ? <IdentityMockup /> : <InboxMockup />}
    >
      <h1 className="text-[22px] font-bold text-carbon text-center mb-2">
        {isIdentity ? 'Verify your identity' : 'Verify your email'}
      </h1>
      <p className="text-[13px] text-slate text-center mb-1 leading-[1.6]">
        We sent a 6-digit verification code to
      </p>
      <p className="text-[14px] font-semibold text-carbon text-center mb-6">
        {userEmail || '—'}
      </p>

      <div className="mb-5">
        <OTPInput values={otp} onChange={handleChange} />
      </div>

      {(error || verifyOtp.error) && (
        <motion.div role="alert" className="bg-error-bg rounded-lg px-[14px] py-[10px] mb-4 flex items-center gap-2" {...fadeSlide}>
          <AlertTriangle size={14} className="text-error shrink-0" />
          <span className="text-[13px] text-error">{error || verifyOtp.error}</span>
        </motion.div>
      )}

      <MagneticButton className="block">
        <Button
          variant="primary" size="lg" fullWidth
          onClick={handleVerify}
          disabled={otp.join('').length < 6}
          loading={verifyOtp.loading}
          iconRight={!verifyOtp.loading && <ArrowRight size={14} />}
        >
          Verify Code
        </Button>
      </MagneticButton>

      <div className="flex items-center justify-center gap-[6px] mt-5">
        <span className="text-[13px] text-slate">Didn't receive it?</span>
        <ResendTimer email={userEmail} role={userRole} isIdentity={isIdentity} />
      </div>
    </AuthSplitLayout>
  );
}
