import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../app/providers/AuthProvider';
import type { UserRole } from '../../domain/models';
import { CoSignBrandLockup } from './Sidebar';

export function ParkviewFooter() {
  const { switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const handleRoleNav = async (role: UserRole, to: string) => {
    await switchDemoRole(role);
    void navigate(to);
  };

  return (
    <footer className="bg-[#1b8449] text-white mt-16 border-t-4 border-[#02754b]">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Column 1: Brand Lockup & Care Promise */}
          <div className="lg:col-span-2 space-y-4">
            <CoSignBrandLockup inverted />
            <p className="text-sm text-white/90 max-w-md leading-relaxed pt-1">
              CoSign connects ambient clinical conversation capture, evidence-backed SOAP
              documentation, patient-friendly care summaries, and aggregate population analytics in
              one human-centered healthcare workspace.
            </p>
            <p className="text-xs font-semibold text-[#d2f7b5] tracking-wide uppercase">
              Northfield Primary Care · Synthetic Clinical Capstone
            </p>
          </div>

          {/* Column 2: Clinician Care */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 font-display">
              Clinician Workspace
            </h2>
            <ul className="space-y-2.5 text-sm text-white/90">
              <li>
                <button
                  type="button"
                  onClick={() => void handleRoleNav('clinician', '/clinician/dashboard')}
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  Clinician Command Center
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => void handleRoleNav('clinician', '/clinician/sessions')}
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  Clinical Sessions Directory
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => void handleRoleNav('clinician', '/clinician/sessions/new')}
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  New Visit Setup (Sequence 4)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => void handleRoleNav('clinician', '/clinician/sessions/CS-1042')}
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  Review Visit CS-1042
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Patients & Visitors */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 font-display">
              Patients &amp; Visitors
            </h2>
            <ul className="space-y-2.5 text-sm text-white/90">
              <li>
                <button
                  type="button"
                  onClick={() => void handleRoleNav('patient', '/patient')}
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  Patient Care Overview
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => void handleRoleNav('patient', '/patient/reports')}
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  Released Medical Reports
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => void handleRoleNav('patient', '/patient/history')}
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  Care Timeline &amp; History
                </button>
              </li>
              <li>
                <Link to="/login" className="hover:underline underline-offset-4">
                  Switch Demo Persona
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Analytics & Governance */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 font-display">
              Analytics &amp; Governance
            </h2>
            <ul className="space-y-2.5 text-sm text-white/90">
              <li>
                <button
                  type="button"
                  onClick={() =>
                    void handleRoleNav('analyst', '/analyst/analytics?view=cohort')
                  }
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  Aggregate Clinical Cohorts
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    void handleRoleNav('clinician', '/clinician/analytics?view=monthly')
                  }
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  Monthly Documentation Ops
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => void handleRoleNav('admin', '/admin?tab=overview')}
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  Role Access &amp; Governance
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => void handleRoleNav('admin', '/admin?tab=audit')}
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  Activity Audit Log
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/85">
          <p>
            © 2026 CoSign Clinical Documentation &amp; Analytics Capstone. Visual architecture
            inspired by modern regional healthcare portals; independent academic project with no
            health-system affiliation.
          </p>
          <p className="font-semibold text-[#d2f7b5] shrink-0">
            Synthetic Demonstration Data Only · Simulated Role Switcher
          </p>
        </div>
      </div>
    </footer>
  );
}
