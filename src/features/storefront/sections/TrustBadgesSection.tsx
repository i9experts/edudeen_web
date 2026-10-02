import { Truck, ShieldCheck, RefreshCw, Headset, Lock, type LucideIcon } from 'lucide-react';
import { useStorefront } from '../StorefrontContext';

interface TrustBadgeBlock {
  icon: 'truck' | 'shield' | 'refresh' | 'headset' | 'lock';
  text: string;
}

const ICON_MAP: Record<TrustBadgeBlock['icon'], LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  refresh: RefreshCw,
  headset: Headset,
  lock: Lock,
};

// Same visual idea as the platform-wide `TrustServiceStrip` (marketplace-only,
// not seller-composable) but a genuinely seller-authored storefront section —
// icon choice from a small fixed allow-list (validated server-side), text is
// the seller's own.
export function TrustBadgesSection({ blocks }: { settings: Record<string, any>; blocks: TrustBadgeBlock[] }) {
  const { cfg } = useStorefront();
  if (blocks.length === 0) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-10" style={{ paddingTop: 28 * cfg.sectionSpacingScale, paddingBottom: 28 * cfg.sectionSpacingScale }}>
      <div
        className="mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        style={{ maxWidth: Math.round(1100 * cfg.containerWidthScale) }}
      >
        {blocks.map((item, i) => {
          const Icon = ICON_MAP[item.icon] ?? ShieldCheck;
          return (
            <div key={i} className="flex flex-col items-center text-center gap-2 sm:flex-row sm:text-start sm:gap-3">
              <span
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `${cfg.primaryColor}15`, color: cfg.primaryColor }}
              >
                <Icon size={18} />
              </span>
              <span className="text-[13px] font-medium leading-snug" style={{ color: cfg.textColor }}>{item.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
