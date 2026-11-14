import type { CategoryBreakdownRow } from '../../../domain/models';

export interface BreakdownTableProps {
  readonly title: string;
  readonly description: string;
  readonly rows: readonly CategoryBreakdownRow[];
  readonly totalLabel: string;
  readonly sortByValue?: boolean;
}

/**
 * Category breakdown rendered as a real table with an inline proportion bar,
 * so screen readers get the numbers directly. Suppressed cells show no bar.
 */
export function BreakdownTable({
  title,
  description,
  rows: inputRows,
  totalLabel,
  sortByValue = false,
}: BreakdownTableProps) {
  const rows = sortByValue
    ? [...inputRows].sort((a, b) => (b.metric.count ?? -1) - (a.metric.count ?? -1))
    : inputRows;
  const max = Math.max(1, ...rows.map((r) => r.metric.count ?? 0));
  return (
    <figure className="bg-white border border-[var(--color-border)] rounded-[14px] p-4 sm:p-5 space-y-3 m-0">
      <div>
        <h3 className="text-base font-bold text-[#0d4026]">{title}</h3>
        <figcaption className="text-xs text-[#495057] mt-0.5">{description}</figcaption>
      </div>
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-[#495057] text-left">
            <th scope="col" className="py-1.5 pr-3 font-bold">
              Group
            </th>
            <th scope="col" className="py-1.5 pr-3 font-bold w-1/2">
              <span className="sr-only">Proportion</span>
            </th>
            <th scope="col" className="py-1.5 text-right font-bold">
              {totalLabel}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eef3f0]">
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className="py-2 pr-3 text-left font-semibold text-[#242628]">
                {row.label}
              </th>
              <td className="py-2 pr-3" aria-hidden="true">
                {row.metric.count !== null && row.metric.count > 0 && (
                  <div className="h-2.5 rounded-r-[4px] bg-[var(--chart-series-1)]" style={{ width: `${(row.metric.count / max) * 100}%` }} />
                )}
              </td>
              <td className="py-2 text-right tabular-nums text-[#242628] whitespace-nowrap">
                {row.metric.isSuppressed ? (
                  <span className="text-[#495057]">{row.metric.displayLabel}</span>
                ) : (
                  <>
                    <strong>{row.metric.count}</strong>
                    {row.metric.percentage !== null && (
                      <span className="text-[#495057]"> ({row.metric.percentage}%)</span>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
