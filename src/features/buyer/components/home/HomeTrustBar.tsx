import { Link } from 'react-router-dom';
import { Banknote, LifeBuoy, RotateCcw, ShieldCheck, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { usePlatformTrust } from '@/hooks/usePlatformTrust';

interface Item { key: string; Icon: LucideIcon; title: string; sub: string; to?: string }

/**
 * ONE compact trust row directly under the hero. Only claims that are true today: checkout is handled by Edudeen,
 * COD only when a store really offers it (`commerce.codAvailable`), and the refund / support pages exist.
 * Phones: one swipeable row (snap), mirrored automatically in RTL.
 */
export function HomeTrustBar({ className }: { className?: string }) {
  const { codAvailable } = usePlatformTrust();
  const items: Item[] = [
    { key: 'secure', Icon: ShieldCheck, title: 'Secure checkout', sub: 'Payments handled by Edudeen' },
    ...(codAvailable ? [{ key: 'cod', Icon: Banknote, title: 'Cash on delivery', sub: 'Pay when your order arrives' }] : []),
    { key: 'refunds', Icon: RotateCcw, title: 'Refunds & returns', sub: 'See how it works', to: '/returns' },
    { key: 'support', Icon: LifeBuoy, title: 'Contact support', sub: 'We reply by e-mail', to: '/contact-us' },
  ];
  return (
    <section aria-label="Why shop on Edudeen" className={className}>
      <ul
        className={clsx(
          'm-0 p-0 list-none flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide',
          'md:grid md:overflow-visible md:snap-none',
          items.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3',
        )}
      >
        {items.map(({ key, Icon, title, sub, to }) => {
          const body = (
            <>
              <span className="size-9 shrink-0 rounded-full bg-brand-pale-orange flex items-center justify-center"><Icon size={17} className="text-brand-royal" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-carbon leading-tight">{title}</span>
                <span className="block text-[12px] text-slate leading-tight mt-[2px] truncate">{sub}</span>
              </span>
            </>
          );
          const box = 'flex items-center gap-3 min-h-[52px] rounded-xl border border-bone bg-white px-3 py-2 no-underline';
          return (
            <li key={key} className="shrink-0 snap-start w-[min(78vw,260px)] md:w-auto md:shrink">
              {to
                ? <Link to={to} className={clsx(box, 'hover:border-brand-royal/40')}>{body}</Link>
                : <div className={box}>{body}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
