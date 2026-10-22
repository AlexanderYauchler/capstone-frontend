import type { HTMLAttributes, ReactNode } from 'react';

export type CardTone = 'default' | 'parkview' | 'peach' | 'mint' | 'elevated';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly padding?: 'none' | 'sm' | 'md' | 'lg';
  readonly tone?: CardTone;
}

const PADDING_MAP = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

const TONE_MAP: Record<CardTone, string> = {
  default: 'bg-white border border-[var(--color-border)] rounded-[14px] shadow-2xs',
  parkview: 'bg-white border border-[#056233]/75 rounded-[6px]',
  peach: 'bg-[#feede0] border border-[#fcd3ba] rounded-[14px]',
  mint: 'bg-[#edf5f0] border border-[#cde0d4] rounded-[14px]',
  elevated:
    'bg-white border border-[#dce6e1] rounded-[16px] shadow-[0_14px_34px_-12px_rgba(13,64,38,0.14)]',
};

export function Card({
  children,
  padding = 'md',
  tone = 'default',
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[TONE_MAP[tone], PADDING_MAP[padding], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface ParkviewMedallionCardProps {
  readonly icon: ReactNode;
  readonly badgeText?: string;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly className?: string;
}

/**
 * Authentic Parkview "Quick links" card (`parkview.com/patients-and-visitors`)
 * featuring a floating circular icon medallion centered along the top border
 * (`#056233` border + `#f26b21` sunset-orange icon) and crisp 6px-rounded card geometry.
 */
export function ParkviewMedallionCard({
  icon,
  badgeText,
  title,
  description,
  action,
  className = '',
}: ParkviewMedallionCardProps) {
  return (
    <div
      className={['relative pt-8 h-full flex flex-col', className]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Floating Circular Icon Medallion */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-16 h-16 rounded-full bg-white border border-[#056233] flex items-center justify-center text-[#f26b21] shadow-2xs"
      >
        {icon}
      </div>

      {/* Parkview Outlined Card Body */}
      <div className="flex-1 flex flex-col justify-between bg-white hover:bg-[#f7f8f8]/70 transition-colors border border-[#056233] rounded-[6px] pt-11 pb-6 px-6 gap-4">
        <div>
          {badgeText && (
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#00783c] mb-1">
              {badgeText}
            </span>
          )}
          <h3 className="text-[21px] font-bold text-[#0d4026] leading-snug font-display">
            {title}
          </h3>
          {description && (
            <p className="text-[14px] text-[#242628] mt-1.5 leading-relaxed">{description}</p>
          )}
        </div>

        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}

export interface ParkviewSpecialistCardProps {
  readonly headerVisual: ReactNode;
  readonly badgeText: string;
  readonly title: string;
  readonly description: string;
  readonly highlights?: readonly string[];
  readonly action: ReactNode;
}

/**
 * Modeled on Parkview's homepage 4-column "Explore the specialists who are here to help"
 * cards: top-rounded visual banner (`16px`), crisp white card body, deep forest heading,
 * and clean bottom action.
 */
export function ParkviewSpecialistCard({
  headerVisual,
  badgeText,
  title,
  description,
  highlights,
  action,
}: ParkviewSpecialistCardProps) {
  return (
    <div className="bg-white border border-[#d5e0db] hover:border-[#056233] rounded-[16px] overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-[0_14px_30px_-14px_rgba(13,64,38,0.22)] transition-all">
      <div>
        {/* Top Visual Header */}
        <div className="h-[146px] relative overflow-hidden">{headerVisual}</div>

        {/* Content Body */}
        <div className="p-6 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#00783c]">
            {badgeText}
          </p>
          <h3 className="text-[21px] font-bold text-[#0d4026] font-display leading-tight">
            {title}
          </h3>
          <p className="text-[13.5px] text-[#242628] leading-relaxed">{description}</p>

          {highlights && highlights.length > 0 && (
            <ul className="space-y-1.5 pt-3 mt-3 border-t border-[#e4ece7] text-xs text-[#0d4026]">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <span className="text-[#f26b21] font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 pt-1">{action}</div>
    </div>
  );
}
