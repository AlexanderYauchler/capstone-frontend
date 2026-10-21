/* eslint-disable react-refresh/only-export-components */
import { useId, useState, type ReactNode } from 'react';
import { Table2 } from 'lucide-react';

/** Rounds an axis maximum up to a clean value (1, 2, 2.5, 5 × 10ⁿ). */
export function niceAxisMax(value: number): number {
  if (value <= 0) return 4;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * base) return step * base;
  }
  return 10 * base;
}

export interface ChartFrameProps {
  readonly titleId: string;
  readonly title: string;
  readonly description: string;
  readonly legend?: ReactNode;
  readonly tableHeaders: readonly string[];
  readonly tableRows: ReadonlyArray<readonly string[]>;
  readonly children: ReactNode;
}

/**
 * Shared chart card: title, plain-language description, optional legend,
 * and a "Show data table" toggle so every value is reachable without hover.
 */
export function ChartFrame({
  titleId,
  title,
  description,
  legend,
  tableHeaders,
  tableRows,
  children,
}: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    <figure className="bg-white border border-[var(--color-border)] rounded-[14px] p-4 sm:p-5 space-y-3 m-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={titleId} className="text-base font-bold text-[#0d4026]">
            {title}
          </h3>
          <figcaption className="text-xs text-[#495057] mt-0.5">{description}</figcaption>
        </div>
        <button
          type="button"
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00783c] hover:text-[#0d4026] px-2.5 py-1.5 rounded-[8px] border border-[#cde0d4] bg-[#edf5f0] hover:bg-[#dfeee5] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b]"
        >
          <Table2 className="w-3.5 h-3.5" aria-hidden="true" />
          {showTable ? 'Hide data table' : 'Show data table'}
        </button>
      </div>
      {legend}
      {children}
      <div id={tableId} hidden={!showTable} className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <caption className="sr-only">{title} data</caption>
          <thead>
            <tr className="bg-[#edf5f0] text-[#0d4026]">
              {tableHeaders.map((h) => (
                <th key={h} scope="col" className="py-2 px-3 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4ece7]">
            {tableRows.map((row) => (
              <tr key={row.join('|')}>
                {row.map((cell, i) => (
                  <td key={`${i}-${cell}`} className="py-1.5 px-3 tabular-nums text-[#242628]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
