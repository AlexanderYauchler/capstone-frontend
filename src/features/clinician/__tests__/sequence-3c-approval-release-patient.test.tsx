import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../../../app/providers/AppProviders';
import { appRoutes } from '../../../app/router/routes';
import { createDemoServices } from '../../../services/demo/demo-services';
import { DemoStore } from '../../../services/demo/demo-store';

function renderWorkbenchApp(
  initialEntries: string[] = ['/clinician/sessions/CS-1042'],
  customStore?: DemoStore,
) {
  const store = customStore ?? new DemoStore();
  const services = createDemoServices(store);

  const router = createMemoryRouter(appRoutes, {
    initialEntries,
  });

  const utils = render(
    <AppProviders customStore={store}>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return { ...utils, store, services, router };
}

describe('CoSign Sequence 3C — Clinician Approval, Finalization & Patient Release', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('blocks approval when clarification questions are unresolved or when unsaved edits exist, and prevents release before finalization', async () => {
    const user = userEvent.setup();
    const { services } = renderWorkbenchApp(['/clinician/sessions/CS-1042']);

    expect(
      await screen.findByRole('heading', { name: /Alex Morgan — Diabetes follow-up/i }),
    ).toBeInTheDocument();

    // 1. CS-1042 has 2 unresolved clarifications: Approve button is disabled & explains why
    const approveBtn = screen.getByRole('button', {
      name: /Approve & Finalize Report \(v1\)/i,
    });
    expect(approveBtn).toBeDisabled();
    expect(
      screen.getByText(/Resolve 2 open clinical clarification questions before approving/i),
    ).toBeInTheDocument();

    // Service layer also rejects premature approval or premature release
    await expect(
      services.review.approveAndFinalize({ sessionId: 'CS-1042', expectedRevision: 1 }),
    ).rejects.toThrow(/clarification/i);
    await expect(
      services.review.releaseToPatient({ sessionId: 'CS-1042', expectedRevision: 1 }),
    ).rejects.toThrow(/Only an approved and finalized clinical report can be released/i);

    // 2. Answer and save Question 1 and Question 2 on CS-1042 -> advances to v3 (Needs review)
    const q1Input = screen.getByLabelText(/Clinician clarification response \(Question 1\)/i);
    await user.type(q1Input, 'Metformin 1,000 mg twice daily confirmed in EHR.');
    const saveQ1Buttons = screen.getAllByRole('button', {
      name: /^Save Clarification Response$/i,
    });
    await user.click(saveQ1Buttons[0]!);
    expect(await screen.findByText(/1 Unresolved · 1 Resolved/i)).toBeInTheDocument();

    const q2Input = screen.getByLabelText(/Clinician clarification response \(Question 2\)/i);
    await user.type(q2Input, 'No known drug allergies confirmed with patient.');
    const remainingSaveBtn = screen.getByRole('button', {
      name: /^Save Clarification Response$/i,
    });
    await user.click(remainingSaveBtn);

    // Approve button for v3 is now enabled!
    const approveV3Btn = await screen.findByRole('button', {
      name: /Approve & Finalize Report \(v3\)/i,
    });
    expect(approveV3Btn).toBeEnabled();

    // 3. Introduce an unsaved SOAP edit -> Approve button immediately becomes disabled with unsaved-edit warning
    const planTextarea = screen.getByLabelText(/^Plan$/i);
    await user.type(planTextarea, ' Recheck fasting glucose log.');

    expect(
      screen.getByRole('button', { name: /Approve & Finalize Report \(v3\)/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        /Save or discard your unsaved SOAP section edits before approving Revision v3/i,
      ),
    ).toBeInTheDocument();
  });

  it('completes end-to-end approval, finalization lock, patient release, audit logging, dashboard KPI sync, refresh persistence, and demo reset', async () => {
    const user = userEvent.setup();
    const firstRender = renderWorkbenchApp(['/clinician/sessions/CS-1042']);

    expect(
      await screen.findByRole('heading', { name: /Alex Morgan — Diabetes follow-up/i }),
    ).toBeInTheDocument();

    // 1. Resolve the 2 clarifications on CS-1042 -> v3
    const q1Input = screen.getByLabelText(/Clinician clarification response \(Question 1\)/i);
    await user.type(q1Input, 'Metformin 1,000 mg twice daily confirmed.');
    const saveQ1Buttons = screen.getAllByRole('button', {
      name: /^Save Clarification Response$/i,
    });
    await user.click(saveQ1Buttons[0]!);
    expect(await screen.findByText(/1 Unresolved · 1 Resolved/i)).toBeInTheDocument();

    const q2Input = screen.getByLabelText(/Clinician clarification response \(Question 2\)/i);
    await user.type(q2Input, 'No known drug allergies confirmed.');
    const remainingSaveBtn = screen.getByRole('button', {
      name: /^Save Clarification Response$/i,
    });
    await user.click(remainingSaveBtn);
    expect(await screen.findByText(/All 2 Resolved/i)).toBeInTheDocument();

    // 2. Edit Plan section and Save Draft -> v4
    const planTextarea = await screen.findByLabelText(/^Plan$/i);
    await user.clear(planTextarea);
    await user.type(
      planTextarea,
      'Continue metformin 1,000 mg twice daily; NKDA confirmed. Order HbA1c and CMP; follow up in 2 weeks.',
    );
    const saveDraftButtons = screen.getAllByRole('button', { name: /^Save Draft$/i });
    await user.click(saveDraftButtons[0]!);

    // 3. Click "Approve & Finalize Report (v4)" -> opens confirmation modal with Simulated Demo Co-Signature disclaimer
    const approveV4Btn = await screen.findByRole('button', {
      name: /Approve & Finalize Report \(v4\)/i,
    });
    expect(approveV4Btn).toBeEnabled();
    await user.click(approveV4Btn);

    const approveDialog = await screen.findByRole('dialog');
    expect(
      within(approveDialog).getByText(/Simulated Electronic Co-Signature \(Demo Mode\)/i),
    ).toBeInTheDocument();
    expect(within(approveDialog).getByText(/Approving Revision v4/i)).toBeInTheDocument();

    await user.click(
      within(approveDialog).getByRole('button', {
        name: /Confirm Approval & Finalize v4/i,
      }),
    );

    // 4. Verify report is now Approved · Not released (locked against silent edits, not yet visible in Patient Portal)
    expect(
      (await screen.findAllByText(/Approved · Not released/i)).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByLabelText(/^Plan$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Revision v4 Locked/i)).toBeInTheDocument();

    // Duplicate approval or silent edit is rejected by the service layer
    await expect(
      firstRender.services.review.approveAndFinalize({
        sessionId: 'CS-1042',
        expectedRevision: 4,
      }),
    ).rejects.toThrow(/already approved and finalized/i);
    await expect(
      firstRender.services.review.editReport({
        sessionId: 'CS-1042',
        expectedRevision: 4,
        plan: 'Attempt silent overwrite after finalization',
      }),
    ).rejects.toThrow(/Cannot edit a report that is already finalized/i);

    // Before patient release, patient portal still rejects access to rep-1042
    await expect(
      firstRender.services.patientPortal.getReleasedReportDetail('pat-alex-morgan', 'rep-1042'),
    ).rejects.toThrow(/has not yet been released to the patient portal/i);

    // 5. Explicitly Release Report to Patient Portal via confirmation modal
    const releaseBtn = screen.getByRole('button', {
      name: /Release Report to Patient Portal/i,
    });
    await user.click(releaseBtn);

    const releaseDialog = await screen.findByRole('dialog');
    expect(
      within(releaseDialog).getByText(/Recipient: Alex Morgan \(pat-alex-morgan\)/i),
    ).toBeInTheDocument();
    expect(within(releaseDialog).getByText(/Withheld \(Clinician-Only\)/i)).toBeInTheDocument();

    await user.click(
      within(releaseDialog).getByRole('button', {
        name: /Confirm Release to Alex Morgan/i,
      }),
    );

    expect(
      await screen.findByText(/Visible in Patient Portal \(rep-1042\)/i),
    ).toBeInTheDocument();

    // Duplicate release is prevented by the service layer
    await expect(
      firstRender.services.review.releaseToPatient({
        sessionId: 'CS-1042',
        expectedRevision: 4,
      }),
    ).rejects.toThrow(/already been released/i);

    // Verify audit trail recorded REPORT_APPROVED_FINALIZED and REPORT_RELEASED_TO_PATIENT
    const auditEvents = await firstRender.services.admin.listAuditEvents();
    const cs1042AuditActions = auditEvents
      .filter((e) => e.sessionId === 'CS-1042')
      .map((e) => e.action);
    expect(cs1042AuditActions).toContain('REPORT_APPROVED_FINALIZED');
    expect(cs1042AuditActions).toContain('REPORT_RELEASED_TO_PATIENT');

    // Verify dashboard metrics updated (releasedTodayCount incremented from 3 to 4, clarificationNeededSessionsCount = 0)
    const metrics = await firstRender.services.sessions.getDashboardMetrics();
    expect(metrics.clarificationNeededSessionsCount).toBe(0);
    expect(metrics.releasedTodayCount).toBe(4);

    // 6. Simulate page refresh & switch to Patient Portal to verify released report v4 is visible to Alex Morgan
    firstRender.unmount();

    const patientRender = renderWorkbenchApp(['/login']);
    await user.click(await screen.findByRole('button', { name: /Continue as Patient/i }));

    expect(await screen.findByRole('heading', { name: /Welcome, Alex/i })).toBeInTheDocument();
    expect(await screen.findByText(/3 Released Reports/i)).toBeInTheDocument();

    // Click to open the newly released report rep-1042
    await user.click(screen.getByRole('link', { name: /Open latest report/i }));

    expect(
      await screen.findByRole('heading', {
        name: /Diabetes follow-up — Visit Summary & Care Plan/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Continue metformin 1,000 mg twice daily; NKDA confirmed\. Order HbA1c and CMP; follow up in 2 weeks\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Metformin: 1,000 mg twice daily, confirmed by your clinician\./i),
    ).toBeInTheDocument();

    // Ensure clinician-only data (transcript quotes, clarification prompts, revision history) is NEVER exposed in patient view
    expect(
      screen.queryByText(/I take metformin twice a day, but I can’t remember the strength/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/What metformin strength is the patient currently taking/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Draft Revision History/i)).not.toBeInTheDocument();

    // Also verify service-layer payload stripped revisions, clarifications, and provenanceFindings
    const sanitizedDetail = await patientRender.services.patientPortal.getReleasedReportDetail(
      'pat-alex-morgan',
      'rep-1042',
    );
    expect(sanitizedDetail.report.clarifications).toHaveLength(0);
    expect(sanitizedDetail.report.revisions).toHaveLength(0);
    expect(sanitizedDetail.report.provenanceFindings).toHaveLength(0);

    // 7. Reset Demo Data cleanly restores canonical seed state
    await user.click(screen.getByRole('button', { name: /Reset demo state/i }));
    await expect(
      patientRender.services.patientPortal.getReleasedReportDetail('pat-alex-morgan', 'rep-1042'),
    ).rejects.toThrow(/still under clinician review/i);
  });

  it('denies patient access to unreleased drafts and to other patients’ released reports', async () => {
    const patientStore = new DemoStore({
      persistToSessionStorage: false,
      initialRole: 'patient',
    });

    // 1. Attempting to open Alex Morgan's own unreleased draft (rep-1042) shows access guard alert
    const draftRender = renderWorkbenchApp(['/patient/reports/rep-1042'], patientStore);
    const draftAlert = await screen.findByRole('alert');
    expect(
      within(draftAlert).getByText(/Report rep-1042 is not available in your portal/i),
    ).toBeInTheDocument();
    expect(within(draftAlert).getByText(/still under clinician review/i)).toBeInTheDocument();
    draftRender.unmount();

    // 2. Attempting to open Riley Patel's released report (rep-1043) shows cross-patient access denial
    const otherPatientRender = renderWorkbenchApp(['/patient/reports/rep-1043'], patientStore);
    const otherPatientAlert = await screen.findByRole('alert');
    expect(
      within(otherPatientAlert).getByText(
        /Access denied: This clinical report belongs to another patient record/i,
      ),
    ).toBeInTheDocument();
    otherPatientRender.unmount();
  });

  it('handles service failures during approval without corrupting session state', async () => {
    const user = userEvent.setup();
    const store = new DemoStore({ persistToSessionStorage: false });
    renderWorkbenchApp(['/clinician/sessions/CS-1047'], store);

    expect(
      await screen.findByRole('heading', { name: /Riley Patel — Hypertension follow-up/i }),
    ).toBeInTheDocument();

    // Spy on store.update to simulate a transient failure during sign-off
    const spy = vi.spyOn(store, 'update').mockImplementationOnce(() => {
      throw new Error('Simulated sign-off service outage.');
    });

    await user.click(screen.getByRole('button', { name: /Approve & Finalize Report \(v1\)/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /Confirm Approval & Finalize v1/i }),
    );

    const errorAlert = await screen.findByRole('alert');
    expect(within(errorAlert).getByText(/Simulated sign-off service outage/i)).toBeInTheDocument();

    // Verify store state was not corrupted and remains draft_ready_for_approval
    const sessionAfterError = store.getState().sessions.find((s) => s.id === 'CS-1047');
    expect(sessionAfterError?.review.status).toBe('draft_ready_for_approval');
    expect(sessionAfterError?.release.status).toBe('not_released');

    spy.mockRestore();
  });
});
