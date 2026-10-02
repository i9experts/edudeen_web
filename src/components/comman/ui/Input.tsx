import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:      string;
  error?:      string;
  leftAddon?:  string;
  rightIcon?:  ReactNode;  // e.g. eye toggle for password
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const BASE =
  'w-full py-[9px] px-3 rounded-md border border-bone bg-white text-[13px] text-charcoal ' +
  'outline-none transition-[border-color,box-shadow] duration-150 ' +
  'placeholder:text-slate focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 ' +
  'disabled:opacity-50 disabled:bg-cream';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftAddon, rightIcon, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-[12px] font-medium text-charcoal mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftAddon && (
            <span className="absolute start-3 top-1/2 -translate-y-1/2 select-none text-[13px] text-slate pointer-events-none">
              {leftAddon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            className={clsx(
              BASE,
              leftAddon  && 'ps-6',
              rightIcon  && 'pe-9',
              error      && 'border-error! focus:ring-error/10!',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p role="alert" className="mt-1 text-[11px] text-error">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, rows = 4, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-[12px] font-medium text-charcoal mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={!!error}
          className={clsx(BASE, 'resize-vertical', error && 'border-error! focus:ring-error/10!', className)}
          {...props}
        />
        {error && <p role="alert" className="mt-1 text-[11px] text-error">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }
>(({ label, error, className, children, id, ...props }, ref) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-[12px] font-medium text-charcoal mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={clsx(BASE, 'appearance-none cursor-pointer pe-8', error && 'border-error!', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={13}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none"
        />
      </div>
      {error && <p role="alert" className="mt-1 text-[11px] text-error">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';
