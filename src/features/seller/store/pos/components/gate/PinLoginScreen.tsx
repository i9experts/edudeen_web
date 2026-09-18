import { useState } from 'react';
import { Mail, LogIn, Delete } from 'lucide-react';
import { EdudeenIcon } from '@/components/comman/ui/EdudeenLogo';
import { OTPInput } from '@/components/comman/ui/OTPInput';
import { useForm } from '@/hooks/useForm';
import { required, email as emailValidator, exactLength, numeric } from '@/utils/validation/validators';
import type { Schema } from '@/utils/validation/schemas';
import { apiPinLogin, type PinLoginResult } from '@/api/services/pos/posPinLogin';

interface PinLoginFormData {
  email: string;
  pin:   string;
}

const schema: Schema<PinLoginFormData> = {
  email: [required('Email'), emailValidator()],
  pin:   [required('PIN'), numeric('PIN must be numeric'), exactLength(4, 'PIN')],
};

interface PinLoginScreenProps {
  storeId:   string;
  onSuccess: (result: PinLoginResult) => void;
}

export function PinLoginScreen({ storeId, onSuccess }: PinLoginScreenProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState('');

  const { values, errors, set, blur, setValue, handleSubmit } = useForm<PinLoginFormData>(
    schema,
    { email: '', pin: '' },
    {
      onSubmit: async data => {
        setApiError('');
        setSubmitting(true);
        try {
          const res = await apiPinLogin({ storeId, email: data.email.trim(), pin: data.pin });
          onSuccess(res.data);
        } catch (err) {
          setApiError(err instanceof Error ? err.message : 'PIN login failed. Please try again.');
        } finally {
          setSubmitting(false);
        }
      },
    },
  );

  const pinDigits = Array.from({ length: 4 }, (_, i) => values.pin[i] ?? '');
  const handlePinChange = (i: number, val: string) => {
    const next = pinDigits.slice();
    next[i] = val;
    setValue('pin', next.join(''));
  };

  // Thumb-friendly on-screen keypad (mobile only, lg:hidden below) — feeds
  // the exact same `pin` field the OTP boxes above use, just without relying
  // on the device's own keyboard/autocomplete bar for a 4-digit PIN.
  function pushDigit(d: string) {
    const idx = pinDigits.findIndex(v => v === '');
    if (idx === -1) return;
    handlePinChange(idx, d);
  }
  function popDigit() {
    for (let i = pinDigits.length - 1; i >= 0; i--) {
      if (pinDigits[i] !== '') { handlePinChange(i, ''); return; }
    }
  }
  const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <div className="relative flex-1 flex items-center justify-center bg-pos-bg px-4 py-10 overflow-hidden">
      {/* Ambient branding glow — same "premium dark hero" language as the rest of the app */}
      <div className="absolute w-[440px] h-[440px] rounded-full bg-brand-orange/[0.08] blur-[110px] -top-40 -left-28 pointer-events-none" />
      <div className="absolute w-[380px] h-[380px] rounded-full bg-info/[0.06] blur-[110px] -bottom-32 -right-20 pointer-events-none" />

      <div className="relative w-full max-w-[400px] bg-pos-surface-3 border border-pos-border-strong rounded-[28px] p-8 sm:p-9 pos-panel-enter">
        <div className="flex flex-col items-center mb-8">
          <EdudeenIcon size={48} />
          <p className="text-[19px] font-bold text-white mt-5">POS Employee Login</p>
          <p className="text-[12.5px] text-pos-muted mt-[6px] text-center leading-[1.6] max-w-[280px]">
            Enter your email and 4-digit PIN to start your shift
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-[11.5px] font-semibold text-pos-faint mb-2 uppercase tracking-[0.04em]">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-[14px] top-1/2 -translate-y-1/2 text-pos-muted pointer-events-none" />
              <input
                type="email"
                value={values.email}
                onChange={set('email')}
                onBlur={blur('email')}
                placeholder="you@store.com"
                className="w-full h-[52px] bg-pos-surface border border-pos-border rounded-2xl pl-[42px] pr-[14px] text-[14px] text-white outline-none box-border transition-colors duration-150 focus:border-brand-orange/50"
                autoFocus
              />
            </div>
            {errors.email && <p className="text-[11.5px] text-error mt-[7px]">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-pos-faint mb-2 uppercase tracking-[0.04em] text-center">4-Digit PIN</label>
            <OTPInput values={pinDigits} onChange={handlePinChange} length={4} />
            {errors.pin && <p className="text-[11.5px] text-error text-center -mt-1">{errors.pin}</p>}

            <div className="lg:hidden grid grid-cols-3 gap-[10px] mt-4">
              {KEYPAD_KEYS.map((k, i) => {
                if (k === '') return <div key={i} aria-hidden="true" />;
                if (k === 'back') {
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={popDigit}
                      aria-label="Backspace"
                      className="h-14 rounded-2xl bg-pos-surface border border-pos-border text-pos-faint cursor-pointer flex items-center justify-center transition-all duration-150 active:scale-[0.95] hover:border-pos-border-strong hover:text-white"
                    >
                      <Delete size={20} />
                    </button>
                  );
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pushDigit(k)}
                    className="h-14 rounded-2xl bg-pos-surface border border-pos-border text-[20px] font-bold text-white cursor-pointer transition-all duration-150 active:scale-[0.95] hover:border-pos-border-strong"
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>

          {apiError && (
            <p className="text-[12.5px] text-error bg-error/10 border border-error/30 rounded-xl px-[14px] py-[10px]">
              {apiError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full h-[54px] bg-gradient-to-b from-brand-orange to-brand-deep-orange border-0 rounded-2xl text-[14px] font-bold text-white cursor-pointer flex items-center justify-center gap-[8px] transition-transform duration-150 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            <LogIn size={16} />
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
