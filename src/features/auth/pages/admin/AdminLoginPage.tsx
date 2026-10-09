import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { safeRedirectPath } from '@/utils/safeRedirect';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/comman/ui/Button';
import { Input } from '@/components/comman/ui/Input';
import { Eye, EyeOff, Shield, Lock, Activity } from 'lucide-react';
import { useForm } from '@/hooks/useForm';
import { loginSchema, type LoginFormData } from '@/utils/validation/schemas';
import { useLogin } from '@/hooks/auth/useLogin';
import { AuthSplitLayout } from '@/features/auth/components/AuthSplitLayout';
import { AdminControlMockup } from '@/features/auth/components/mockups/AuthMockups';

const HIGHLIGHTS = [
  { Icon: Shield,   text: 'Manage users, sellers and marketplace policy' },
  { Icon: Activity, text: 'Monitor platform health and finance in real time' },
  { Icon: Lock,     text: 'Restricted access — authorized administrators only' },
];

const BRANDING_HEADER = (
  <div className="flex items-center gap-[10px]">
    <div className="size-9 rounded-lg bg-brand-royal flex items-center justify-center shrink-0">
      <Shield size={18} className="text-white" />
    </div>
    <div>
      <p className="text-[15px] font-bold text-white leading-tight">Edudeen Admin</p>
      <p className="text-[12px] text-white/70 leading-tight">Super Admin Panel</p>
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
export function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('redirect'));
  usePageTitle('Admin Login');

  const [showPass, setShowPass] = useState(false);
  const { execute: login, loading, error: apiError } = useLogin();

  const { values, errors, set, blur, handleSubmit } = useForm(
    loginSchema,
    { email: '', password: '' },
    {
      onSubmit: (data: LoginFormData) => login({
        email:    data.email,
        password: data.password,
        role:     'admin',
      }, redirectTo),
    },
  );

  return (
    <AuthSplitLayout
      panelGradient="from-carbon via-charcoal to-brand-deep-orange"
      brandingHeader={BRANDING_HEADER}
      heading={<>Platform control,<br />secured.</>}
      subtext="Sign in with your administrator credentials to access the Edudeen control panel."
      highlights={HIGHLIGHTS}
      accentIconClass="text-[#9CCBF2]"
      visual={<AdminControlMockup />}
    >
      <h1 className="text-[22px] font-bold text-carbon mb-1.5 text-center lg:text-start">
        Admin Sign In
      </h1>
      <p className="text-[13px] text-slate mb-6 text-center lg:text-start">
        Access the Edudeen admin panel
      </p>

      <div className="flex flex-col gap-4">
        <Input
          id="admin-login-email"
          label="Email Address"
          type="email"
          placeholder="Enter Admin Email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          onBlur={blur('email')}
          error={errors.email}
        />

        <div>
          <Input
            id="admin-login-password"
            label="Enter Admin Password"
            type={showPass ? 'text' : 'password'}
            placeholder="Enter your password"
            autoComplete="current-password"
            value={values.password}
            onChange={set('password')}
            onBlur={blur('password')}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            error={errors.password}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                className="bg-transparent border-none cursor-pointer text-slate p-0 flex hover:text-charcoal transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <div className="flex justify-end mt-2">
            <Button variant="link" size="sm" onClick={() => navigate('/forgot-password')}>
              Forgot password?
            </Button>
          </div>
        </div>
      </div>

      <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} loading={loading} className="mt-6">
        Sign In
      </Button>

      {apiError && (
        <div role="alert" className="bg-error-bg rounded-lg px-[14px] py-[10px] mt-3 text-[13px] text-error text-center">
          {apiError}
        </div>
      )}
    </AuthSplitLayout>
  );
}
