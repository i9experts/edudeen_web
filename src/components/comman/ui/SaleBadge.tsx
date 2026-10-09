import { clsx } from 'clsx';

/** The one compact sale pill used on product cards and lists. Full campaign name belongs on the product page only. */
export function SaleBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={clsx('num inline-flex items-center text-[12px] font-bold leading-none px-2 py-[4px] rounded-full bg-error text-white whitespace-nowrap max-w-[70%] truncate', className)}>
      {label}
    </span>
  );
}