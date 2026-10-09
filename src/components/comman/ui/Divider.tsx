import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export function Divider({ className, my = 4 }: { className?: string; my?: number }) {
  return (
    <div
      className={clsx('h-px bg-bone', className)}
      style={{ marginBlock: `${my * 4}px` }}
    />
  );
}

interface TagProps {
  children:   ReactNode;
  onRemove?:  () => void;
  className?: string;
}

export function Tag({ children, onRemove, className }: TagProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md',
      'bg-brand-pale-orange text-brand-deep-orange text-[12px] font-medium border border-bone',
      className,
    )}>
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-brand-deep-orange opacity-60 hover:opacity-100 text-[13px] leading-none border-0 bg-transparent cursor-pointer p-0 ms-[1px]"
        >
          ×
        </button>
      )}
    </span>
  );
}
