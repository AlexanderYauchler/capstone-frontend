import { useState, type ReactNode } from 'react';
import { Drawer } from '../components/Drawer';
import { DemoSimulationBar } from './DemoSimulationBar';
import { ParkviewFooter } from './ParkviewFooter';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export interface AppShellProps {
  readonly variant?: 'login' | 'workspace';
  readonly children: ReactNode;
}

export function AppShell({ variant = 'workspace', children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-white text-[#242628]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-[#0d4026] focus:font-bold focus:px-4 focus:py-2 focus:rounded-[8px] focus:shadow-md"
      >
        Skip to main content
      </a>

      {/* Tier 0: Parkview Pale-Mint System Notice Strip */}
      <DemoSimulationBar />

      {/* Tier 1 + Tier 2: Parkview Horizontal Utility & Primary Navigation Header */}
      <TopBar
        variant={variant}
        onOpenMobileMenu={() => {
          setMobileNavOpen(true);
        }}
      />

      {/* Mobile / Tablet Navigation Drawer */}
      <Drawer
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        title="CoSign Navigation"
        description="Select a workspace destination or switch active healthcare persona"
      >
        <div className="-m-6">
          <Sidebar
            variant={variant}
            onNavigate={() => {
              setMobileNavOpen(false);
            }}
          />
        </div>
      </Drawer>

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full focus:outline-none">
        {variant === 'login' ? (
          children
        ) : (
          <div className="max-w-[1320px] mx-auto px-4 sm:px-8 py-5 sm:py-7">
            {children}
          </div>
        )}
      </main>

      {/* Parkview Full-Width Kelly-Green Footer */}
      <ParkviewFooter />
    </div>
  );
}
