import type { ReactNode } from 'react';

export interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly subtitle: string;
  readonly icon?: ReactNode;
  readonly accent?: 'emerald' | 'orange' | 'deep';
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  accent = 'emerald',
}: StatCardProps) {
  const topBorderClass =
    accent === 'orange'
      ? 'border-t-4 border-t-[#f26b21]'
      : accent === 'deep'
        ? 'border-t-4 border-t-[#0d4026]'
        : 'border-t-4 border-t-[#00783c]';

  return (
    <div
      className={`bg-white border border-[#056233]/30 ${topBorderClass} rounded-[10px] p-4 sm:p-5 flex flex-col justify-between gap-1.5 shadow-2xs`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-[#0d4026] tracking-tight">{label}</span>
        {icon && <span className="text-[#f26b21] shrink-0">{icon}</span>}
      </div>
      <span className="text-[30px] sm:text-[34px] font-bold font-display text-[#0d4026] tabular-nums leading-none my-0.5">
        {value}
      </span>
      <span className="text-xs font-medium text-[#495057]">{subtitle}</span>
    </div>
  );
}
