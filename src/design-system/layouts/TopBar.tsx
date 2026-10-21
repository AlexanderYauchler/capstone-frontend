import { Link, useLocation, useNavigate } from 'react-router';
import { Menu, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { defaultClinicClock } from '../../config/clock';
import type { UserRole } from '../../domain/models';
import {
  CoSignBrandLockup,
  ROLE_NAV_ITEMS,
  ROLE_WORKSPACE_LABELS,
  isNavItemActive,
} from './Sidebar';

const PRIMARY_CTA_BY_ROLE: Record<
  UserRole,
  { readonly label: string; readonly to: string }
> = {
  clinician: { label: 'Start Clinical Visit', to: '/clinician/sessions/new' },
  patient: { label: 'My Visit Reports', to: '/patient/reports' },
  analyst: { label: 'Cohort Explorer', to: '/analyst/analytics?view=cohort' },
  admin: { label: 'Audit Trail', to: '/admin?tab=audit' },
};

const PUBLIC_LOGIN_LINKS: readonly {
  readonly label: string;
  readonly role: UserRole;
  readonly to: string;
}[] = [
  { label: 'Clinician Care', role: 'clinician', to: '/clinician/dashboard' },
  { label: 'Clinical Sessions', role: 'clinician', to: '/clinician/sessions' },
  { label: 'Patients & Visitors', role: 'patient', to: '/patient' },
  { label: 'Healthcare Analytics', role: 'analyst', to: '/analyst/analytics?view=cohort' },
  { label: 'Administration', role: 'admin', to: '/admin?tab=overview' },
];

export function TopBar({
  variant = 'workspace',
  onOpenMobileMenu,
}: {
  readonly variant?: 'login' | 'workspace';
  readonly onOpenMobileMenu?: () => void;
}) {
  const { currentUser, switchDemoRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const navItems = ROLE_NAV_ITEMS[currentUser.role];
  const primaryCta = PRIMARY_CTA_BY_ROLE[currentUser.role];

  const handleUtilityRoleJump = async (role: UserRole, to: string) => {
    await switchDemoRole(role);
    void navigate(to);
  };

  return (
    <>
      {/* Tier 1: Slim Kelly-Green Utility Bar (#02754b) — Scrolls naturally */}
      <div className="w-full shrink-0 bg-[#02754b] text-white text-[11.5px] sm:text-[12.5px] font-semibold">
        <div className="max-w-[1320px] mx-auto px-3 sm:px-8 h-[36px] flex items-center justify-between gap-2 sm:gap-3">
          {/* Left System Context */}
          <div className="hidden lg:flex items-center gap-2 text-white/95 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#a3e668]" aria-hidden="true" />
            <span>Northfield Primary Care Network</span>
            <span className="opacity-60">·</span>
            <time
              dateTime={defaultClinicClock.referenceDate}
              title={`Configured clinic reference date (${defaultClinicClock.timezone})`}
              className="tabular-nums"
            >
              {defaultClinicClock.referenceDisplayDate}
            </time>
          </div>

          {/* Right Parkview-Style Utility Navigation Links */}
          <div className="flex items-center justify-between sm:justify-end gap-x-2.5 sm:gap-x-5 w-full lg:w-auto lg:ml-auto whitespace-nowrap">
            <button
              type="button"
              onClick={() => void handleUtilityRoleJump('clinician', '/clinician/dashboard')}
              className="hover:underline underline-offset-4 cursor-pointer text-white/95 hover:text-white"
            >
              Clinician Desk
            </button>
            <button
              type="button"
              onClick={() => void handleUtilityRoleJump('analyst', '/analyst/analytics?view=cohort')}
              className="hidden sm:inline hover:underline underline-offset-4 cursor-pointer text-white/95 hover:text-white"
            >
              Medical Analytics
            </button>
            <button
              type="button"
              onClick={() => void handleUtilityRoleJump('admin', '/admin?tab=overview')}
              className="hidden md:inline hover:underline underline-offset-4 cursor-pointer text-white/95 hover:text-white"
            >
              Governance
            </button>
            <button
              type="button"
              onClick={() => void handleUtilityRoleJump('patient', '/patient')}
              className="hover:underline underline-offset-4 cursor-pointer text-white/95 hover:text-white"
            >
              Patient Portal
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 bg-[#0d4026]/70 hover:bg-[#0d4026] px-2.5 py-0.5 rounded-[5px] text-white transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#a3e668]" aria-hidden="true" />
              <span className="hidden md:inline">
                {variant === 'login'
                  ? 'Role Hub'
                  : `${currentUser.displayName} (${ROLE_WORKSPACE_LABELS[currentUser.role]})`}
              </span>
              <span className="md:hidden">
                {variant === 'login' ? 'Role Hub' : currentUser.displayName}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tier 2: Parkview Crisp White Primary Navigation Bar (#ffffff) — Sticky */}
      <header className="w-full shrink-0 bg-white border-b border-[#e4ece7] sticky top-0 z-30 shadow-[0_1px_2px_rgba(13,64,38,0.03)]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-8 h-[72px] sm:h-[76px] flex items-center justify-between gap-4">
          <CoSignBrandLockup />

          {/* Desktop Horizontal Navigation + Prominent Green CTA */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-6">
            {variant === 'login' ? (
              <nav aria-label="CoSign portal navigation" className="flex items-center gap-5 xl:gap-6">
                {PUBLIC_LOGIN_LINKS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => void handleUtilityRoleJump(item.role, item.to)}
                    className="whitespace-nowrap text-[14.5px] xl:text-[15.5px] font-semibold text-[#242628] hover:text-[#02754b] py-2 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            ) : (
              <nav
                aria-label={`${currentUser.role} navigation`}
                className="flex items-center gap-5 xl:gap-6"
              >
                {navItems.map((item) => {
                  const active = isNavItemActive(item, location.pathname, searchParams);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'relative whitespace-nowrap py-2.5 text-[14.5px] xl:text-[15.5px] font-semibold transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#02754b] rounded-xs',
                        active
                          ? 'text-[#02754b] after:content-[""] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[3px] after:bg-[#02754b] after:rounded-full'
                          : 'text-[#242628] hover:text-[#02754b]',
                      ].join(' ')}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Parkview Prominent Right Green CTA Button */}
            {variant === 'login' ? (
              <button
                type="button"
                onClick={() => void handleUtilityRoleJump('clinician', '/clinician/dashboard')}
                className="whitespace-nowrap shrink-0 inline-flex items-center justify-center bg-[#02754b] hover:bg-[#056233] text-white font-bold text-[14px] xl:text-[15px] px-5 py-2.5 rounded-[12px] shadow-xs transition-colors cursor-pointer"
              >
                Find Care Workspace
              </button>
            ) : (
              <Link
                to={primaryCta.to}
                className="whitespace-nowrap shrink-0 inline-flex items-center justify-center bg-[#02754b] hover:bg-[#056233] text-white font-bold text-[14px] xl:text-[15px] px-5 py-2.5 rounded-[12px] shadow-xs transition-colors"
              >
                {primaryCta.label}
              </Link>
            )}
          </div>

          {/* Mobile / Tablet Parkview-Styled Menu Button */}
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border-[1.5px] border-[#02754b] text-[#0d4026] font-bold text-sm hover:bg-[#edf5f0] transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4 text-[#02754b]" aria-hidden="true" />
              <span>Menu</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
}
