import {
  BarChart as RechartsBar, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { CHART_TICK, CHART_GRID, CHART_DEFAULT_COLOR } from './chartTheme';

interface TooltipPayload { value: number }
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

function ChartTooltip({ active, payload, label, valuePrefix = '', valueSuffix = '' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-bone rounded-lg px-3 py-[6px] text-xs">
      <p className="text-slate mb-0.5">{label}</p>
      <p className="font-bold text-charcoal">{valuePrefix}{payload[0].value.toLocaleString()}{valueSuffix}</p>
    </div>
  );
}

export interface BarChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  title?: string;
  subtitle?: string;
  height?: number;
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  maxBarSize?: number;
  yTickFormatter?: (v: number) => string;
  /** false = whole-number y ticks only (counts such as orders). */
  allowDecimals?: boolean;
}

export function BarChart({
  data,
  dataKey,
  xKey = 'label',
  title,
  subtitle,
  height = 220,
  color = CHART_DEFAULT_COLOR,
  valuePrefix = '',
  valueSuffix = '',
  maxBarSize = 40,
  yTickFormatter,
  allowDecimals = true,
}: BarChartProps) {
  const defaultYFmt = (v: number) =>
    v >= 1000 ? `${valuePrefix}${(v / 1000).toFixed(0)}k` : `${valuePrefix}${v}`;
  const yFmt = yTickFormatter ?? defaultYFmt;
  const ariaLabel = title ? `${title} chart` : 'Chart';
  const hasValue = data.some(d => Number(d[dataKey]) !== 0);

  if (!data.length) {
    return (
      <div
        className="bg-white border border-bone rounded-[10px] flex items-center justify-center"
        style={{ height: height + (title || subtitle ? 56 : 0) }}
        role="img"
        aria-label={ariaLabel}
      >
        <p className="text-slate text-[13px]">No data yet</p>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-bone rounded-[10px] transition-colors duration-200 hover:border-slate/30"
      role="img"
      aria-label={ariaLabel}
    >
      {(title || subtitle) && (
        <div className="px-5 pt-4 pb-2">
          {title    && <p className="text-sm font-bold text-charcoal">{title}</p>}
          {subtitle && <p className="text-xs text-slate mt-0.5">{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBar data={data} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis dataKey={xKey}  tick={CHART_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} tickFormatter={yFmt} width={40} allowDecimals={allowDecimals} />
          <Tooltip content={<ChartTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />} />
          <Bar dataKey={dataKey} fill={hasValue ? color : 'transparent'} radius={[4, 4, 0, 0]} maxBarSize={maxBarSize} />
        </RechartsBar>
      </ResponsiveContainer>
    </div>
  );
}
