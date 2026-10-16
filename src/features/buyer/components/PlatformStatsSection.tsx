import { BadgeCheck, Banknote, ShieldCheck } from 'lucide-react';
import { RevealStagger } from '@/components/comman/motion/Reveal';
import { AnimatedCounter } from '@/components/comman/motion/AnimatedCounter';
import { SkeletonBox } from '@/components/comman/ui';
import { usePlatformTrust } from '@/hooks/usePlatformTrust';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * The ONE stats block of the homepage. Real numbers appear only once the platform is past the admin's
 * thresholds (Admin -> Platform Config -> Homepage content -> Homepage numbers); before that it shows
 * plain trust points instead, so a young marketplace never advertises "6+ sellers".
 */
export function PlatformStatsSection({ className = 'mb-12' }: { className?: string }) {
  const { loading, showNumbers, items, codAvailable } = usePlatformTrust();

  if (loading) {
    return (
      <section className={`${className} rounded-[14px] border border-bone px-5 py-8 md:py-10`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <SkeletonBox width={70} height={32} className="mb-2 mx-auto" />
              <SkeletonBox width={90} height={13} className="mx-auto" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (showNumbers && items.length > 0) {
    return (
      <section className={`${className} rounded-[14px] border border-bone px-5 py-8 md:py-10`}>
        <RevealStagger className={`grid grid-cols-2 ${items.length >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-6 justify-items-center`} step={0.08} y={14}>
          {items.map(s => (
            <div key={s.key} className="text-center">
              <AnimatedCounter
                value={s.value}
                format={s.key === 'rating' ? (n => `${n.toFixed(1)} ★`) : (n => `${compact.format(Math.round(n))}+`)}
                className="block font-serif text-[34px] text-carbon"
              />
              <p className="text-[13px] text-slate mt-1">{s.label}</p>
            </div>
          ))}
        </RevealStagger>
      </section>
    );
  }

  const points = [
    { Icon: BadgeCheck, title: 'Verified sellers', sub: 'Every store is reviewed by our team' },
    ...(codAvailable ? [{ Icon: Banknote, title: 'Cash on delivery', sub: 'Pay when your order arrives' }] : []),
    { Icon: ShieldCheck, title: 'Secure checkout', sub: 'Payments handled by Edudeen' },
  ];
  return (
    <section className={`${className} rounded-[14px] border border-bone px-5 py-7 md:py-8`}>
      <ul className={`m-0 p-0 list-none grid grid-cols-1 ${points.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-5 justify-items-center`}>
        {points.map(({ Icon, title, sub }) => (
          <li key={title} className="flex items-center gap-3 text-start">
            <span className="size-10 shrink-0 rounded-full bg-brand-pale-orange flex items-center justify-center"><Icon size={18} className="text-brand-royal" /></span>
            <span>
              <span className="block text-[14px] font-bold text-carbon leading-tight">{title}</span>
              <span className="block text-[12px] text-slate mt-[2px]">{sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}