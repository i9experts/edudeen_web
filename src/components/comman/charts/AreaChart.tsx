import type { ReactNode } from 'react';
import {
  AreaChart as RechartsArea, Area,
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

export interface AreaChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  height?: number;
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  yTickFormatter?: (v: number) => string;
}

export function AreaChart({
  data,
  dataKey,
  xKey = 'label',
  title,
  subtitle,
  action,
  height = 220,
  color = CHART_DEFAULT_COLOR,
  valuePrefix = '',
  valueSuffix = '',
  yTickFormatter,
}: AreaChartProps) {
  const gradId = `area-grad-${dataKey}`;
  const defaultYFmt = (v: number) =>
    v >= 1000 ? `${valuePrefix}${(v / 1000).toFixed(0)}k` : `${valuePrefix}${v}`;
  const yFmt = yTickFormatter ?? defaultYFmt;
  const ariaLabel = title ? `${title} chart` : 'Chart';
  const hasValue = data.some(d => Number(d[dataKey]) !== 0);

  if (!data.length) {
    return (
      <div
        className="bg-white border border-bone rounded-[10px] flex items-center justify-center"
        style={{ height: height + (title || subtitle || action ? 56 : 0) }}
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
      {(title || subtitle || action) && (
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div>
            {title    && <p className="text-sm font-bold text-charcoal">{title}</p>}
            {subtitle && <p className="text-xs text-slate mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="px-3 pb-4">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsArea data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.22} />
              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid {...CHART_GRID} vertical={false} />
          <XAxis dataKey={xKey}  tick={CHART_TICK} axisLine={false} tickLine={false} />
          {/* 10% headroom so the line never clips above the plot */}
          <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} tickFormatter={yFmt} width={46} domain={[0, (max: number) => Math.ceil(max * 1.1)]} />
          <Tooltip content={<ChartTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={hasValue ? color : 'transparent'}
            strokeWidth={2.5}
            fill={hasValue ? `url(#${gradId})` : 'transparent'}
            dot={false}
            activeDot={hasValue ? { r: 4, fill: color, strokeWidth: 0 } : false}
          />
        </RechartsArea>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
