import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { AppShell } from '../../design-system/layouts/AppShell';
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
        <Card padding="lg" className="max-w-xl mx-auto mt-8 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert
              className="w-6 h-6 text-[var(--color-warning)] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-ink)]">
                Role scope restriction (Simulated Demo)
              </h1>
              <p className="text-sm text-[var(--color-ink-muted)] mt-1 leading-relaxed">
                Active demo persona: <strong>{currentUser.displayName}</strong> (
                <span className="capitalize">{currentUser.role}</span>). This workspace view is
                scoped to the <strong>{allowedRoles.join(' or ')}</strong> demonstration role.
              </p>
              <p className="text-xs text-[#495057] mt-2">
                Note: This is a client-side demonstration role switcher using synthetic data. Real
                authentication and backend authorization controls will be enforced in the connected
                backend service layer.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => {
                void switchDemoRole(primaryRequiredRole);
              }}
            >
              Switch demo role to {primaryRequiredRole}
            </Button>
            <Button
              variant="secondary"
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
