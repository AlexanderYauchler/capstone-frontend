import type { ReactNode } from 'react';
import { Link } from 'react-router';

export interface BreadcrumbItem {
  readonly label: string;
  readonly to?: string;
}

export interface PageHeaderProps {
  readonly breadcrumbs: readonly BreadcrumbItem[];
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
}

/**
 * Standard page header used by every workspace screen: breadcrumb trail,
 * a single h1, a one-line explanation of what the page is for, and primary actions.
 */
export function PageHeader({ breadcrumbs, eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="text-xs sm:text-[13px]">
        <ol className="flex flex-wrap items-center gap-2">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                {crumb.to && !isLast ? (
                  <Link to={crumb.to} className="text-[#00783c] hover:underline font-semibold">
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={isLast ? 'font-bold text-[#242628]' : 'text-[#495057] font-semibold'}
                  >
                    {crumb.label}
                  </span>
                )}
                {!isLast && (
                  <span aria-hidden="true" className="text-[#495057]">
                    ›
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="rounded-[18px] bg-[#00783c] text-white px-6 py-5 sm:px-8 sm:py-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#c8f59b]">{eyebrow}</p>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight font-display">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-white/95 leading-relaxed">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
        </div>
      </section>
    </div>
  );
}
