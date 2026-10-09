import { useState, useId, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useResetPassword } from '@/hooks/auth/useResetPassword';
import { Button } from '@/components/comman/ui/Button';
import { Eye, EyeOff, ArrowRight, Check, Circle, Lock, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';
import { useForm } from '@/hooks/useForm';
import { newPasswordSchema, type NewPasswordFormData } from '@/utils/validation/schemas';
import { AuthContext } from '@/api/services/auth';
import { AuthSplitLayout } from '@/features/auth/components/AuthSplitLayout';
import { PasswordSecurityMockup } from '@/features/auth/components/mockups/AuthMockups';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { motion } from 'motion/react';

const fadeSlide = { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } };

const HIGHLIGHTS = [
  { Icon: KeyRound,    text: 'Verify with the code we emailed you' },
  { Icon: Lock,        text: 'Choose a strong, unique password' },
  { Icon: ShieldCheck, text: 'You will stay signed out of other devices' },
];

function getStrength(password: string) {
  if (!password) return { score: 0, label: '', colorClass: '', bgClass: 'bg-bone' };
  let score = 0;
  if (password.length >= 8)          score++;
  if (/[A-Z]/.test(password))        score++;
  if (/[0-9]/.test(password))        score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12)         score++;
  if (score <= 1) return { score, label: 'Weak',   colorClass: 'text-error',        bgClass: 'bg-error'        };
  if (score <= 2) return { score, label: 'Fair',   colorClass: 'text-warning',      bgClass: 'bg-warning'      };
  if (score <= 3) return { score, label: 'Good',   colorClass: 'text-brand-orange', bgClass: 'bg-brand-orange' };
  return              { score, label: 'Strong', colorClass: 'text-success',      bgClass: 'bg-success'      };
}

function StrengthBar({ password }: { password: string }) {
  const { score, label, colorClass, bgClass } = getStrength(password);
  if (!password) return null;
  const widthPct = `${Math.min(100, (score / 4) * 100)}%`;
  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-[12px] text-slate">Password strength</span>
        <span className={clsx('text-[12px] font-semibold', colorClass)}>{label}</span>
      </div>
      <div className="h-1 bg-bone rounded-sm overflow-hidden">
        <div className={clsx('h-full rounded-sm transition-[width] duration-300', bgClass)} style={{ width: widthPct }} />
      </div>
      <div className="mt-[10px] flex flex-col gap-1">
        {([
          [password.length >= 8,           'At least 8 characters'],
          [/[A-Z]/.test(password),         'One uppercase letter'],
          [/[0-9]/.test(password),         'One number'],
          [/[^A-Za-z0-9]/.test(password),  'One special character'],
        ] as [boolean, string][]).map(([met, req]) => (
          <div key={req} className="flex items-center gap-[6px]">
            <span className={clsx('flex', met ? 'text-success' : 'text-slate')}>
              {met ? <Check size={12} /> : <Circle size={12} />}
            </span>
            <span className={clsx('text-[12px]', met ? 'text-success' : 'text-slate')}>{req}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PasswordInput({ label, placeholder, value, onChange, onBlur, error }: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; onBlur?: () => void; error?: string;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-medium text-charcoal mb-[6px]">{label}</label>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} placeholder={placeholder} value={value} autoComplete="new-password"
          onChange={e => onChange(e.target.value)} onBlur={onBlur}
          className={clsx(
            'w-full px-3 pe-[42px] py-[10px] rounded-lg border text-[13px] text-charcoal outline-none bg-white',
            'transition-[border-color,box-shadow] duration-150 focus:ring-2',
            error ? 'border-error focus:ring-error/10' : 'border-bone focus:border-brand-orange focus:ring-brand-orange/10',
          )}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute end-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate p-0 flex hover:text-charcoal transition-colors">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-[12px] text-error mt-[5px]">{error}</p>}
    </div>
  );
}

export function NewPasswordPage() {
  const navigate      = useNavigate();
  usePageTitle('New Password');
  const resetPassword = useResetPassword();

  const ctx       = AuthContext.get();
  const userEmail = ctx?.email ?? '';
  const otp       = ctx?.otp ?? '';

  // Landing here without a code means the OTP step was skipped (direct URL,
  // refresh after AuthContext's sessionStorage was cleared, etc.) — there's
  // nothing to submit yet, so send them back to get one instead of showing
  // a form that can only ever fail.
  useEffect(() => {
    if (!otp) navigate('/forgot-password', { replace: true });
  }, [otp, navigate]);

  const { values, errors, setValue, blur, handleSubmit } = useForm(
    newPasswordSchema,
    { password: '', confirmPassword: '' },
    {
      onSubmit: async (data: NewPasswordFormData) => {
        if (!otp) return;
        await resetPassword.execute(otp, data.password);
      },
    },
  );

  const passwordsMatch = values.password === values.confirmPassword && values.confirmPassword !== '';

  if (!otp) return null;

  if (resetPassword.success) {
    return (
      <AuthSplitLayout heading="Password updated." subtext="You're all set — sign back in with your new password." highlights={HIGHLIGHTS} visual={<PasswordSecurityMockup />}>
        <h1 className="text-[22px] font-bold text-carbon text-center mb-2">Password updated!</h1>
        <p className="text-[13px] text-slate text-center leading-[1.6] mb-6">
          Your password has been changed. You can now sign in.
        </p>
        <MagneticButton className="block">
          <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/login')} iconRight={<ArrowRight size={14} />}>
            Sign In Now
          </Button>
        </MagneticButton>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout heading="Almost there. Set a new password." subtext="Enter the code we emailed you and choose a new password to finish." highlights={HIGHLIGHTS} visual={<PasswordSecurityMockup />}>
      <h1 className="text-[22px] font-bold text-carbon text-center lg:text-start mb-2">Reset your password</h1>
      <p className="text-[13px] text-slate text-center lg:text-start mb-5 leading-[1.6]">
        {userEmail ? <>Almost done, <strong className="text-carbon">{userEmail}</strong> — choose a new password to finish resetting your account.</> : 'Choose a new password to finish resetting your account.'}
      </p>

      {/* New password */}
      <div className="mb-3">
        <PasswordInput label="New Password" placeholder="Enter new password"
          value={values.password} onChange={v => setValue('password', v)}
          onBlur={blur('password')} error={errors.password} />
        <StrengthBar password={values.password} />
      </div>

      {/* Confirm */}
      <div className="mb-4">
        <PasswordInput label="Confirm Password" placeholder="Confirm new password"
          value={values.confirmPassword} onChange={v => setValue('confirmPassword', v)}
          onBlur={blur('confirmPassword')} error={errors.confirmPassword} />
        {values.confirmPassword && (
          <motion.p className={clsx('text-[12px] mt-[5px]', passwordsMatch ? 'text-success' : 'text-error')} {...fadeSlide}>
            {passwordsMatch
              ? <><Check size={11} className="inline align-middle me-[3px]" />Passwords match</>
              : <>✗ Passwords do not match</>}
          </motion.p>
        )}
      </div>

      {resetPassword.error && (
        <motion.div role="alert" className="flex flex-col gap-2 rounded-lg bg-error-bg px-[14px] py-[10px] mb-4 text-[13px] text-error" {...fadeSlide}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{resetPassword.error}</span>
          </div>
          {/* The code entered on the previous step is what's actually being
             checked here (the backend verifies it together with the new
             password) — if it was wrong or has expired, the only way back
             is to re-enter it, not retry this same form. */}
          <button
            type="button"
            onClick={() => navigate('/verify-otp')}
            className="self-start text-[12.5px] font-semibold text-error underline bg-transparent border-none cursor-pointer p-0"
          >
            Re-enter code
          </button>
        </motion.div>
      )}

      <MagneticButton className="block">
        <Button
          variant="primary" size="lg" fullWidth
          onClick={handleSubmit}
          loading={resetPassword.loading}
          iconRight={!resetPassword.loading && <ArrowRight size={14} />}
        >
          Reset Password
        </Button>
      </MagneticButton>
    </AuthSplitLayout>
  );
}
