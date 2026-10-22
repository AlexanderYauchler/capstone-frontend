import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'soft'
  | 'heroDark'
  | 'pillArrow'
  | 'danger'
  | 'nav'
  | 'navActive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly iconLeft?: ReactNode;
  readonly iconRight?: ReactNode;
  readonly fullWidth?: boolean;
}

export interface ButtonLinkProps extends Omit<LinkProps, 'className'> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly iconLeft?: ReactNode;
  readonly iconRight?: ReactNode;
  readonly fullWidth?: boolean;
  readonly className?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#02754b] text-white hover:bg-[#056233] border border-transparent shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b]',
  secondary:
    'bg-white text-[#0d4026] hover:bg-[#edf5f0] border-[1.5px] border-[#056233] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b]',
  soft:
    'bg-[#edf5f0] text-[#0d4026] hover:bg-[#dfeee5] border border-[#cde0d4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b]',
  heroDark:
    'bg-[#0d4026] text-white hover:bg-[#072817] border-[1.5px] border-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  pillArrow:
    'bg-[#00783c] text-white hover:bg-[#0d4026] border border-transparent shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b]',
  danger:
    'bg-[var(--color-danger)] text-white hover:bg-[#911c13] border border-transparent shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-danger)]',
  nav:
    'bg-transparent text-[#242628] hover:text-[#02754b] hover:bg-[#edf5f0] border border-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b]',
  navActive:
    'bg-[#02754b] text-white border border-transparent shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs rounded-[8px] gap-1.5',
  md: 'h-11 px-5 text-[14px] rounded-[10px] gap-2',
  lg: 'h-12 px-6 text-[15px] rounded-[12px] gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer select-none group',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {iconLeft && <span className="shrink-0">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && (
        <span className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5">
          {iconRight}
        </span>
      )}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  className = '',
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={[
        'inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer select-none group',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {iconLeft && <span className="shrink-0">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && (
        <span className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5">
          {iconRight}
        </span>
      )}
    </Link>
  );
}
