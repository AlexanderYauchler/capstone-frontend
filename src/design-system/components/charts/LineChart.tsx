import { useId, useState } from 'react';
import { ChartFrame, axisTicks, niceAxisMax } from './chart-utils';

export interface LineSeries {
  readonly name: string;
  readonly color: string;
  readonly values: readonly number[];
}

export interface LineChartProps {
  readonly title: string;
  readonly description: string;
  readonly categories: readonly string[];
  readonly series: readonly LineSeries[];
  readonly yAxisLabel: string;
  readonly xAxisLabel: string;
  readonly unit: string;
  readonly highlightIndex?: number;
  readonly height?: number;
}

const WIDTH = 640;
const MARGIN = { top: 16, right: 24, bottom: 44, left: 48 };

/**
 * Multi-series line chart with a snapping crosshair tooltip that lists every
 * series at the hovered position, a legend, and a table view.
 */
export function LineChart({
  title,
  description,
  categories,
  series,
  yAxisLabel,
  xAxisLabel,
  unit,
  highlightIndex,
  height = 280,
}: LineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const titleId = useId();
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const maxValue = niceAxisMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const step = categories.length > 1 ? plotWidth / (categories.length - 1) : plotWidth;
  const xAt = (i: number) => MARGIN.left + (categories.length > 1 ? step * i : plotWidth / 2);
  const yAt = (v: number) => MARGIN.top + plotHeight - (v / maxValue) * plotHeight;
  const ticks = axisTicks(maxValue);

  const legend = (
    <ul className="flex flex-wrap items-center gap-4 text-xs text-[#242628]" aria-label="Legend">
      {series.map((s) => (
        <li key={s.name} className="inline-flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="1" x2="17" y1="4" y2="4" stroke={s.color} strokeWidth={2} strokeLinecap="round" />
          </svg>
          {s.name}
        </li>
      ))}
    </ul>
  );

  return (
    <ChartFrame
      titleId={titleId}
      title={title}
      description={description}
      legend={legend}
      tableHeaders={[xAxisLabel, ...series.map((s) => `${s.name} (${unit})`)]}
      tableRows={categories.map((c, i) => [c, ...series.map((s) => `${s.values[i] ?? 0}`)])}
    >
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-labelledby={titleId}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {highlightIndex !== undefined && highlightIndex >= 0 && (
            <rect
              x={xAt(highlightIndex) - Math.min(18, step / 2)}
              y={MARGIN.top}
              width={Math.min(36, step)}
              height={plotHeight}
              fill="var(--chart-highlight)"
            />
          )}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={yAt(t)}
                y2={yAt(t)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <text x={MARGIN.left - 8} y={yAt(t) + 4} textAnchor="end" className="fill-[#495057] text-[11px]">
                {t}
              </text>
            </g>
          ))}
          <text
            transform={`translate(12 ${MARGIN.top + plotHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-[#495057] text-[11px]"
          >
            {yAxisLabel}
          </text>
          {categories.map((c, i) => (
            <text
              key={c}
              x={xAt(i)}
              y={height - MARGIN.bottom + 16}
              textAnchor="middle"
              className={`text-[11px] ${highlightIndex === i ? 'fill-[#0d4026] font-bold' : 'fill-[#495057]'}`}
            >
              {c}
            </text>
          ))}
          <text x={MARGIN.left + plotWidth / 2} y={height - 6} textAnchor="middle" className="fill-[#495057] text-[11px]">
            {xAxisLabel}
          </text>

          {hoverIndex !== null && (
            <line
              x1={xAt(hoverIndex)}
              x2={xAt(hoverIndex)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotHeight}
              stroke="var(--chart-axis)"
              strokeWidth={1}
            />
          )}

          {series.map((s) => (
            <g key={s.name}>
              <polyline
                points={s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.values.map((v, i) => (
                <circle
                  key={`${s.name}-${categories[i]}`}
                  cx={xAt(i)}
                  cy={yAt(v)}
                  r={hoverIndex === i || highlightIndex === i ? 5 : 4}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </g>
          ))}

          {categories.map((c, i) => (
            <rect
              key={`hit-${c}`}
              x={xAt(i) - step / 2}
              y={MARGIN.top}
              width={step}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={MARGIN.top + plotHeight}
            y2={MARGIN.top + plotHeight}
            stroke="var(--chart-axis)"
            strokeWidth={1}
          />
        </svg>

        {hoverIndex !== null && (
          <div
            role="presentation"
            className="pointer-events-none absolute top-1 z-10 rounded-[8px] bg-white border border-[var(--color-border)] shadow-md px-3 py-2 text-xs min-w-[150px]"
            style={{
              left: `${(xAt(hoverIndex) / WIDTH) * 100}%`,
              transform: hoverIndex > categories.length / 2 ? 'translateX(-105%)' : 'translateX(5%)',
            }}
          >
            <p className="text-[#495057] mb-1">{categories[hoverIndex]}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center gap-2">
                <svg width="12" height="6" aria-hidden="true">
                  <line x1="1" x2="11" y1="3" y2="3" stroke={s.color} strokeWidth={2} />
                </svg>
                <strong className="text-sm text-[#0d4026] tabular-nums">
                  {s.values[hoverIndex] ?? 0}
                </strong>
                <span className="text-[#495057]">{s.name}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
