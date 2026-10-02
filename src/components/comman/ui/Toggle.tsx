import { clsx } from 'clsx';

interface ToggleProps {
  checked:   boolean;
  onChange:  (v: boolean) => void;
  disabled?: boolean;
  size?:     'sm' | 'md';
}

export function Toggle({ checked, onChange, disabled = false, size = 'md' }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        size === 'md' ? 'w-10 h-[22px]' : 'w-8 h-5',
        'relative rounded-full border-none cursor-pointer p-0 shrink-0',
        'transition-colors duration-[180ms]',
        checked ? 'bg-brand-orange' : 'bg-[#d1d5db]',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={clsx(
          size === 'md' ? 'w-4 h-4 top-[3px]' : 'w-3.5 h-3.5 top-[3px]',
          'absolute rounded-full bg-white transition-[left] duration-[180ms]',
          checked
            ? (size === 'md' ? 'start-[21px]' : 'start-[14px]')
            : 'start-[3px]',
        )}
      />
    </button>
  );
}
