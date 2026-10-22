import { Link } from 'react-router';
import { useAuth } from '../../app/providers/AuthProvider';
import { CoSignBrandLockup, ROLE_NAV_ITEMS, ROLE_WORKSPACE_LABELS } from './Sidebar';

export function ParkviewFooter() {
  const { currentUser } = useAuth();

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

          {/* Column 2: Pages available to the current role only */}
          <nav aria-label="Footer" className="lg:col-span-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 font-display">
              {ROLE_WORKSPACE_LABELS[currentUser.role]}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-white/90">
              {ROLE_NAV_ITEMS[currentUser.role].map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:underline underline-offset-4">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 3: Demo controls */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 font-display">
              Demonstration
            </h2>
            <ul className="space-y-2.5 text-sm text-white/90">
              <li>
                <Link to="/login" className="hover:underline underline-offset-4">
                  Switch demo role
                </Link>
              </li>
              <li>Signed in as {currentUser.displayName}</li>
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
