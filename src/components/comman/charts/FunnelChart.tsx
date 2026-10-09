import { CHART_COLORS } from './chartTheme';

export interface FunnelStep {
  label: string;
  value: number;
  color?: string;
}

export interface FunnelChartProps {
  steps:     FunnelStep[];
  title?:    string;
  subtitle?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

export function FunnelChart({
  steps,
  title,
  subtitle,
  valuePrefix = '',
  valueSuffix = '',
}: FunnelChartProps) {
  const ariaLabel = title ? `${title} chart` : 'Chart';

  if (!steps.length) {
    return (
      <div
        className="bg-white border border-bone rounded-[10px] px-5 py-5 flex items-center justify-center h-[200px]"
        role="img"
        aria-label={ariaLabel}
      >
        <p className="text-slate text-[13px]">No data yet</p>
      </div>
    );
  }

  const top    = steps[0].value;
  const minPct = 40;

  return (
    <div
      className="bg-white border border-bone rounded-[10px] px-5 py-5 transition-colors duration-200 hover:border-slate/30"
      role="img"
      aria-label={ariaLabel}
    >
      {(title || subtitle) && (
        <div className="mb-5">
          {title    && <p className="text-sm font-bold text-charcoal">{title}</p>}
          {subtitle && <p className="text-xs text-slate mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="flex flex-col items-center gap-0">
        {steps.map((step, i) => {
          const pct      = top > 0 ? (step.value / top) * 100 : 100;
          const barW     = Math.max(minPct, pct);
          const dropPct  = i > 0 && steps[i - 1].value > 0
            ? (((steps[i - 1].value - step.value) / steps[i - 1].value) * 100).toFixed(0)
            : null;
          const color    = step.color ?? CHART_COLORS[Math.min(i, CHART_COLORS.length - 1)];

          return (
            <div key={step.label} className="w-full flex flex-col items-center">
              {/* Drop-off connector */}
              {dropPct !== null && (
                <div className="flex items-center gap-2 py-[5px]">
                  <div className="h-px w-8 bg-bone" />
                  <span className="text-[12px] text-slate font-medium">−{dropPct}% drop</span>
                  <div className="h-px w-8 bg-bone" />
                </div>
              )}

              {/* Bar */}
              <div
                className="h-[42px] rounded-[6px] flex items-center justify-between px-4 transition-[width] duration-300"
                style={{ width: `${barW}%`, background: color }}
              >
                <span className="text-[12px] font-semibold text-white truncate pe-2">{step.label}</span>
                <span className="text-[13px] font-bold text-white shrink-0">
                  {valuePrefix}{step.value.toLocaleString()}{valueSuffix}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion rate summary */}
      {steps.length >= 2 && top > 0 && (
        <div className="mt-4 pt-4 border-t border-bone flex items-center justify-between">
          <span className="text-xs text-slate">Overall conversion</span>
          <span className="text-[13px] font-bold text-charcoal">
            {((steps[steps.length - 1].value / top) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
