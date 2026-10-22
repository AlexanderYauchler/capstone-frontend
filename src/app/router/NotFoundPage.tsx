import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { useLocation } from 'react-router';
import { useAuth } from '../providers/AuthProvider';
import { ButtonLink } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { AppShell } from '../../design-system/layouts/AppShell';
import type { UserRole } from '../../domain/models';

const HOME_ROUTE_BY_ROLE: Record<UserRole, { readonly label: string; readonly to: string }> = {
  clinician: { label: 'Go to Clinician Dashboard', to: '/clinician/dashboard' },
  patient: { label: 'Go to Patient Portal', to: '/patient' },
  analyst: { label: 'Go to Analytics Workspace', to: '/analyst/analytics?view=cohort' },
  admin: { label: 'Go to Administration Workspace', to: '/admin?tab=overview' },
};

export function NotFoundPage() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const roleDestination = HOME_ROUTE_BY_ROLE[currentUser.role];

  return (
    <AppShell variant="workspace">
      <div className="max-w-2xl mx-auto py-8 sm:py-12">
        <Card padding="lg" className="space-y-5 border-[#056233]/30">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#feede0] border border-[#f26b21]/40 flex items-center justify-center text-[#f26b21] shrink-0">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9a4406]">
                404 · Page Not Found
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0d4026] font-display">
                We couldn’t find that clinical workspace route
              </h1>
              <p className="text-sm text-[#495057] leading-relaxed">
                The requested address{' '}
                <code className="px-1.5 py-0.5 rounded bg-[#edf5f0] text-[#0d4026] font-mono text-xs">
                  {location.pathname}
                </code>{' '}
                does not match an active CoSign page. Use the links below to return to your current
                role workspace or switch demonstration personas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#e4ece7]">
            <ButtonLink
              variant="primary"
              to={roleDestination.to}
              iconLeft={<Home className="w-4 h-4" aria-hidden="true" />}
            >
              {roleDestination.label}
            </ButtonLink>
            <ButtonLink
              variant="secondary"
              to="/login"
              iconLeft={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
            >
              Return to Role Selection Hub
            </ButtonLink>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
