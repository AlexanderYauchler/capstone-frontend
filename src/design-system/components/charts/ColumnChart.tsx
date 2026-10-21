import { useId, useState } from 'react';
import { ChartFrame, axisTicks, niceAxisMax } from './chart-utils';

export interface ColumnDatum {
  readonly label: string;
  /** null means the value is suppressed for privacy and is not drawn. */
  readonly value: number | null;
  readonly tooltipDetail?: string;
}

export interface ColumnChartProps {
  readonly title: string;
  readonly description: string;
  readonly data: readonly ColumnDatum[];
  readonly yAxisLabel: string;
  readonly xAxisLabel: string;
  readonly unit: string;
  readonly highlightLabel?: string;
  readonly height?: number;
}

const WIDTH = 640;
const MARGIN = { top: 16, right: 12, bottom: 44, left: 48 };
const SERIES_COLOR = 'var(--chart-series-1)';

/**
 * Single-series column chart with per-column hover/focus tooltips and a table view.
 * Identity is named by the title, so no legend box is drawn.
 */
export function ColumnChart({
  title,
  description,
  data,
  yAxisLabel,
  xAxisLabel,
  unit,
  highlightLabel,
  height = 260,
}: ColumnChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const titleId = useId();
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const maxValue = niceAxisMax(Math.max(0, ...data.map((d) => d.value ?? 0)));
  const band = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = Math.min(24, band * 0.6);
  const ticks = axisTicks(maxValue);
  const labelEvery = Math.max(1, Math.ceil(data.length / 12));
  const hovered = hoverIndex !== null ? data[hoverIndex] : undefined;

  return (
    <ChartFrame
      titleId={titleId}
      title={title}
      description={description}
      tableHeaders={[xAxisLabel, `${yAxisLabel} (${unit})`]}
      tableRows={data.map((d) => [d.label, d.value === null ? 'Suppressed (<5)' : `${d.value}`])}
    >
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-labelledby={titleId}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {ticks.map((t) => {
            const y = MARGIN.top + plotHeight - (t / maxValue) * plotHeight;
            return (
              <g key={t}>
                <line
                  x1={MARGIN.left}
                  x2={WIDTH - MARGIN.right}
                  y1={y}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeWidth={1}
                />
                <text x={MARGIN.left - 8} y={y + 4} textAnchor="end" className="fill-[#495057] text-[11px]">
                  {t}
                </text>
              </g>
            );
          })}
          <text
            transform={`translate(12 ${MARGIN.top + plotHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-[#495057] text-[11px]"
          >
            {yAxisLabel}
          </text>

          {data.map((d, i) => {
            const x = MARGIN.left + band * i + (band - barWidth) / 2;
            const h = d.value === null ? 0 : (d.value / maxValue) * plotHeight;
            const y = MARGIN.top + plotHeight - h;
            const isHighlighted = highlightLabel === undefined || highlightLabel === d.label;
            const isHovered = hoverIndex === i;
            const r = Math.min(4, barWidth / 2, h);
            return (
              <g key={d.label}>
                {d.value !== null && h > 0 && (
                  <path
                    d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barWidth - r} Q${x + barWidth},${y} ${x + barWidth},${y + r} V${y + h} Z`}
                    fill={SERIES_COLOR}
                    opacity={isHovered ? 0.8 : isHighlighted ? 1 : 0.4}
                  />
                )}
                {d.value === null && (
                  <text
                    x={x + barWidth / 2}
                    y={MARGIN.top + plotHeight - 4}
                    textAnchor="middle"
                    className="fill-[#495057] text-[10px]"
                  >
                    &lt;5
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text
                    x={MARGIN.left + band * i + band / 2}
                    y={height - MARGIN.bottom + 16}
                    textAnchor="middle"
                    className={`text-[11px] ${highlightLabel === d.label ? 'fill-[#0d4026] font-bold' : 'fill-[#495057]'}`}
                  >
                    {d.label}
                  </text>
                )}
                <rect
                  x={MARGIN.left + band * i}
                  y={MARGIN.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              </g>
            );
          })}
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={MARGIN.top + plotHeight}
            y2={MARGIN.top + plotHeight}
            stroke="var(--chart-axis)"
            strokeWidth={1}
          />
          <text
            x={MARGIN.left + plotWidth / 2}
            y={height - 6}
            textAnchor="middle"
            className="fill-[#495057] text-[11px]"
          >
            {xAxisLabel}
          </text>
        </svg>

        {hovered && hoverIndex !== null && (
          <div
            role="presentation"
            className="pointer-events-none absolute top-1 z-10 rounded-[8px] bg-white border border-[var(--color-border)] shadow-md px-3 py-2 text-xs"
            style={{
              left: `${((MARGIN.left + band * hoverIndex + band / 2) / WIDTH) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="text-sm font-bold text-[#0d4026] tabular-nums">
              {hovered.value === null ? 'Suppressed (<5)' : `${hovered.value} ${unit}`}
            </p>
            <p className="text-[#495057]">{hovered.label}</p>
            {hovered.tooltipDetail && <p className="text-[#495057]">{hovered.tooltipDetail}</p>}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
