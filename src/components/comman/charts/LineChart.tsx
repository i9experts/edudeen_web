import {
  LineChart as RechartsLine, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { CHART_FONT, CHART_TICK, CHART_GRID, CHART_COLORS } from './chartTheme';

export interface LineSeries {
  dataKey: string;
  label:   string;
  color?:  string;
}

interface TooltipPayload { value: number; name: string; color: string }
interface MultiTooltipProps {
  active?:  boolean;
  payload?: TooltipPayload[];
  label?:   string;
  valuePrefix?: string;
  valueSuffix?: string;
}

function ChartTooltip({ active, payload, label, valuePrefix = '', valueSuffix = '' }: MultiTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-bone rounded-lg px-3 py-2 text-xs min-w-[120px]">
      <p className="text-slate mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-graphite">{p.name}</span>
          </span>
          <span className="font-bold text-charcoal">{valuePrefix}{p.value.toLocaleString()}{valueSuffix}</span>
        </div>
      ))}
    </div>
  );
}

export interface LineChartProps {
  data:         Record<string, unknown>[];
  lines:        LineSeries[];
  xKey?:        string;
  title?:       string;
  subtitle?:    string;
  height?:      number;
  valuePrefix?: string;
  valueSuffix?: string;
  yTickFormatter?: (v: number) => string;
  showLegend?:  boolean;
}

export function LineChart({
  data,
  lines,
  xKey = 'label',
  title,
  subtitle,
  height = 240,
  valuePrefix = '',
  valueSuffix = '',
  yTickFormatter,
  showLegend = true,
}: LineChartProps) {
  const defaultYFmt = (v: number) =>
    v >= 1000 ? `${valuePrefix}${(v / 1000).toFixed(0)}k` : `${valuePrefix}${v}`;
  const yFmt = yTickFormatter ?? defaultYFmt;
  const ariaLabel = title ? `${title} chart` : 'Chart';
  const hasValue = data.some(d => lines.some(line => Number(d[line.dataKey]) !== 0));

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
        <RechartsLine data={data} margin={{ top: 4, right: 20, left: 0, bottom: showLegend ? 0 : 4 }}>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis dataKey={xKey} tick={CHART_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} tickFormatter={yFmt} width={46} />
          <Tooltip content={<ChartTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />} />
          {showLegend && (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, fontFamily: CHART_FONT, color: '#8C8A82', paddingTop: 8 }}
            />
          )}
          {lines.map((line, i) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.label}
              stroke={hasValue ? (line.color ?? CHART_COLORS[i % CHART_COLORS.length]) : 'transparent'}
              strokeWidth={2.5}
              dot={false}
              activeDot={hasValue ? { r: 4, strokeWidth: 0 } : false}
            />
          ))}
        </RechartsLine>
      </ResponsiveContainer>
    </div>
  );
}
