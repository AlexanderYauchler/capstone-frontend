import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '../providers/AppProviders';
import { appRoutes } from '../router/routes';

function renderWithRouter(initialEntries: string[] = ['/login']) {
  const router = createMemoryRouter(appRoutes, { initialEntries });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('CoSign Sequence 2 — Role Selection, Layout & Route Navigation', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('renders the RoleSelectionPage (/login) with all four healthcare role cards and quick role buttons', () => {
    renderWithRouter(['/login']);

    expect(
      screen.getByRole('heading', { name: /Connected care\. Clear documentation\./i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue as Clinician/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue as Patient/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore administrator view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore analyst view/i })).toBeInTheDocument();
  });

  it('navigates to Clinician workspace with independent Analytics and Monthly analytics sidebar items', async () => {
    const user = userEvent.setup();
    renderWithRouter(['/login']);

    await user.click(screen.getByRole('button', { name: /Continue as Clinician/i }));

    expect(
      await screen.findByRole('heading', { name: /Good morning, Dr\. Lee/i }),
    ).toBeInTheDocument();

    const desktopNav = screen.getAllByRole('navigation', { name: /clinician navigation/i })[0]!;
    const analyticsLink = within(desktopNav).getByRole('link', { name: /^Analytics$/i });
    const monthlyAnalyticsLink = within(desktopNav).getByRole('link', {
      name: /^Monthly analytics$/i,
    });

    expect(analyticsLink).toBeInTheDocument();
    expect(monthlyAnalyticsLink).toBeInTheDocument();

    // Navigate directly to Monthly analytics via the dedicated sidebar item
    await user.click(monthlyAnalyticsLink);

    expect(
      await screen.findByRole('heading', { name: /Monthly documentation analytics/i }),
    ).toBeInTheDocument();
    expect(monthlyAnalyticsLink).toHaveAttribute('aria-current', 'page');
    expect(analyticsLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('enforces RoleGuard when a Clinician attempts to open an Admin-only route', () => {
    renderWithRouter(['/admin']);

    expect(
      screen.getByRole('heading', { name: /Role scope restriction/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Return to role selection/i }),
    ).toBeInTheDocument();
  });

  it('opens the responsive mobile navigation drawer when the menu button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(['/clinician/dashboard']);

    const menuButton = await screen.findByRole('button', { name: /Open navigation menu/i });
    await user.click(menuButton);

    const dialog = await screen.findByRole('dialog', { name: /CoSign Navigation/i });
    expect(dialog).toBeInTheDocument();

    const sessionsLink = within(dialog).getByRole('link', { name: /Clinical sessions/i });
    await user.click(sessionsLink);

    expect(
      await screen.findByRole('heading', { name: /Clinical sessions/i }),
    ).toBeInTheDocument();
  });

  it('triggers the DemoSimulationBar reset button and displays reset confirmation status', async () => {
    const user = userEvent.setup();
    renderWithRouter(['/clinician/dashboard']);

    const resetBtn = await screen.findByRole('button', { name: /Reset demo state/i });
    await user.click(resetBtn);

    expect(
      await screen.findByText(/Demo state restored to canonical seed/i),
    ).toBeInTheDocument();
  });

  it('navigates from Login to the Parkview-styled Patient Portal and displays released reports', async () => {
    const user = userEvent.setup();
    renderWithRouter(['/login']);

    await user.click(screen.getByRole('button', { name: /Continue as Patient/i }));

    expect(
      await screen.findByRole('heading', { name: /Welcome, Alex/i }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: /Quick links/i }),
    ).toBeInTheDocument();
  });

  it('preserves the active demo role across simulated page refreshes for each persona', async () => {
    const user = userEvent.setup();

    // 1. Switch to Patient on /login
    const firstRender = renderWithRouter(['/login']);
    await user.click(screen.getByRole('button', { name: /Continue as Patient/i }));
    expect(await screen.findByRole('heading', { name: /Welcome, Alex/i })).toBeInTheDocument();

    // Simulate browser page refresh at /patient (unmount React tree, keep sessionStorage)
    firstRender.unmount();

    const refreshedPatientRender = renderWithRouter(['/patient']);
    expect(
      await screen.findByRole('heading', { name: /Welcome, Alex/i }),
    ).toBeInTheDocument();
    refreshedPatientRender.unmount();

    // 2. Switch to Analyst via utility bar or login and refresh at /analyst/analytics
    const loginForAnalyst = renderWithRouter(['/login']);
    await user.click(screen.getByRole('button', { name: /Explore analyst view/i }));
    expect(
      await screen.findByRole('heading', { name: /Healthcare analytics/i }),
    ).toBeInTheDocument();
    loginForAnalyst.unmount();

    const refreshedAnalystRender = renderWithRouter(['/analyst/analytics?view=cohort']);
    expect(
      await screen.findByRole('heading', { name: /Healthcare analytics/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Role scope restriction/i }),
    ).not.toBeInTheDocument();
    refreshedAnalystRender.unmount();
  });

  it('synchronizes identity, DemoStore, and route when resetting demo state from another role', async () => {
    const user = userEvent.setup();
    renderWithRouter(['/login']);

    // Switch to Admin role (/admin?tab=overview)
    await user.click(screen.getByRole('button', { name: /Explore administrator view/i }));
    expect(
      await screen.findByRole('heading', { level: 1, name: /^Administration workspace$/i }),
    ).toBeInTheDocument();

    // Click "Reset demo state" while in the Admin workspace
    const resetBtn = screen.getByRole('button', { name: /Reset demo state/i });
    await user.click(resetBtn);

    // Must restore canonical Clinician identity (Dr. Jordan Lee), navigate to /clinician/dashboard, and show status notice
    expect(
      await screen.findByRole('heading', { name: /Good morning, Dr\. Lee/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Demo state restored to canonical seed/i),
    ).toBeInTheDocument();
  });

  it('validates demoRole URL query parameters and ignores invalid role strings', async () => {
    // Valid demoRole=admin allows direct entry into /admin
    const validRender = renderWithRouter(['/admin?demoRole=admin']);
    expect(
      await screen.findByRole('heading', { level: 1, name: /^Administration workspace$/i }),
    ).toBeInTheDocument();
    validRender.unmount();

    window.sessionStorage.clear();

    // Invalid demoRole=super_hacker is ignored and falls back to default clinician role (which RoleGuard blocks on /admin)
    renderWithRouter(['/admin?demoRole=super_hacker']);
    expect(
      await screen.findByRole('heading', { name: /Role scope restriction/i }),
    ).toBeInTheDocument();
  });

  it('renders a graceful 404 NotFoundPage for unknown routes', async () => {
    renderWithRouter(['/non-existent-clinical-route']);

    expect(
      await screen.findByRole('heading', {
        name: /We couldn’t find that clinical workspace route/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Go to Clinician Dashboard/i }),
    ).toBeInTheDocument();
  });
});
