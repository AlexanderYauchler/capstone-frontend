import { RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useServiceContext } from '../../app/providers/ServiceProvider';
import { defaultClinicClock } from '../../config/clock';

export function DemoSimulationBar() {
  const { isDemoMode, resetDemoState, resetConfirmationVisible } = useServiceContext();
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (!isDemoMode || dismissed) return null;

  const handleReset = () => {
    resetDemoState();
    // Canonical seed sets activeRole back to 'clinician' (Dr. Jordan Lee).
    // If the user is currently on a route restricted to another demo role,
    // navigate to the clinician dashboard so identity, store, and route stay consistent.
    const path = location.pathname;
    const isClinicianAccessibleRoute =
      path === '/login' || path === '/settings' || path.startsWith('/clinician');
    if (!isClinicianAccessibleRoute) {
      void navigate('/clinician/dashboard');
    }
  };

  return (
    <div
      role="region"
      aria-label="Capstone Demo Simulation Controls"
      className="bg-[#e8f3ee] border-b border-[#cde0d4] text-[#1d252c] text-[12.5px] leading-snug"
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex-1 min-w-[200px]">
          <strong className="font-bold text-[#0d4026]">CoSign Clinical AI</strong> ·{' '}
          <strong className="font-bold">Synthetic Demo Mode</strong> (
          <span className="tabular-nums font-semibold">
            {defaultClinicClock.referenceDisplayDate}
          </span>
          )
          <span className="hidden sm:inline">
            {' '}
            — fictional demonstration records only; simulated role switcher (not production auth).
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {resetConfirmationVisible && (
            <span role="status" className="text-[#00783c] font-bold text-xs">
              Demo state restored to canonical seed
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] bg-white hover:bg-[#edf5f0] text-[#0d4026] border border-[#056233]/35 text-[11.5px] font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3 text-[#00783c]" aria-hidden="true" />
            <span>Reset demo state</span>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss system notice"
            className="p-0.5 rounded text-[#0d4026] hover:bg-[#d5e8de] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
