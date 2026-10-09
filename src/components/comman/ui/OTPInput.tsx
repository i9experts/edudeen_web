import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';

interface OTPInputProps {
  values:   string[];
  onChange: (index: number, value: string) => void;
  length?:  number;
}

// Shared 6-box OTP entry (extracted from VerifyOTPPage — was duplicated as a
// single raw <input> on NewPasswordPage). Auto-advances on digit entry,
// supports backspace/arrow navigation and paste-splitting a full code.
export function OTPInput({ values, onChange, length = 6 }: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    onChange(i, val);
    if (val && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft'  && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    pasted.split('').forEach((ch, i) => onChange(i, ch));
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  const filled = values[0] !== '' && values.every(v => v !== '');

  return (
    <div>
      <div role="group" aria-label={`${length}-digit verification code`} className="flex gap-2 sm:gap-3 justify-center mb-3">
        {values.map((val, i) => (
          <input key={i}
            ref={el => { refs.current[i] = el; }}
            aria-label={`Digit ${i + 1} of ${length}`}
            type="text" inputMode="numeric" maxLength={1} value={val}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={[
              'w-10 h-12 sm:w-[52px] sm:h-14 text-center text-[18px] sm:text-[22px] font-bold rounded-xl border-2 text-carbon outline-none cursor-text',
              'transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out',
              'focus:ring-4 focus:ring-brand-orange/10 focus:scale-[1.04]',
              val ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-white hover:border-slate/40',
            ].join(' ')}
          />
        ))}
      </div>
      {filled && (
        <motion.p
          className="text-center text-[12px] text-success flex items-center justify-center gap-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <Check size={11} /> Code entered
        </motion.p>
      )}
    </div>
  );
}
