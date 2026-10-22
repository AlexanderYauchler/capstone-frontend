import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '../../../app/providers/AppProviders';
import { appRoutes } from '../../../app/router/routes';

function renderApp(initialEntries: string[] = ['/clinician/dashboard']) {
  const router = createMemoryRouter(appRoutes, { initialEntries });
  return {
    router,
    ...render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}

describe('CoSign Sequence 3A — Functional Clinician Dashboard, Sessions Directory & Session Detail', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('renders ClinicianDashboardPage with service-backed KPI metrics, priority task callout, and interactive queue tabs', async () => {
    const user = userEvent.setup();
    renderApp(['/clinician/dashboard']);

    expect(
      await screen.findByRole('heading', { name: /Good morning, Dr\. Lee/i }),
    ).toBeInTheDocument();

    // Verify priority clarification callout for CS-1042
    expect(
      await screen.findByRole('heading', {
        name: /Alex Morgan — Diabetes follow-up/i,
      }),
    ).toBeInTheDocument();

    // Verify all 8 October 6 sessions are shown initially in the queue table
    const queueTable = await screen.findByRole('table');
    expect(within(queueTable).getAllByRole('row')).toHaveLength(9); // 1 header + 8 data rows

    // Filter queue to "Needs Review (2)" tab
    const needsReviewTab = screen.getByRole('tab', { name: /Needs Review \(2\)/i });
    await user.click(needsReviewTab);

    const updatedTable = screen.getByRole('table');
    expect(within(updatedTable).getAllByRole('row')).toHaveLength(3); // 1 header + 2 rows (CS-1047, CS-1046)
    expect(within(updatedTable).getByText('Riley Patel')).toBeInTheDocument();
    expect(within(updatedTable).getByText('Casey Chen')).toBeInTheDocument();
  });

  it('supports searching, status filtering, date filtering, and sorting on ClinicalSessionsPage (/clinician/sessions)', async () => {
    const user = userEvent.setup();
    const { router } = renderApp(['/clinician/sessions']);

    expect(
      await screen.findByRole('heading', { name: /^Clinical sessions$/i }),
    ).toBeInTheDocument();

    // Initially shows all 10 canonical sessions (8 on Oct 6 + 2 historical for Alex Morgan)
    expect(await screen.findByText(/Showing 10 of 10 sessions/i)).toBeInTheDocument();

    // 1. Filter by encounter date: Oct 6, 2026 (Today) -> 8 sessions
    const dateSelect = screen.getByLabelText(/Encounter date/i);
    await user.selectOptions(dateSelect, '2026-10-06');
    expect(await screen.findByText(/Showing 8 of 10 sessions/i)).toBeInTheDocument();
    expect(router.state.location.search).toContain('date=2026-10-06');

    // 2. Filter by status: Clarification needed -> 1 session (CS-1042)
    const statusSelect = screen.getByLabelText(/Workflow status/i);
    await user.selectOptions(statusSelect, 'clarification_needed');
    expect(await screen.findByText(/Showing 1 of 10 sessions/i)).toBeInTheDocument();
    expect(router.state.location.search).toContain('status=clarification_needed');

    const table = screen.getByRole('table', { name: /Clinical sessions directory/i });
    expect(within(table).getByText('Alex Morgan')).toBeInTheDocument();

    // 3. Clear filters -> back to 10 of 10 sessions
    await user.click(screen.getByRole('button', { name: /Clear filters/i }));
    expect(await screen.findByText(/Showing 10 of 10 sessions/i)).toBeInTheDocument();

    // 4. Search with matching query ("Cardiology") -> 1 session (CS-1047 Riley Patel)
    const searchInput = screen.getByLabelText(/Search sessions/i);
    await user.type(searchInput, 'Cardiology');
    expect(await screen.findByText(/Showing 1 of 10 sessions/i)).toBeInTheDocument();
    expect(screen.getByText('Riley Patel')).toBeInTheDocument();

    // 5. Search with non-matching query -> shows empty state and Reset button
    await user.clear(searchInput);
    await user.type(searchInput, 'NoSuchPatient999');
    expect(
      await screen.findByRole('heading', {
        name: /No clinical sessions match your search or filters/i,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reset search & filters/i }));
    expect(await screen.findByText(/Showing 10 of 10 sessions/i)).toBeInTheDocument();

    // 6. Sort by patient name A-Z -> Alex Morgan appears in first row
    const sortSelect = screen.getByLabelText(/Sort by/i);
    await user.selectOptions(sortSelect, 'patient_asc');
    const sortedRows = within(
      screen.getByRole('table', { name: /Clinical sessions directory/i }),
    ).getAllByRole('row');
    expect(within(sortedRows[1]!).getByText('Alex Morgan')).toBeInTheDocument();
  });

  it('opens the exact clicked session on /clinician/sessions/:sessionId and preserves filter context on return', async () => {
    const user = userEvent.setup();
    renderApp(['/clinician/sessions?status=needs_review']);

    expect(await screen.findByText(/Showing 2 of 10 sessions/i)).toBeInTheDocument();

    // Click to review Riley Patel (CS-1047)
    const reviewLink = screen.getByRole('link', {
      name: /Review visit for Riley Patel \(CS-1047\)/i,
    });
    await user.click(reviewLink);

    // Verify CS-1047 detail page renders Riley Patel's Hypertension follow-up SOAP report
    expect(
      await screen.findByRole('heading', {
        name: /Riley Patel — Hypertension follow-up/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Essential hypertension, mildly above target\./i),
    ).toBeInTheDocument();

    // Return to Clinical sessions and verify the status=needs_review filter is preserved
    await user.click(screen.getByRole('link', { name: /Back to Clinical sessions/i }));
    expect(await screen.findByText(/Showing 2 of 10 sessions/i)).toBeInTheDocument();
  });

  it('displays clarification prompts and speaker-attributed transcript segments for CS-1042', async () => {
    renderApp(['/clinician/sessions/CS-1042']);

    expect(
      await screen.findByRole('heading', {
        name: /Alex Morgan — Diabetes follow-up/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /Clinical Clarification Questions \(2\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/What metformin strength is the patient currently taking\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Does the patient have any known drug allergies\?/i),
    ).toBeInTheDocument();

    const transcriptList = screen.getByRole('list', { name: /Visit transcript segments/i });
    expect(within(transcriptList).getAllByRole('listitem')).toHaveLength(4);
  });

  it('renders an informative error state when navigating to an unknown session ID', async () => {
    renderApp(['/clinician/sessions/CS-9999']);

    expect(
      await screen.findByRole('heading', {
        name: /Session CS-9999 could not be found/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Back to Clinical sessions/i }),
    ).toBeInTheDocument();
  });
});
