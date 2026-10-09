import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_DEFAULT_COLOR } from './chartTheme';

interface TooltipPayload { value: number }
interface SparkTooltipProps {
  active?:      boolean;
  payload?:     TooltipPayload[];
  valuePrefix?: string;
  valueSuffix?: string;
}

function SparkTooltip({ active, payload, valuePrefix = '', valueSuffix = '' }: SparkTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-bone rounded-md px-2 py-1 text-[12px]">
      <span className="font-bold text-charcoal">{valuePrefix}{payload[0].value.toLocaleString()}{valueSuffix}</span>
    </div>
  );
}

export interface SparkLineProps {
  data:         number[];
  color?:       string;
  width?:       number;
  height?:      number;
  valuePrefix?: string;
  valueSuffix?: string;
  showTooltip?: boolean;
}

export function SparkLine({
  data,
  color = CHART_DEFAULT_COLOR,
  width = 80,
  height = 36,
  valuePrefix = '',
  valueSuffix = '',
  showTooltip = true,
}: SparkLineProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  const hasValue = data.some(v => v !== 0);
  const lineColor = hasValue ? color : '#D8D5CC';
  const gradId = `spark-grad-${lineColor.replace('#', '')}`;

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height }}
        role="img"
        aria-label="Chart"
      >
        <p className="text-slate text-[13px]">No data yet</p>
      </div>
    );
  }

  return (
    <div style={{ width, height }} role="img" aria-label="Chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0}   />
            </linearGradient>
          </defs>
          {showTooltip && (
            <Tooltip
              content={<SparkTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />}
              cursor={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="v"
            stroke={lineColor}
            strokeWidth={1.8}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
