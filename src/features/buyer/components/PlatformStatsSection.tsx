import { RevealStagger } from '@/components/comman/motion/Reveal';
import { AnimatedCounter } from '@/components/comman/motion/AnimatedCounter';
import { usePlatformTrust } from '@/hooks/usePlatformTrust';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * The homepage numbers block. Real numbers appear only once the platform is past the admin's thresholds
 * (Admin -> Platform Config -> Homepage content -> Homepage numbers); before that this renders NOTHING, so a
 * young marketplace never advertises "6+ sellers". The plain trust points live in `HomeTrustBar` under the hero.
 */
export function PlatformStatsSection({ className = 'mb-12' }: { className?: string }) {
  const { loading, showNumbers, items } = usePlatformTrust();
  if (loading || !showNumbers || items.length === 0) return null;
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
