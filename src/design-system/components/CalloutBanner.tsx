import { AlertTriangle, CheckCircle2, Info, XOctagon } from 'lucide-react';
import type { ReactNode } from 'react';

export type CalloutTone = 'info' | 'warning' | 'success' | 'danger' | 'teal' | 'emerald';

export interface CalloutBannerProps {
  readonly tone?: CalloutTone;
  readonly title: string;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly role?: 'status' | 'alert';
}

const TONE_STYLES: Record<CalloutTone, string> = {
  info: 'bg-[#edf5f0] border-[#056233]/30 text-[#0d4026]',
  teal: 'bg-[#e8f3ee] border-[#02754b]/35 text-[#0d4026]',
  warning: 'bg-[#feede0] border-[#f26b21]/45 text-[#0d4026]',
  success: 'bg-[#e8f4ed] border-[#00783c]/40 text-[#0d4026]',
  danger: 'bg-[var(--color-danger-soft)] border-[var(--color-danger-border)] text-[var(--color-danger)]',
  emerald: 'bg-[#00783c] border-[#00783c] text-white relative overflow-hidden',
};

function renderCalloutIcon(tone: CalloutTone) {
  switch (tone) {
    case 'warning':
      return <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#f26b21]" aria-hidden="true" />;
    case 'danger':
      return <XOctagon className="w-5 h-5 shrink-0 mt-0.5 text-[var(--color-danger)]" aria-hidden="true" />;
    case 'success':
      return <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#00783c]" aria-hidden="true" />;
    case 'emerald':
      return <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#7dc242]" aria-hidden="true" />;
    case 'info':
    case 'teal':
      return <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#00783c]" aria-hidden="true" />;
  }
}

export function CalloutBanner({
  tone = 'info',
  title,
  description,
  action,
  role = 'status',
}: CalloutBannerProps) {
  return (
    <div
      role={role}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[16px] border px-6 py-5 ${TONE_STYLES[tone]}`}
    >
      {tone === 'emerald' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 w-64 h-64 rounded-full border-[28px] border-white/12"
        />
      )}
      <div className="flex items-start gap-3.5 relative z-10">
        {renderCalloutIcon(tone)}
        <div>
          <p className="font-bold text-[16px] leading-snug font-display">{title}</p>
          {description && (
            <p className="text-[13.5px] mt-1 opacity-95 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0 relative z-10">{action}</div>}
    </div>
  );
}
