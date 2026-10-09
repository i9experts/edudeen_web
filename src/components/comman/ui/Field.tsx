import { cloneElement, isValidElement, useId, type ReactNode, type ReactElement } from 'react';
import { clsx } from 'clsx';

interface FieldProps {
  label:      string;
  required?:  boolean;
  hint?:      string;
  error?:     string;
  className?: string;
  children:   ReactNode;
}

export function Field({ label, required, hint, error, className, children }: FieldProps) {
  const generatedId = useId();
  const descId       = useId();
  const hasDescription = !!(hint || error);
  const existingId = isValidElement(children) ? (children.props as { id?: string }).id : undefined;
  const finalId    = existingId ?? generatedId;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, {
        id: finalId,
        ...(hasDescription ? { 'aria-describedby': descId } : {}),
      })
    : children;

  return (
    <div className={clsx('mb-[14px]', className)}>
      <label htmlFor={finalId} className="block text-[12px] font-medium text-charcoal mb-[5px]">
        {label}
        {required && <span className="text-brand-orange ms-[2px]"> *</span>}
      </label>
      {control}
      {hint && !error && (
        <p id={descId} className="mt-1 text-[12px] text-slate">{hint}</p>
      )}
      {error && (
        <p id={descId} className="mt-1 text-[12px] text-error">{error}</p>
      )}
    </div>
  );
}
