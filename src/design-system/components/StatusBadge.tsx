import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  XOctagon,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success' | 'teal';

export interface StatusBadgeProps {
  readonly tone?: BadgeTone;
  readonly children: ReactNode;
  readonly showIcon?: boolean;
  readonly className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral:
    'bg-[#f2f5f3] text-[#242628] border-[#cde0d4]',
  info: 'bg-[#edf5f0] text-[#0d4026] border-[#9ad0b3]',
  warning:
    'bg-[#feede0] text-[#9a4406] border-[#f7be97]',
  danger:
    'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
  success:
    'bg-[#e8f4ed] text-[#00783c] border-[#8bc9a8]',
  teal: 'bg-[#e8f3ee] text-[#02754b] border-[#a5d3bd]',
};

function renderToneIcon(tone: BadgeTone) {
  switch (tone) {
    case 'success':
      return <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#f26b21]" aria-hidden="true" />;
    case 'danger':
      return <XOctagon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'info':
      return <Clock className="w-3.5 h-3.5 shrink-0 text-[#00783c]" aria-hidden="true" />;
    case 'teal':
    case 'neutral':
      return <Info className="w-3.5 h-3.5 shrink-0 text-[#02754b]" aria-hidden="true" />;
  }
}

export function StatusBadge({
  tone = 'neutral',
  children,
  showIcon = true,
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showIcon && renderToneIcon(tone)}
      <span>{children}</span>
    </span>
  );
}
