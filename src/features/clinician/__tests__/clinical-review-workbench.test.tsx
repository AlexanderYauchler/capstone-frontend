import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../../../app/providers/AppProviders';
import { appRoutes } from '../../../app/router/routes';
import { DemoStore } from '../../../services/demo/demo-store';

function renderWorkbench(
  initialEntries: string[] = ['/clinician/sessions/CS-1042'],
  customStore?: DemoStore,
) {
  const router = createMemoryRouter(appRoutes, { initialEntries });
  return {
    router,
    ...render(
      <AppProviders customStore={customStore}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}

describe('CoSign Sequence 3B — Functional Clinical Review Workbench', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('edits SOAP sections, saves draft changes as a new revision, compares with v1 AI draft, and persists across page refreshes', async () => {
    const user = userEvent.setup();
    const firstRender = renderWorkbench(['/clinician/sessions/CS-1047']);

    expect(
      await screen.findByRole('heading', {
        name: /Riley Patel — Hypertension follow-up/i,
      }),
    ).toBeInTheDocument();

    // Edit Subjective and Plan sections
    const subjectiveInput = screen.getByLabelText(/^Subjective$/i);
    const planInput = screen.getByLabelText(/^Plan$/i);

    await user.clear(subjectiveInput);
    await user.type(
      subjectiveInput,
      'Patient reports mild morning headache resolving after breakfast; adherent to lisinopril 10 mg daily.',
    );

    await user.clear(planInput);
    await user.type(
      planInput,
      'Continue lisinopril 10 mg daily, reinforce <2g/day sodium intake, and review home BP log in 4 weeks.',
    );

    // Unsaved changes badge is visible
    expect(screen.getByText(/^Unsaved SOAP Edits$/i)).toBeInTheDocument();

    // Save Draft via the workbench action button
    const saveButtons = screen.getAllByRole('button', { name: /^Save Draft$/i });
    await user.click(saveButtons[0]!);

    // Verify revision incremented to v2 and save status banner is displayed
    expect(
      await screen.findByText(/Draft saved as Revision v2/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /Structured Clinical Report \(Revision v2\)/i,
      }),
    ).toBeInTheDocument();

    // Toggle "Compare Original AI Draft (v1)" to verify original AI text is preserved
    await user.click(
      screen.getByRole('button', { name: /Compare Original AI Draft \(v1\)/i }),
    );
    expect(
      screen.getAllByText(/Original AI-Generated Draft \(Revision v1\)/i).length,
    ).toBeGreaterThan(0);

    // Simulate browser refresh (unmount & re-render from sessionStorage)
    firstRender.unmount();

    renderWorkbench(['/clinician/sessions/CS-1047']);
    expect(
      await screen.findByRole('heading', {
        name: /Structured Clinical Report \(Revision v2\)/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Subjective$/i)).toHaveValue(
      'Patient reports mild morning headache resolving after breakfast; adherent to lisinopril 10 mg daily.',
    );
    expect(screen.getByLabelText(/^Plan$/i)).toHaveValue(
      'Continue lisinopril 10 mg daily, reinforce <2g/day sodium intake, and review home BP log in 4 weeks.',
    );
  });

  it('warns before discarding unsaved SOAP changes when navigating away or clicking Discard', async () => {
    const user = userEvent.setup();
    renderWorkbench(['/clinician/sessions/CS-1047']);

    const objectiveInput = await screen.findByLabelText(/^Objective$/i);
    await user.clear(objectiveInput);
    await user.type(objectiveInput, 'Updated home BP average 132/82 mmHg.');

    // Attempt to navigate back to Clinical sessions while unsaved edits exist
    await user.click(screen.getByRole('link', { name: /Back to Clinical sessions/i }));

    // Unsaved changes confirmation dialog appears and blocks navigation
    const dialog = await screen.findByRole('dialog', {
      name: /Discard unsaved clinical review changes\?/i,
    });
    expect(dialog).toBeInTheDocument();

    // Choose "Keep Reviewing" -> stays on CS-1047 with edits intact
    await user.click(within(dialog).getByRole('button', { name: /Keep Reviewing/i }));
    expect(screen.getByLabelText(/^Objective$/i)).toHaveValue(
      'Updated home BP average 132/82 mmHg.',
    );

    // Now click "Back to Clinical sessions" again and confirm discard
    await user.click(screen.getByRole('link', { name: /Back to Clinical sessions/i }));
    const dialogAgain = await screen.findByRole('dialog', {
      name: /Discard unsaved clinical review changes\?/i,
    });
    await user.click(
      within(dialogAgain).getByRole('button', { name: /Discard Unsaved Changes/i }),
    );

    // Navigation proceeds to Clinical sessions
    expect(
      await screen.findByRole('heading', { name: /^Clinical sessions$/i }),
    ).toBeInTheDocument();
  });

  it('validates clarification responses, resolves questions interactively, persists across refresh, and allows reopening', async () => {
    const user = userEvent.setup();
    const firstRender = renderWorkbench(['/clinician/sessions/CS-1042']);

    expect(
      await screen.findByRole('heading', {
        name: /Clinical Clarification Questions \(2\)/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 Unresolved · 0 Resolved/i)).toBeInTheDocument();

    // 1. Attempt to save Question 1 with an empty response -> shows validation alert
    const saveQ1Buttons = screen.getAllByRole('button', {
      name: /^Save Clarification Response$/i,
    });
    await user.click(saveQ1Buttons[0]!);
    expect(
      await screen.findByText(/Please enter a clinical clarification response before saving/i),
    ).toBeInTheDocument();

    // 2. Typing text into Question 1 does NOT automatically resolve it before clicking Save
    const q1Input = screen.getByLabelText(
      /Clinician clarification response \(Question 1\)/i,
    );
    await user.type(q1Input, 'Metformin 1,000 mg twice daily confirmed in EHR.');
    expect(
      screen.getByText(/Unsaved Response · Requires Save/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 Unresolved · 0 Resolved/i)).toBeInTheDocument();

    // 3. Click Save Clarification Response for Question 1 -> becomes 1 Unresolved · 1 Resolved
    await user.click(saveQ1Buttons[0]!);
    expect(await screen.findByText(/1 Unresolved · 1 Resolved/i)).toBeInTheDocument();

    // 4. Answer and save Question 2 -> All 2 Resolved, session transitions to Needs review
    const q2Input = screen.getByLabelText(
      /Clinician clarification response \(Question 2\)/i,
    );
    await user.type(q2Input, 'No known drug allergies confirmed with patient.');
    const remainingSaveBtn = screen.getByRole('button', {
      name: /^Save Clarification Response$/i,
    });
    await user.click(remainingSaveBtn);

    expect(await screen.findByText(/All 2 Resolved/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Needs review$/i).length).toBeGreaterThan(0);

    // 5. Refresh page and verify resolved clarifications persist
    firstRender.unmount();
    renderWorkbench(['/clinician/sessions/CS-1042']);
    expect(await screen.findByText(/All 2 Resolved/i)).toBeInTheDocument();
    // The saved answer shows on the clarification card and is applied to the Plan section.
    expect(
      screen.getAllByText(/Metformin 1,000 mg twice daily confirmed in EHR\./i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      (screen.getByLabelText(/Plan/i, { selector: 'textarea' }) as HTMLTextAreaElement).value,
    ).toContain('Clinician-confirmed: Metformin 1,000 mg twice daily confirmed in EHR');

    // 6. Reopen Question 1 -> status returns to Clarification needed (1 Unresolved · 1 Resolved)
    const reopenButtons = screen.getAllByRole('button', { name: /Reopen Question/i });
    await user.click(reopenButtons[0]!);
    expect(await screen.findByText(/1 Unresolved · 1 Resolved/i)).toBeInTheDocument();
  });

  it('supports transcript search, source evidence selection, and honest indication of unlinked statements', async () => {
    const user = userEvent.setup();
    renderWorkbench(['/clinician/sessions/CS-1042']);

    expect(
      await screen.findByRole('heading', {
        name: /Speaker-Attributed Transcript & Evidence/i,
      }),
    ).toBeInTheDocument();

    // Verify honest indication when a SOAP section or finding lacks a direct transcript source link
    expect(
      screen.getByText(
        /No direct transcript source linked to Assessment \(clinical synthesis\)/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Orders \(HbA1c and metabolic panel\) — No direct transcript segment linked/i),
    ).toBeInTheDocument();

    // Click a genuine source-linked provenance chip ("Symptoms · 00:28")
    const symptomsChip = screen.getByRole('button', { name: /Symptoms · 00:28/i });
    await user.click(symptomsChip);
    expect(symptomsChip).toHaveAttribute('aria-pressed', 'true');
    expect(
      await screen.findByText(/Selected Evidence · 00:28 \(Symptoms reported\)/i),
    ).toBeInTheDocument();

    // Search within the transcript for "metformin" -> filters to 1 of 4 segments
    const transcriptSearch = screen.getByLabelText(/Search within transcript/i);
    await user.type(transcriptSearch, 'metformin');
    expect(await screen.findByText(/1 of 4 segments/i)).toBeInTheDocument();
    const transcriptList = screen.getByRole('list', { name: /Visit transcript segments/i });
    expect(
      within(transcriptList).getByText(
        /I take metformin twice a day, but I can’t remember the strength\./i,
      ),
    ).toBeInTheDocument();
  });

  it('enforces read-only mode on finalized reports, handles ungenerated reports, and blocks unauthorized roles', async () => {
    // 1. Finalized & released session (CS-1043) is read-only (no Save Draft button or editable textareas)
    const finalizedRender = renderWorkbench(['/clinician/sessions/CS-1043']);
    expect(
      await screen.findByRole('heading', {
        name: /Riley Patel — Wellness consultation/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Finalized Report · Read-Only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Save Draft$/i })).not.toBeInTheDocument();
    finalizedRender.unmount();

    // 2. Processing session (CS-1048) shows the simulated processing progress instead of a draft
    const processingRender = renderWorkbench(['/clinician/sessions/CS-1048']);
    expect(
      await screen.findByRole('heading', {
        name: /Preparing the draft report/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No real transcription or AI service is called/i)).toBeInTheDocument();
    processingRender.unmount();

    // 3. Patient role attempting to access /clinician/sessions/CS-1042 is blocked by RoleGuard
    const patientStore = new DemoStore({
      persistToSessionStorage: false,
      initialRole: 'patient',
    });
    renderWorkbench(['/clinician/sessions/CS-1042'], patientStore);
    expect(
      await screen.findByRole('heading', { name: /Access restricted/i }),
    ).toBeInTheDocument();
  });

  it('displays an error alert with Retry Save when a service error occurs during draft saving', async () => {
    const user = userEvent.setup();
    const store = new DemoStore({ persistToSessionStorage: false });
    renderWorkbench(['/clinician/sessions/CS-1047'], store);

    const planInput = await screen.findByLabelText(/^Plan$/i);
    await user.clear(planInput);
    await user.type(planInput, 'Updated hypertension plan before simulated error.');

    // Simulate a transient store failure on the first save attempt
    const updateSpy = vi.spyOn(store, 'update').mockImplementationOnce(() => {
      throw new Error('Simulated transient storage failure while saving draft.');
    });

    const saveButtons = screen.getAllByRole('button', { name: /^Save Draft$/i });
    await user.click(saveButtons[0]!);

    // Error alert is displayed with Retry Save button
    expect(
      await screen.findByText(/Simulated transient storage failure while saving draft\./i),
    ).toBeInTheDocument();

    updateSpy.mockRestore();

    // Click Retry Save -> succeeds and increments revision to v2
    await user.click(screen.getByRole('button', { name: /Retry Save/i }));
    expect(
      await screen.findByText(/Draft saved as Revision v2/i),
    ).toBeInTheDocument();
  });
});
