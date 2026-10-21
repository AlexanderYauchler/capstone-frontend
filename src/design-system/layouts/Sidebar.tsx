/* eslint-disable react-refresh/only-export-components */
import { Link, useLocation, useNavigate } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  FileText,
  History,
  LayoutDashboard,
  Mic,
  Plus,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import type { UserRole } from '../../domain/models';
import { Button } from '../components/Button';

export interface NavItemConfig {
  readonly label: string;
  readonly to: string;
  readonly matchPath: string;
  readonly extraMatchPaths?: readonly string[];
  readonly matchQuery?: { readonly key: string; readonly value: string };
  readonly icon: ReactNode;
  /** Rendered as the prominent green call-to-action button on desktop. */
  readonly isPrimaryAction?: boolean;
}

export const ROLE_WORKSPACE_LABELS: Record<UserRole, string> = {
  clinician: 'Clinician Workspace',
  patient: 'Patient Portal',
  analyst: 'Healthcare Analytics',
  admin: 'Administration',
};

export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  clinician: '/clinician/dashboard',
  patient: '/patient',
  analyst: '/analyst/analytics?view=cohort',
  admin: '/admin?tab=overview',
};

export const ROLE_NAV_ITEMS: Record<UserRole, readonly NavItemConfig[]> = {
  clinician: [
    {
      label: 'Dashboard',
      to: '/clinician/dashboard',
      matchPath: '/clinician/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Clinical sessions',
      to: '/clinician/sessions',
      matchPath: '/clinician/sessions',
      icon: <ClipboardList className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Reports & review',
      to: '/clinician/reviews',
      matchPath: '/clinician/reviews',
      icon: <FileCheck2 className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Analytics',
      to: '/clinician/analytics?view=cohort',
      matchPath: '/clinician/analytics',
      icon: <BarChart3 className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Settings',
      to: '/settings',
      matchPath: '/settings',
      icon: <Settings className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'New recording',
      to: '/clinician/sessions/new',
      matchPath: '/clinician/sessions/new',
      extraMatchPaths: ['/clinician/sessions/upload'],
      icon: <Mic className="w-4 h-4" aria-hidden="true" />,
      isPrimaryAction: true,
    },
  ],
  patient: [
    {
      label: 'Overview',
      to: '/patient',
      matchPath: '/patient',
      icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'My reports',
      to: '/patient/reports',
      matchPath: '/patient/reports',
      icon: <FileText className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Visit history',
      to: '/patient/history',
      matchPath: '/patient/history',
      icon: <History className="w-4 h-4" aria-hidden="true" />,
    },
  ],
  analyst: [
    {
      label: 'Population overview',
      to: '/analyst/analytics?view=cohort',
      matchPath: '/analyst/analytics',
      matchQuery: { key: 'view', value: 'cohort' },
      icon: <BarChart3 className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Monthly operations',
      to: '/analyst/analytics?view=monthly',
      matchPath: '/analyst/analytics',
      matchQuery: { key: 'view', value: 'monthly' },
      icon: <CalendarRange className="w-4 h-4" aria-hidden="true" />,
    },
  ],
  admin: [
    {
      label: 'Overview',
      to: '/admin?tab=overview',
      matchPath: '/admin',
      matchQuery: { key: 'tab', value: 'overview' },
      icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Users & access',
      to: '/admin?tab=users',
      matchPath: '/admin',
      matchQuery: { key: 'tab', value: 'users' },
      icon: <Users className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Audit log',
      to: '/admin?tab=audit',
      matchPath: '/admin',
      matchQuery: { key: 'tab', value: 'audit' },
      icon: <History className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Settings',
      to: '/settings',
      matchPath: '/settings',
      icon: <Settings className="w-4 h-4" aria-hidden="true" />,
    },
  ],
};

/** Returns a match score for one item, or -1 when it does not match the location. */
function scoreNavItem(item: NavItemConfig, pathname: string, searchParams: URLSearchParams): number {
  const paths = [item.matchPath, ...(item.extraMatchPaths ?? [])];
  const matchedPath = paths.find((p) =>
    p === '/patient' ? pathname === '/patient' : pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!matchedPath) return -1;
  if (!item.matchQuery) return matchedPath.length * 10;

  const actualVal = searchParams.get(item.matchQuery.key);
  const isDefaultValue =
    (item.matchQuery.key === 'view' && item.matchQuery.value === 'cohort') ||
    (item.matchQuery.key === 'tab' && item.matchQuery.value === 'overview');
  const queryMatches = actualVal === item.matchQuery.value || (isDefaultValue && actualVal === null);
  return queryMatches ? matchedPath.length * 10 + 5 : -1;
}

/**
 * True when this item is the single best match for the current location, so exactly
 * one navigation item is marked active (e.g. "New recording" rather than "Clinical sessions").
 */
export function isNavItemActive(
  item: NavItemConfig,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  const siblings =
    Object.values(ROLE_NAV_ITEMS).find((list) => list.includes(item)) ?? [item];
  const own = scoreNavItem(item, pathname, searchParams);
  if (own < 0) return false;
  return siblings.every((other) => other === item || scoreNavItem(other, pathname, searchParams) <= own);
}

/**
 * CoSign's Parkview-inspired geometric diamond-mosaic cross emblem + two-line brand lockup.
 */
export function CoSignBrandLockup({
  inverted = false,
  onClick,
}: {
  readonly inverted?: boolean;
  readonly onClick?: () => void;
}) {
  const primaryColor = inverted ? '#ffffff' : '#02754b';
  const accentColor = inverted ? '#a3e668' : '#7dc242';
  const wordmarkColor = inverted ? 'text-white' : 'text-[#242628]';
  const subtitleColor = inverted ? 'text-[#b9f08c]' : 'text-[#6cb33f]';

  return (
    <Link
      to="/login"
      onClick={onClick}
      className="inline-flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#02754b] rounded-md shrink-0"
    >
      {/* Diamond Mosaic Medical Emblem */}
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0 transition-transform duration-200 group-hover:scale-105"
      >
        <g transform="rotate(45 20 20)">
          {/* Center Core */}
          <rect x="16.5" y="16.5" width="7" height="7" rx="1.2" fill={primaryColor} />
          {/* Inner Cross Arms */}
          <rect x="16.5" y="9" width="7" height="5.5" rx="1" fill={primaryColor} />
          <rect x="16.5" y="25.5" width="7" height="5.5" rx="1" fill={primaryColor} />
          <rect x="9" y="16.5" width="5.5" height="7" rx="1" fill={primaryColor} />
          <rect x="25.5" y="16.5" width="5.5" height="7" rx="1" fill={primaryColor} />
          {/* Diagonal Lime Facets */}
          <rect x="10.5" y="10.5" width="4.5" height="4.5" rx="0.9" fill={accentColor} />
          <rect x="25" y="10.5" width="4.5" height="4.5" rx="0.9" fill={accentColor} />
          <rect x="10.5" y="25" width="4.5" height="4.5" rx="0.9" fill={accentColor} />
          <rect x="25" y="25" width="4.5" height="4.5" rx="0.9" fill={accentColor} />
          {/* Outer Diamond Tips */}
          <rect x="18" y="4" width="4" height="3.5" rx="0.8" fill={accentColor} />
          <rect x="18" y="32.5" width="4" height="3.5" rx="0.8" fill={accentColor} />
          <rect x="4" y="18" width="3.5" height="4" rx="0.8" fill={accentColor} />
          <rect x="32.5" y="18" width="3.5" height="4" rx="0.8" fill={accentColor} />
        </g>
      </svg>

      <div className="flex flex-col leading-none">
        <span
          className={`text-[23px] sm:text-[25px] font-semibold tracking-[0.06em] ${wordmarkColor}`}
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          COSIGN
        </span>
        <span
          className={`text-[11px] sm:text-[12px] font-medium tracking-[0.22em] uppercase mt-1 ${subtitleColor}`}
        >
          HEALTH AI
        </span>
      </div>
    </Link>
  );
}

/**
 * Parkview's signature soft sage-mint (#edf5f0) internal page sub-navigation card
 * (modeled directly on parkview.com/patients-and-visitors left column).
 * Hidden below `lg` (`1024px`) so tablet/mobile users are not forced to scroll past
 * a redundant vertical menu before seeing page content.
 */
export function ParkviewSubNav({
  heading,
  extraLinks,
}: {
  readonly heading?: string;
  readonly extraLinks?: readonly { readonly label: string; readonly to: string }[];
}) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const navItems = ROLE_NAV_ITEMS[currentUser.role];
  const displayHeading = heading ?? ROLE_WORKSPACE_LABELS[currentUser.role];

  return (
    <aside
      aria-label={`${currentUser.role} sub-navigation`}
      className="bg-[#edf5f0] rounded-[16px] p-5 sm:p-6 border border-[#cde0d4]/80"
    >
      <h2 className="text-[19px] font-bold text-[#0d4026] font-display mb-3.5">
        {displayHeading}
      </h2>

      <ul className="divide-y divide-[#cde0d4]">
        {navItems.map((item) => {
          const active = isNavItemActive(item, location.pathname, searchParams);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex items-center justify-between py-3 text-[13.5px] font-bold transition-colors group',
                  active
                    ? 'text-[#0d4026] underline decoration-[#02754b] decoration-2 underline-offset-4'
                    : 'text-[#00783c] hover:text-[#0d4026]',
                ].join(' ')}
              >
                <span>{item.label}</span>
                {active ? (
                  <ArrowRight
                    className="w-4 h-4 shrink-0 text-[#f26b21]"
                    aria-hidden="true"
                  />
                ) : (
                  <Plus
                    className="w-4 h-4 shrink-0 text-[#00783c] group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                )}
              </Link>
            </li>
          );
        })}
        {extraLinks?.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="flex items-center justify-between py-3 text-[13.5px] font-bold text-[#00783c] hover:text-[#0d4026] transition-colors group"
            >
              <span>{link.label}</span>
              <ArrowRight
                className="w-4 h-4 shrink-0 text-[#00783c] group-hover:translate-x-0.5 transition-transform"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * Responsive Mobile Navigation Menu rendered inside the mobile Drawer.
 */
export function Sidebar({
  variant = 'workspace',
  onNavigate,
}: {
  readonly variant?: 'login' | 'workspace';
  readonly onNavigate?: () => void;
}) {
  const { currentUser, demoUsers, switchDemoRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const navItems = ROLE_NAV_ITEMS[currentUser.role];

  return (
    <div
      aria-label="Mobile workspace navigation"
      className="bg-white text-[#242628] flex flex-col justify-between p-6 min-h-full select-none"
    >
      <div>
        <div className="pb-5 border-b border-[#d5e0db]">
          <CoSignBrandLockup onClick={onNavigate} />
          <p className="text-[11px] font-bold tracking-wider text-[#00783c] mt-3 uppercase">
            {variant === 'login' ? 'Connected Care Portal' : ROLE_WORKSPACE_LABELS[currentUser.role]}
          </p>
          <p className="text-xs text-[#495057] mt-0.5">{currentUser.organizationName}</p>
        </div>

        <nav aria-label={`${currentUser.role} navigation`} className="divide-y divide-[#e5ece8] mt-3">
          {navItems.map((item) => {
            const active = isNavItemActive(item, location.pathname, searchParams);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex items-center justify-between py-3.5 px-2 text-[15px] font-bold transition-colors',
                  active ? 'text-[#02754b] bg-[#edf5f0] rounded-lg px-3' : 'text-[#242628] hover:text-[#02754b]',
                ].join(' ')}
              >
                <span className="flex items-center gap-3">
                  <span className="text-[#02754b]">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-[#02754b]" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        {/* Quick Persona Switcher inside Mobile Drawer */}
        <div className="mt-6 pt-5 border-t border-[#d5e0db]">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0d4026] mb-3">
            Switch demo role
          </p>
          <div className="grid grid-cols-2 gap-2">
            {demoUsers.map((user) => {
              const isCurrent = user.role === currentUser.role;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={async () => {
                    await switchDemoRole(user.role);
                    onNavigate?.();
                    void navigate(ROLE_HOME_ROUTES[user.role]);
                  }}
                  className={[
                    'text-left px-3 py-2 rounded-[8px] border text-xs font-semibold transition-colors cursor-pointer',
                    isCurrent
                      ? 'bg-[#02754b] text-white border-[#02754b]'
                      : 'bg-[#edf5f0] text-[#0d4026] border-[#cde0d4] hover:bg-[#dfeee5]',
                  ].join(' ')}
                >
                  <div className="capitalize font-bold">{user.role}</div>
                  <div className="text-[11px] opacity-85 truncate">{user.displayName}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-[#d5e0db] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#495057]">Active profile:</span>
          <strong className="text-[#0d4026]">{currentUser.displayName}</strong>
        </div>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            onNavigate?.();
            void navigate('/login');
          }}
        >
          Back to role selection
        </Button>
      </div>
    </div>
  );
}
