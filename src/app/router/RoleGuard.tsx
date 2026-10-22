import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { AppShell } from '../../design-system/layouts/AppShell';
import { ROLE_HOME_ROUTES } from '../../design-system/layouts/Sidebar';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { parseValidUserRole, type UserRole } from '../../domain/models';

export function RoleGuard({
  allowedRoles,
}: {
  readonly allowedRoles: readonly UserRole[];
}) {
  const { currentUser, switchDemoRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const urlDemoRole = parseValidUserRole(new URLSearchParams(location.search).get('demoRole'));

  useEffect(() => {
    if (urlDemoRole && urlDemoRole !== currentUser.role) {
      void switchDemoRole(urlDemoRole);
    }
  }, [currentUser.role, switchDemoRole, urlDemoRole]);

  const effectiveRole = urlDemoRole ?? currentUser.role;

  if (!allowedRoles.includes(effectiveRole)) {
    const primaryRequiredRole = allowedRoles[0] ?? 'clinician';
    return (
      <AppShell variant="workspace">
        <Card padding="lg" className="max-w-xl mx-auto mt-8 space-y-4" role="alert">
          <div className="flex items-start gap-3">
            <ShieldAlert
              className="w-6 h-6 text-[var(--color-warning)] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <h1 className="text-xl font-bold text-[var(--color-ink-heading)]">
                Access restricted
              </h1>
              <p className="text-sm text-[var(--color-ink)] mt-1 leading-relaxed">
                You are signed in as <strong>{currentUser.displayName}</strong> (
                <span className="capitalize">{currentUser.role}</span>). This page is only available
                to the <strong>{allowedRoles.join(' or ')}</strong> role, so nothing from it has been
                shown.
              </p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-2">
                Demo note: roles are switched in the browser for this demonstration. Real sign-in and
                server-side permission checks belong to the backend.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => {
                void navigate(ROLE_HOME_ROUTES[currentUser.role]);
              }}
            >
              Go to my workspace
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void switchDemoRole(primaryRequiredRole);
              }}
            >
              Switch demo role to {primaryRequiredRole}
            </Button>
            <Button
              variant="soft"
              onClick={() => {
                void navigate('/login');
              }}
            >
              Return to role selection
            </Button>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell variant="workspace">
      <Outlet />
    </AppShell>
  );
}
