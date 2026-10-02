import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_FONT, CHART_COLORS } from './chartTheme';

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

interface TooltipPayload { name: string; value: number; payload: DonutSegment }
interface CustomTooltipProps {
  active?:  boolean;
  payload?: TooltipPayload[];
  total:    number;
}

function ChartTooltip({ active, payload, total }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const seg = payload[0];
  const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0';
  return (
    <div className="bg-white border border-bone rounded-lg px-3 py-[6px] text-xs">
      <p className="text-slate mb-0.5">{seg.name}</p>
      <p className="font-bold text-charcoal">{seg.value.toLocaleString()} <span className="font-normal text-slate">({pct}%)</span></p>
    </div>
  );
}

export interface DonutChartProps {
  data:        DonutSegment[];
  title?:      string;
  subtitle?:   string;
  size?:       number;
  innerRadius?: number;
  showLegend?: boolean;
  centerLabel?: string;
}

export function DonutChart({
  data,
  title,
  subtitle,
  size = 200,
  innerRadius,
  showLegend = true,
  centerLabel,
}: DonutChartProps) {
  const total    = data.reduce((s, d) => s + d.value, 0);
  const ir       = innerRadius ?? Math.round(size * 0.33);
  const or       = Math.round(size * 0.47);
  const segments = data.map((d, i) => ({ ...d, color: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }));
  const ariaLabel = title ? `${title} chart` : 'Chart';

  if (!data.length) {
    return (
      <div
        className="bg-white border border-bone rounded-[10px] px-5 py-5 flex items-center justify-center"
        style={{ height: size + (title || subtitle ? 40 : 0) }}
        role="img"
        aria-label={ariaLabel}
      >
        <p className="text-slate text-[13px]">No data yet</p>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-bone rounded-[10px] px-5 py-5 transition-colors duration-200 hover:border-slate/30"
      role="img"
      aria-label={ariaLabel}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title    && <p className="text-sm font-bold text-charcoal">{title}</p>}
          {subtitle && <p className="text-xs text-slate mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={ir}
                outerRadius={or}
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                {segments.map((seg, i) => (
                  <Cell key={i} fill={seg.color} />
                ))}
              </Pie>
              <Tooltip
                content={<ChartTooltip total={total} />}
                wrapperStyle={{ fontFamily: CHART_FONT }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          {centerLabel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[11px] text-slate">{centerLabel}</p>
              <p className="text-[18px] font-bold text-charcoal leading-[1.2]">{total.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-col gap-[10px] min-w-0">
            {segments.map(seg => {
              const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0';
              return (
                <div key={seg.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                  <span className="text-[12px] text-graphite flex-1 truncate">{seg.label}</span>
                  <span className="text-[12px] font-semibold text-charcoal ms-2">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
