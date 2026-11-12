import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

export type StatComparisonTone = 'good' | 'bad' | 'neutral';

export interface StatComparison {
  /** Direction of the change; drives the arrow icon (never colour alone). */
  readonly direction: 'up' | 'down' | 'flat';
  /** Plain-language text, e.g. "3 more than August". */
  readonly text: string;
  /** Whether this change is good news, bad news, or just informational. */
  readonly tone?: StatComparisonTone;
}

export interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly subtitle: string;
  readonly icon?: ReactNode;
  readonly accent?: 'emerald' | 'orange' | 'deep';
  readonly comparison?: StatComparison;
}

const ACCENT_BAR: Record<NonNullable<StatCardProps['accent']>, string> = {
  emerald: 'border-t-[#00783c]',
  deep: 'border-t-[#0d4026]',
  orange: 'border-t-[#f26b21]',
};

const COMPARISON_TONE: Record<StatComparisonTone, string> = {
  good: 'text-[#00783c]',
  bad: 'text-[#9a4406]',
  neutral: 'text-[#495057]',
};

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  accent = 'emerald',
  comparison,
}: StatCardProps) {
  const ComparisonIcon =
    comparison?.direction === 'up' ? ArrowUp : comparison?.direction === 'down' ? ArrowDown : Minus;

  return (
    <div
      className={`bg-white border border-[var(--color-border)] border-t-4 ${ACCENT_BAR[accent]} rounded-[12px] p-4 sm:p-5 flex flex-col gap-2 shadow-2xs`}
    >
      <div className="flex items-center gap-2 text-[#0d4026]">
        {icon && (
          <span
            aria-hidden="true"
            className="w-7 h-7 shrink-0 rounded-full bg-[#edf5f0] text-[#00783c] flex items-center justify-center"
          >
            {icon}
          </span>
        )}
        <span className="text-sm font-bold leading-tight">{label}</span>
      </div>
      <span className="text-[34px] sm:text-4xl font-bold font-display text-[#0d4026] tabular-nums leading-none">
        {value}
      </span>
      <span className="text-sm text-[#495057] leading-snug">{subtitle}</span>
      {comparison && (
        <span
          className={`inline-flex items-center gap-1 text-sm font-semibold ${COMPARISON_TONE[comparison.tone ?? 'neutral']}`}
        >
          <ComparisonIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
          {comparison.text}
        </span>
      )}
    </div>
  );
}
