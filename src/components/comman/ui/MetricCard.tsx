import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './Card';
import { SkeletonBox } from './SkeletonBox';
import { SparkLine } from '@/components/comman/charts';

interface MetricCardProps {
  label:    string;
  value:    string | number;
  trend?:   string;
  trendUp?: boolean;
  sub?:     string;
  icon?:    ReactNode;
  loading?: boolean;
  /** Overrides the default brand-orange icon background/foreground color. */
  color?:   string;
  /** Optional trend series (e.g. the same data already powering the page's main chart) rendered as a small sparkline. Omit if no matching series exists — never fabricate one. */
  sparkline?: number[];
  /** Compact horizontal strip layout (icon + label/value on one row, sans numerals) for dense dashboards. */
  compact?: boolean;
}

export function MetricCard({ label, value, trend, trendUp, sub, icon, loading, color, sparkline, compact }: MetricCardProps) {
  if (loading) {
    return (
      <Card className="flex-1 min-w-[140px]">
        <SkeletonBox height={9} width={36} rounded="4px" className="mb-3" />
        <SkeletonBox height={11} width="60%" rounded="4px" className="mb-3" />
        <SkeletonBox height={26} width="80%" rounded="6px" className="mb-2" />
        <SkeletonBox height={12} width="40%" rounded="4px" />
      </Card>
    );
  }

  const accent = color ?? '#174771';

  if (compact) {
    return (
      <Card className="flex-1 min-w-[150px]" padding="none">
        <div className="px-4 py-3 flex items-center gap-3">
          {icon && (
            <div
              className={color ? 'w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0' : 'w-8 h-8 rounded-[9px] bg-brand-pale-orange flex items-center justify-center text-brand-orange shrink-0'}
              style={color ? { background: `18`, color } : undefined}
            >{icon}</div>
          )}
          <div className="min-w-0">
            <p className="text-[12px] text-slate truncate" title={label}>{label}</p>
            <p className="num text-[20px] font-semibold text-carbon leading-[1.2]">{value}</p>
            {(trend || sub) && (
              <p className={`text-[12px] num ${trend ? (trendUp ? 'text-success' : 'text-error') : 'text-slate'}`}>{trend ?? sub}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="metric-card-enter flex-1 min-w-[140px] group" padding="none" hover>
      <div className="px-5 py-5 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-3">
          {icon && (
            <div
              className={color ? 'w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105' : 'w-9 h-9 rounded-[10px] bg-brand-pale-orange flex items-center justify-center text-brand-orange shrink-0 transition-transform duration-200 group-hover:scale-105'}
              style={color ? { background: `${color}18`, color } : undefined}
            >
              {icon}
            </div>
          )}
          {sparkline && sparkline.length > 1 && (
            <div className="opacity-70 group-hover:opacity-100 transition-opacity duration-200">
              <SparkLine data={sparkline} color={accent} width={64} height={28} showTooltip={false} />
            </div>
          )}
        </div>
        <p className="text-[13px] sm:text-[14px] text-carbon mb-2">
          {label}
        </p>
        <p className="num font-serif text-[28px] sm:text-[32px] font-normal text-carbon leading-[1.1]">
          {value}
        </p>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-[12px] num font-semibold mt-[7px] px-[7px] py-[2px] rounded-full ${trendUp ? 'text-success bg-success-bg' : 'text-error bg-error-bg'}`}>
            {trendUp
              ? <TrendingUp  size={12} className="shrink-0" />
              : <TrendingDown size={12} className="shrink-0" />}
            {trend}
          </span>
        )}
        {sub && (
          <p className="text-[12px] text-slate mt-[7px]">{sub}</p>
        )}
      </div>
    </Card>
  );
}

/** Phase 2 name: StatCard is the compact use of MetricCard. */
export const StatCard = (props: MetricCardProps) => <MetricCard compact {...props} />;

/** Horizontal strip of StatCards; scrolls sideways on phones. */
export function StatStrip({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">{children}</div>;
}
