import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, KeyRound, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useForgotPassword } from '@/hooks/auth/useForgotPassword';
import { Button } from '@/components/comman/ui/Button';
import { Input } from '@/components/comman/ui/Input';
import { useForm } from '@/hooks/useForm';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/utils/validation/schemas';
import { AuthSplitLayout } from '@/features/auth/components/AuthSplitLayout';
import { SecurityMockup } from '@/features/auth/components/mockups/AuthMockups';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { motion } from 'motion/react';

const fadeSlide = { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } };

const HIGHLIGHTS = [
  { Icon: KeyRound,    text: 'Get a secure reset code by email' },
  { Icon: Clock,       text: 'Codes expire quickly for your safety' },
  { Icon: ShieldCheck, text: 'Your account stays protected throughout' },
];

export function ForgotPasswordPage() {
  const navigate       = useNavigate();
  usePageTitle('Forgot Password');
  const forgotPassword = useForgotPassword();

  const { values, errors, set, blur, handleSubmit } = useForm(
    forgotPasswordSchema,
    { email: '' },
    {
      onSubmit: async (data: ForgotPasswordFormData) => {
        // Seller-only web login (see LoginPage's SELLER_ONLY_LOGIN) — every
        // real account reaching this page is a seller, so this must query
        // the Seller collection, not useForgotPassword's buyer-oriented
        // 'user' default (which would silently check the wrong collection
        // and never actually send a real seller their reset code).
        await forgotPassword.execute(data.email, 'seller');
      },
    },
  );

  return (
    <AuthSplitLayout
      heading="Forgot your way in? No problem."
      subtext="We'll email you a secure code to get you straight back into your account."
      highlights={HIGHLIGHTS}
      visual={<SecurityMockup />}
    >
      <div className="size-11 rounded-xl bg-brand-pale-orange flex items-center justify-center mb-4 mx-auto lg:mx-0">
        <Mail size={19} className="text-brand-orange" />
      </div>

      <h1 className="text-[22px] font-bold text-carbon mb-1.5 text-center lg:text-start">
        Forgot your password?
      </h1>
      <p className="text-[13px] text-slate mb-6 leading-[1.6] text-center lg:text-start">
        Enter your email and we'll send you a reset code.
      </p>

      <div className="mb-5">
        <Input
          id="forgot-email"
          label="Email Address"
          type="email" placeholder="Enter Your Email Address" autoComplete="email"
          value={values.email} onChange={set('email')} onBlur={blur('email')}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          error={errors.email}
        />
      </div>

      <MagneticButton className="block">
        <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} loading={forgotPassword.loading}>
          Send Reset Code
        </Button>
      </MagneticButton>

      {forgotPassword.error && (
        <motion.div role="alert" className="flex items-center justify-center gap-2 rounded-lg bg-error-bg px-[14px] py-[10px] mt-3 text-[13px] text-error" {...fadeSlide}>
          <AlertTriangle size={14} className="shrink-0" />
          <span>{forgotPassword.error}</span>
        </motion.div>
      )}

      <Button
        variant="ghost"
        size="sm"
        fullWidth
        icon={<ArrowLeft size={13} />}
        onClick={() => navigate('/login')}
        className="mt-6 text-slate!"
      >
        Back to Sign In
      </Button>
    </AuthSplitLayout>
  );
}
