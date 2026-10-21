import { describe, expect, it } from 'vitest';
import {
  DEMO_USERS,
  INITIAL_DEMO_REPORTS,
  INITIAL_DEMO_SESSIONS,
} from '../../services/demo/fixtures';
import {
  DomainTransitionError,
  canApproveAndFinalizeReport,
  canPatientViewReport,
  deriveSessionDisplayState,
  isSessionEligibleForCohortAnalytics,
  transitionApproveAndFinalizeReport,
  transitionCompleteDraftRegeneration,
  transitionEditReport,
  transitionRejectDraftStartRegeneration,
  transitionReleaseReportToPatient,
  transitionReopenClarification,
  transitionResolveClarifications,
  transitionSaveDraft,
} from '../state-machines';

describe('CoSign Domain State Machines & Revision Integrity', () => {
  const drLee = DEMO_USERS.find((u) => u.id === 'usr-clinician-lee')!;
  const analyst = DEMO_USERS.find((u) => u.id === 'usr-analyst-rivera')!;
  const patientAlex = DEMO_USERS.find((u) => u.id === 'usr-patient-morgan')!;

  const getFixture = (sessionId: string) => {
    const session = structuredClone(INITIAL_DEMO_SESSIONS.find((s) => s.id === sessionId)!);
    const report = structuredClone(INITIAL_DEMO_REPORTS[sessionId]!);
    return { session, report };
  };

  it('derives accurate combined display states from orthogonal lifecycles', () => {
    const cs1042 = INITIAL_DEMO_SESSIONS.find((s) => s.id === 'CS-1042')!;
    expect(deriveSessionDisplayState(cs1042)).toEqual({
      code: 'CLARIFICATION_NEEDED',
      badgeLabel: 'Clarification needed',
      badgeTone: 'warning',
      nextStepLabel: 'Review visit',
      needsClinicianAttention: true,
    });

    const cs1047 = INITIAL_DEMO_SESSIONS.find((s) => s.id === 'CS-1047')!;
    expect(deriveSessionDisplayState(cs1047).code).toBe('NEEDS_REVIEW');

    const cs1045 = INITIAL_DEMO_SESSIONS.find((s) => s.id === 'CS-1045')!;
    expect(deriveSessionDisplayState(cs1045).code).toBe('PROCESSING_INTERRUPTED');

    const cs1043 = INITIAL_DEMO_SESSIONS.find((s) => s.id === 'CS-1043')!;
    expect(deriveSessionDisplayState(cs1043).code).toBe('RELEASED');
  });

  it('saving a draft preserves clarification-blocked status and does not allow premature approval', () => {
    const { session, report } = getFixture('CS-1042');
    expect(session.review.status).toBe('draft_requires_clarification');
    expect(session.review.isDraftSaved).toBe(false);

    const savedSession = transitionSaveDraft({
      user: drLee,
      session,
      report,
      expectedRevision: 1,
      nowIso: '2026-10-06T09:50:00-04:00',
    });

    // Must remain blocked by clarifications even though isDraftSaved is true
    expect(savedSession.review.isDraftSaved).toBe(true);
    expect(savedSession.review.status).toBe('draft_requires_clarification');
    expect(deriveSessionDisplayState(savedSession).code).toBe('DRAFT_SAVED_NEEDS_CLARIFICATION');
    expect(canApproveAndFinalizeReport(drLee, savedSession, report)).toBe(false);

    expect(() =>
      transitionApproveAndFinalizeReport({
        user: drLee,
        session: savedSession,
        report,
        expectedRevision: 1,
        nowIso: '2026-10-06T09:51:00-04:00',
      }),
    ).toThrowError(DomainTransitionError);
  });

  it('editing a report while clarifications are open increments revision, preserves v1, and stays clarification-blocked', () => {
    const { session, report } = getFixture('CS-1042');

    const { session: editedSession, report: editedReport } = transitionEditReport({
      user: drLee,
      session,
      report,
      expectedRevision: 1,
      soapUpdates: {
        subjective: 'Updated subjective note while clarification questions remain open.',
      },
      nowIso: '2026-10-06T09:52:00-04:00',
    });

    expect(editedReport.currentRevision).toBe(2);
    expect(editedReport.revisions).toHaveLength(2);
    expect(editedReport.revisions[0]?.revisionNumber).toBe(1);
    expect(editedReport.revisions[1]?.revisionNumber).toBe(2);
    expect(editedReport.revisions[1]?.origin).toBe('clinician_edit');
    expect(editedSession.review.status).toBe('draft_requires_clarification');
    expect(editedSession.review.currentRevision).toBe(2);
  });

  it('resolving all clarifications appends a new revision, preserves prior revisions, and transitions to draft_ready_for_approval', () => {
    const { session, report } = getFixture('CS-1042');

    const { session: resolvedSession, report: resolvedReport } = transitionResolveClarifications({
      user: drLee,
      session,
      report,
      expectedRevision: 1,
      answers: [
        { questionId: 'clar-1042-med', responseText: 'Metformin 1,000 mg twice daily confirmed.' },
        { questionId: 'clar-1042-allergy', responseText: 'No known drug allergies confirmed.' },
      ],
      nowIso: '2026-10-06T09:55:00-04:00',
    });

    expect(resolvedSession.review.status).toBe('draft_ready_for_approval');
    expect(resolvedSession.review.unresolvedClarificationCount).toBe(0);
    expect(resolvedSession.review.currentRevision).toBe(2);
    expect(resolvedReport.currentRevision).toBe(2);
    expect(resolvedReport.revisions).toHaveLength(2);
    expect(resolvedReport.revisions[0]?.revisionNumber).toBe(1);
    expect(resolvedReport.revisions[1]?.origin).toBe('clinician_clarification');
    expect(canApproveAndFinalizeReport(drLee, resolvedSession, resolvedReport)).toBe(true);
  });

  it('rejecting a draft and completing regeneration preserves rejected revision metadata and increments revision', () => {
    const { session, report } = getFixture('CS-1047');
    expect(report.currentRevision).toBe(1);

    const { session: regenRunningSession, report: rejectedReport } =
      transitionRejectDraftStartRegeneration({
        user: drLee,
        session,
        report,
        expectedRevision: 1,
        rejectionReason: 'Include explicit lifestyle counseling and foot exam details in Plan.',
        jobId: 'job-regen-1047',
        nowIso: '2026-10-06T10:15:00-04:00',
      });

    expect(regenRunningSession.processing.status).toBe('running');
    expect(regenRunningSession.processing.kind).toBe('draft_regeneration');
    expect(deriveSessionDisplayState(regenRunningSession).code).toBe('REGENERATING_DRAFT');
    expect(rejectedReport.revisions[0]?.rejectedAt).toBe('2026-10-06T10:15:00-04:00');
    expect(rejectedReport.revisions[0]?.rejectionReason).toContain('explicit lifestyle counseling');

    const { session: regenCompleteSession, report: regeneratedReport } =
      transitionCompleteDraftRegeneration({
        session: regenRunningSession,
        report: rejectedReport,
        regeneratedSoap: {
          ...rejectedReport.soap,
          plan: 'Continue current antihypertensive therapy; added lifestyle counseling and annual foot exam.',
        },
        nowIso: '2026-10-06T10:16:00-04:00',
      });

    expect(regenCompleteSession.processing.status).toBe('completed');
    expect(regenCompleteSession.review.currentRevision).toBe(2);
    expect(regeneratedReport.currentRevision).toBe(2);
    expect(regeneratedReport.revisions).toHaveLength(2);
    expect(regeneratedReport.revisions[0]?.revisionNumber).toBe(1);
    expect(regeneratedReport.revisions[1]?.revisionNumber).toBe(2);
    expect(regeneratedReport.revisions[1]?.origin).toBe('ai_regenerated_draft');
  });

  it('prevents stale approvals when expectedRevision does not match currentRevision', () => {
    const { session, report } = getFixture('CS-1047');

    const { session: v2Session, report: v2Report } = transitionEditReport({
      user: drLee,
      session,
      report,
      expectedRevision: 1,
      soapUpdates: { plan: 'Updated plan in v2.' },
      nowIso: '2026-10-06T10:20:00-04:00',
    });

    // Attempting to approve revision 1 when report is now on revision 2 must fail with REVISION_CONFLICT
    expect(() =>
      transitionApproveAndFinalizeReport({
        user: drLee,
        session: v2Session,
        report: v2Report,
        expectedRevision: 1,
        nowIso: '2026-10-06T10:21:00-04:00',
      }),
    ).toThrowError(/Stale report revision/);

    // Approving with current expectedRevision (2) succeeds
    const approvedSession = transitionApproveAndFinalizeReport({
      user: drLee,
      session: v2Session,
      report: v2Report,
      expectedRevision: 2,
      nowIso: '2026-10-06T10:22:00-04:00',
    });

    expect(approvedSession.review.status).toBe('approved_finalized');
    expect(approvedSession.review.approvedRevision).toBe(2);
    // Approving does NOT automatically release to patient
    expect(approvedSession.release.status).toBe('not_released');
    // Approving initiates privacy de-identification
    expect(approvedSession.privacy.status).toBe('deidentifying');
  });

  it('enforces role and ownership guards across clinician, analyst, and patient personas', () => {
    const { session: cs1047, report: rpt1047 } = getFixture('CS-1047');
    // Analyst cannot approve or edit a clinical report
    expect(() =>
      transitionApproveAndFinalizeReport({
        user: analyst,
        session: cs1047,
        report: rpt1047,
        expectedRevision: 1,
        nowIso: '2026-10-06T10:30:00-04:00',
      }),
    ).toThrowError(DomainTransitionError);

    // Patient Alex Morgan cannot view CS-1042 (not approved/released)
    const cs1042 = INITIAL_DEMO_SESSIONS.find((s) => s.id === 'CS-1042')!;
    expect(canPatientViewReport(patientAlex, cs1042)).toBe(false);

    // Patient Alex Morgan CAN view his historical released visit CS-0988
    const cs0988 = INITIAL_DEMO_SESSIONS.find((s) => s.id === 'CS-0988')!;
    expect(canPatientViewReport(patientAlex, cs0988)).toBe(true);

    // Once CS-1042 is resolved, approved, and released, Alex can view it
    const { report: rpt1042 } = getFixture('CS-1042');
    const resolved = transitionResolveClarifications({
      user: drLee,
      session: cs1042,
      report: rpt1042,
      expectedRevision: 1,
      answers: [
        { questionId: 'clar-1042-med', responseText: 'Confirmed 1,000 mg twice daily.' },
        { questionId: 'clar-1042-allergy', responseText: 'Confirmed NKDA.' },
      ],
      nowIso: '2026-10-06T10:31:00-04:00',
    });
    const approved = transitionApproveAndFinalizeReport({
      user: drLee,
      session: resolved.session,
      report: resolved.report,
      expectedRevision: 2,
      nowIso: '2026-10-06T10:32:00-04:00',
    });
    expect(canPatientViewReport(patientAlex, approved)).toBe(false);
    expect(isSessionEligibleForCohortAnalytics(approved)).toBe(false);

    const released = transitionReleaseReportToPatient({
      user: drLee,
      session: approved,
      report: resolved.report,
      expectedRevision: 2,
      nowIso: '2026-10-06T10:33:00-04:00',
    });
    expect(canPatientViewReport(patientAlex, released)).toBe(true);

    // CS-1043 has both clinical approval and 2-pass privacy verification
    const cs1043 = INITIAL_DEMO_SESSIONS.find((s) => s.id === 'CS-1043')!;
    expect(isSessionEligibleForCohortAnalytics(cs1043)).toBe(true);
  });

  it('supports reopening a resolved clarification question and rejects empty SOAP or clarification submissions', () => {
    const { session, report } = getFixture('CS-1042');

    // Empty clarification submission must fail
    expect(() =>
      transitionResolveClarifications({
        user: drLee,
        session,
        report,
        expectedRevision: 1,
        answers: [{ questionId: 'clar-1042-med', responseText: '   ' }],
        nowIso: '2026-10-06T10:35:00-04:00',
      }),
    ).toThrowError(DomainTransitionError);

    // Resolve both clarifications -> status becomes draft_ready_for_approval (v2)
    const resolved = transitionResolveClarifications({
      user: drLee,
      session,
      report,
      expectedRevision: 1,
      answers: [
        { questionId: 'clar-1042-med', responseText: 'Metformin 1,000 mg twice daily.' },
        { questionId: 'clar-1042-allergy', responseText: 'No known drug allergies.' },
      ],
      nowIso: '2026-10-06T10:36:00-04:00',
    });
    expect(resolved.session.review.status).toBe('draft_ready_for_approval');
    expect(resolved.session.review.unresolvedClarificationCount).toBe(0);

    // Reopen Question 1 -> status returns to draft_requires_clarification (v3) with 1 unresolved
    const reopened = transitionReopenClarification({
      user: drLee,
      session: resolved.session,
      report: resolved.report,
      expectedRevision: 2,
      questionId: 'clar-1042-med',
      nowIso: '2026-10-06T10:37:00-04:00',
    });
    expect(reopened.session.review.status).toBe('draft_requires_clarification');
    expect(reopened.session.review.unresolvedClarificationCount).toBe(1);
    expect(reopened.report.currentRevision).toBe(3);

    // Empty SOAP section edit must fail
    expect(() =>
      transitionEditReport({
        user: drLee,
        session: reopened.session,
        report: reopened.report,
        expectedRevision: 3,
        soapUpdates: { subjective: '   ' },
        nowIso: '2026-10-06T10:38:00-04:00',
      }),
    ).toThrowError(DomainTransitionError);
  });
});
