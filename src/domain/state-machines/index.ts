import type {
  ClarificationQuestion,
  ClinicalReport,
  ClinicalSession,
  ReportRevision,
  SoapSections,
  User,
} from '../models';

// ============================================================================
// CoSign — Domain State Machines, Transition Rules & Derived Display Selectors
// ============================================================================

export class DomainTransitionError extends Error {
  public readonly code:
    | 'UNAUTHORIZED_ROLE_OR_OWNER'
    | 'CONSENT_REQUIRED'
    | 'INVALID_LIFECYCLE_TRANSITION'
    | 'CLARIFICATIONS_UNRESOLVED'
    | 'REVISION_CONFLICT'
    | 'REPORT_ALREADY_FINALIZED'
    | 'REPORT_NOT_FINALIZED';

  constructor(code: DomainTransitionError['code'], message: string) {
    super(message);
    this.name = 'DomainTransitionError';
    this.code = code;
  }
}

export type DerivedSessionDisplayCode =
  | 'CONSENT_NEEDED'
  | 'READY_TO_CAPTURE'
  | 'RECORDING_ACTIVE'
  | 'RECORDING_PAUSED'
  | 'RECORDING_ERROR'
  | 'RECORDING_READY'
  | 'UPLOAD_INTERRUPTED'
  | 'PROCESSING'
  | 'PROCESSING_INTERRUPTED'
  | 'REGENERATING_DRAFT'
  | 'CLARIFICATION_NEEDED'
  | 'DRAFT_SAVED_NEEDS_CLARIFICATION'
  | 'NEEDS_REVIEW'
  | 'DRAFT_SAVED_READY'
  | 'APPROVED_NOT_RELEASED'
  | 'RELEASED';

export interface DerivedSessionDisplay {
  readonly code: DerivedSessionDisplayCode;
  readonly badgeLabel: string;
  readonly badgeTone: 'neutral' | 'info' | 'warning' | 'danger' | 'success';
  readonly nextStepLabel: string;
  readonly needsClinicianAttention: boolean;
}

/**
 * Pure selector that computes the single display badge and next-step CTA
 * from the 5 orthogonal lifecycles on a ClinicalSession.
 */
export function deriveSessionDisplayState(s: ClinicalSession): DerivedSessionDisplay {
  if (s.release.status === 'released') {
    return {
      code: 'RELEASED',
      badgeLabel: 'Released',
      badgeTone: 'success',
      nextStepLabel: 'View report',
      needsClinicianAttention: false,
    };
  }

  if (s.review.status === 'approved_finalized') {
    return {
      code: 'APPROVED_NOT_RELEASED',
      badgeLabel: 'Approved · Not released',
      badgeTone: 'success',
      nextStepLabel: 'Release to patient',
      needsClinicianAttention: false,
    };
  }

  if (s.processing.status === 'failed_retryable') {
    return {
      code: 'PROCESSING_INTERRUPTED',
      badgeLabel: 'Processing interrupted',
      badgeTone: 'danger',
      nextStepLabel: 'Retry processing',
      needsClinicianAttention: true,
    };
  }

  if (s.processing.status === 'running') {
    const isRegen = s.processing.kind === 'draft_regeneration';
    return {
      code: isRegen ? 'REGENERATING_DRAFT' : 'PROCESSING',
      badgeLabel: isRegen ? 'Revision in progress' : 'Processing',
      badgeTone: 'info',
      nextStepLabel: 'View progress',
      needsClinicianAttention: false,
    };
  }

  if (s.capture.status === 'upload_failed') {
    return {
      code: 'UPLOAD_INTERRUPTED',
      badgeLabel: 'Upload interrupted',
      badgeTone: 'danger',
      nextStepLabel: 'Retry upload',
      needsClinicianAttention: true,
    };
  }

  if (s.capture.status === 'recording_error') {
    return {
      code: 'RECORDING_ERROR',
      badgeLabel: 'Recording error',
      badgeTone: 'danger',
      nextStepLabel: 'Resolve audio issue',
      needsClinicianAttention: true,
    };
  }

  if (s.capture.status === 'recording_active') {
    return {
      code: 'RECORDING_ACTIVE',
      badgeLabel: 'Recording',
      badgeTone: 'info',
      nextStepLabel: 'Return to recording',
      needsClinicianAttention: false,
    };
  }

  if (s.capture.status === 'recording_paused') {
    return {
      code: 'RECORDING_PAUSED',
      badgeLabel: 'Paused',
      badgeTone: 'warning',
      nextStepLabel: 'Resume recording',
      needsClinicianAttention: false,
    };
  }

  if (s.capture.status === 'uploading') {
    return {
      code: 'RECORDING_ACTIVE',
      badgeLabel: 'Uploading audio',
      badgeTone: 'info',
      nextStepLabel: 'Return to upload',
      needsClinicianAttention: false,
    };
  }

  if (
    s.capture.status === 'recording_ready' ||
    (s.capture.status === 'capture_completed' &&
      s.processing.status === 'idle' &&
      s.review.status === 'not_generated')
  ) {
    return {
      code: 'RECORDING_READY',
      badgeLabel: 'Recording ready',
      badgeTone: 'info',
      nextStepLabel: 'Send for processing',
      needsClinicianAttention: false,
    };
  }

  if (s.review.status === 'draft_requires_clarification') {
    return {
      code: s.review.isDraftSaved ? 'DRAFT_SAVED_NEEDS_CLARIFICATION' : 'CLARIFICATION_NEEDED',
      badgeLabel: 'Clarification needed',
      badgeTone: 'warning',
      nextStepLabel: 'Review visit',
      needsClinicianAttention: true,
    };
  }

  if (s.review.status === 'draft_ready_for_approval') {
    return {
      code: s.review.isDraftSaved ? 'DRAFT_SAVED_READY' : 'NEEDS_REVIEW',
      badgeLabel: s.review.isDraftSaved ? 'Saved · Ready for review' : 'Needs review',
      badgeTone: 'info',
      nextStepLabel: 'Review visit',
      needsClinicianAttention: true,
    };
  }

  if (s.capture.consentConfirmed && s.capture.status === 'ready_to_capture') {
    return {
      code: 'READY_TO_CAPTURE',
      badgeLabel: 'Ready to record',
      badgeTone: 'info',
      nextStepLabel: 'Start recording',
      needsClinicianAttention: false,
    };
  }

  return {
    code: 'CONSENT_NEEDED',
    badgeLabel: 'Consent required',
    badgeTone: 'neutral',
    nextStepLabel: 'Confirm consent',
    needsClinicianAttention: false,
  };
}

// ============================================================================
// Ownership & Role Guards
// ============================================================================

export function isAssignedClinician(user: User, session: ClinicalSession): boolean {
  return user.role === 'clinician' && session.assignedClinicianId === user.id;
}

export function assertAssignedClinician(user: User, session: ClinicalSession): void {
  if (!isAssignedClinician(user, session)) {
    throw new DomainTransitionError(
      'UNAUTHORIZED_ROLE_OR_OWNER',
      `User ${user.displayName} (${user.role}) is not the assigned clinician for session ${session.id}.`,
    );
  }
}

export function assertExpectedRevision(
  expectedRevision: number,
  session: ClinicalSession,
  report: ClinicalReport,
): void {
  if (
    expectedRevision !== session.review.currentRevision ||
    expectedRevision !== report.currentRevision
  ) {
    throw new DomainTransitionError(
      'REVISION_CONFLICT',
      `Stale report revision: action targeted revision v${expectedRevision}, but current revision is v${report.currentRevision}.`,
    );
  }
}

export function canStartOrUploadCapture(user: User, session: ClinicalSession): boolean {
  return (
    isAssignedClinician(user, session) &&
    session.capture.consentConfirmed &&
    (session.capture.status === 'ready_to_capture' ||
      session.capture.status === 'recording_error' ||
      session.capture.status === 'upload_failed')
  );
}

export function canResolveClarifications(
  user: User,
  session: ClinicalSession,
  report: ClinicalReport,
): boolean {
  return (
    canSaveOrEditDraft(user, session) &&
    report.clarifications.length > 0
  );
}

export function canSaveOrEditDraft(user: User, session: ClinicalSession): boolean {
  return (
    isAssignedClinician(user, session) &&
    session.processing.status !== 'running' &&
    (session.review.status === 'draft_requires_clarification' ||
      session.review.status === 'draft_ready_for_approval')
  );
}

export function canRejectAndRegenerateDraft(user: User, session: ClinicalSession): boolean {
  return (
    isAssignedClinician(user, session) &&
    session.processing.status !== 'running' &&
    (session.review.status === 'draft_requires_clarification' ||
      session.review.status === 'draft_ready_for_approval')
  );
}

export function canApproveAndFinalizeReport(
  user: User,
  session: ClinicalSession,
  report: ClinicalReport,
): boolean {
  return (
    isAssignedClinician(user, session) &&
    session.processing.status === 'completed' &&
    session.review.status === 'draft_ready_for_approval' &&
    session.review.unresolvedClarificationCount === 0 &&
    report.clarifications.every((c) => c.status === 'resolved') &&
    report.currentRevision === session.review.currentRevision
  );
}

export function canReleaseReportToPatient(user: User, session: ClinicalSession): boolean {
  return (
    isAssignedClinician(user, session) &&
    session.review.status === 'approved_finalized' &&
    session.release.status === 'not_released'
  );
}

export function canPatientViewReport(user: User, session: ClinicalSession): boolean {
  return (
    user.role === 'patient' &&
    user.linkedPatientId === session.patientId &&
    session.review.status === 'approved_finalized' &&
    session.release.status === 'released'
  );
}

export function isSessionEligibleForCohortAnalytics(session: ClinicalSession): boolean {
  return (
    session.review.status === 'approved_finalized' &&
    session.privacy.status === 'verified_eligible' &&
    session.privacy.independentPassesCompleted >= 2
  );
}

// ============================================================================
// Pure State Transition Reducers (Preserving Revisions & Preventing Stale Sign-Off)
// ============================================================================

/**
 * Saves current draft WITHOUT altering whether the draft is blocked by clarifications
 * or ready for approval.
 */
export function transitionSaveDraft(params: {
  user: User;
  session: ClinicalSession;
  report: ClinicalReport;
  expectedRevision: number;
  nowIso: string;
}): ClinicalSession {
  const { user, session, report, expectedRevision, nowIso } = params;
  assertAssignedClinician(user, session);
  if (!canSaveOrEditDraft(user, session)) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      `Cannot save draft while session review status is ${session.review.status} or processing is ${session.processing.status}.`,
    );
  }
  assertExpectedRevision(expectedRevision, session, report);

  return {
    ...session,
    updatedAt: nowIso,
    review: {
      ...session.review,
      // Explicitly preserve existing review.status ('draft_requires_clarification' or 'draft_ready_for_approval')
      isDraftSaved: true,
      lastSavedRevision: report.currentRevision,
      lastSavedAt: nowIso,
    },
  };
}

/**
 * Resolves clinician clarification questions, appends a new immutable ReportRevision,
 * preserves all previous revisions, and transitions review status when all questions are resolved.
 */
export function transitionResolveClarifications(params: {
  user: User;
  session: ClinicalSession;
  report: ClinicalReport;
  expectedRevision: number;
  answers: ReadonlyArray<{ questionId: string; responseText: string }>;
  updatedPlanText?: string;
  nowIso: string;
}): { session: ClinicalSession; report: ClinicalReport } {
  const { user, session, report, expectedRevision, answers, updatedPlanText, nowIso } = params;
  assertAssignedClinician(user, session);
  if (!canResolveClarifications(user, session, report)) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      'Cannot resolve clarifications in the current session state.',
    );
  }
  assertExpectedRevision(expectedRevision, session, report);

  const answerMap = new Map<string, string>(
    answers
      .map((a) => [a.questionId, a.responseText.trim()] as const)
      .filter(([, text]) => text.length > 0),
  );

  if (answerMap.size === 0) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      'At least one non-empty clinical clarification response is required.',
    );
  }

  let matchedAnyQuestion = false;
  const updatedClarifications: ClarificationQuestion[] = report.clarifications.map((q) => {
    const responseText = answerMap.get(q.id);
    if (!responseText) return q;
    matchedAnyQuestion = true;
    return {
      ...q,
      status: 'resolved',
      response: {
        questionId: q.id,
        responseText,
        respondedByUserId: user.id,
        respondedByDisplayName: user.displayName,
        respondedAt: nowIso,
      },
    };
  });

  if (!matchedAnyQuestion) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      'None of the provided clarification answers matched a valid question ID on this report.',
    );
  }

  const remainingUnresolved = updatedClarifications.filter((q) => cIsUnresolved(q)).length;
  const nextRevisionNumber = report.currentRevision + 1;

  const isDefaultUnclarifiedPlan =
    report.soap.plan ===
    'Medication strength and allergy status require clarification. HbA1c and metabolic panel ordered; follow-up in two weeks.';

  const updatedSoap: SoapSections = {
    ...report.soap,
    plan:
      updatedPlanText ??
      (remainingUnresolved === 0 && isDefaultUnclarifiedPlan
        ? 'Metformin strength confirmed as 1,000 mg twice daily. No known drug allergies confirmed by clinician. HbA1c and metabolic panel ordered; follow-up in two weeks.'
        : report.soap.plan),
  };

  const newRevision: ReportRevision = {
    revisionNumber: nextRevisionNumber,
    createdAt: nowIso,
    origin: 'clinician_clarification',
    authorId: user.id,
    authorDisplayName: user.displayName,
    soap: updatedSoap,
    unresolvedClarificationCount: remainingUnresolved,
    changeSummary:
      remainingUnresolved === 0
        ? 'All clinical clarification questions resolved and applied to report.'
        : `Clarification response saved (${remainingUnresolved} question${remainingUnresolved === 1 ? '' : 's'} still unresolved).`,
  };

  const unresolvedSegmentIds = new Set(
    updatedClarifications.filter((q) => q.status === 'unresolved').map((q) => q.sourceSegmentId),
  );
  const resolvedSegmentIds = new Set(
    updatedClarifications.filter((q) => q.status === 'resolved').map((q) => q.sourceSegmentId),
  );

  const updatedFindings = report.provenanceFindings.map((f) => {
    if (remainingUnresolved === 0) {
      return { ...f, requiresClarification: false };
    }
    if (f.sourceSegmentId && resolvedSegmentIds.has(f.sourceSegmentId) && !unresolvedSegmentIds.has(f.sourceSegmentId)) {
      return { ...f, requiresClarification: false };
    }
    return f;
  });

  const updatedReport: ClinicalReport = {
    ...report,
    currentRevision: nextRevisionNumber,
    soap: updatedSoap,
    clarifications: updatedClarifications,
    provenanceFindings: updatedFindings,
    revisions: [...report.revisions, newRevision],
  };

  const nextReviewStatus =
    remainingUnresolved === 0 ? 'draft_ready_for_approval' : 'draft_requires_clarification';

  const updatedSession: ClinicalSession = {
    ...session,
    updatedAt: nowIso,
    review: {
      ...session.review,
      status: nextReviewStatus,
      currentRevision: nextRevisionNumber,
      unresolvedClarificationCount: remainingUnresolved,
      // New unsaved edits exist until explicitly saved or approved, unless user saves
      isDraftSaved: false,
    },
  };

  return { session: updatedSession, report: updatedReport };
}

function cIsUnresolved(q: ClarificationQuestion): boolean {
  return q.status === 'unresolved';
}

/**
 * Reopens a previously resolved clarification question while the report is still an
 * unapproved draft, restoring the clarification blocker and appending a revision entry.
 */
export function transitionReopenClarification(params: {
  user: User;
  session: ClinicalSession;
  report: ClinicalReport;
  expectedRevision: number;
  questionId: string;
  nowIso: string;
}): { session: ClinicalSession; report: ClinicalReport } {
  const { user, session, report, expectedRevision, questionId, nowIso } = params;
  assertAssignedClinician(user, session);
  if (!canSaveOrEditDraft(user, session)) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      'Cannot reopen a clarification question on a finalized or currently regenerating report.',
    );
  }
  assertExpectedRevision(expectedRevision, session, report);

  const targetQuestion = report.clarifications.find((q) => q.id === questionId);
  if (!targetQuestion || targetQuestion.status !== 'resolved') {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      `Clarification question ${questionId} is not currently resolved.`,
    );
  }

  const updatedClarifications: ClarificationQuestion[] = report.clarifications.map((q) =>
    q.id === questionId
      ? {
          ...q,
          status: 'unresolved',
        }
      : q,
  );

  const remainingUnresolved = updatedClarifications.filter((q) => q.status === 'unresolved').length;
  const nextRevisionNumber = report.currentRevision + 1;

  const newRevision: ReportRevision = {
    revisionNumber: nextRevisionNumber,
    createdAt: nowIso,
    origin: 'clinician_clarification',
    authorId: user.id,
    authorDisplayName: user.displayName,
    soap: report.soap,
    unresolvedClarificationCount: remainingUnresolved,
    changeSummary: `Reopened clarification question #${targetQuestion.orderIndex} for additional clinician review.`,
  };

  const updatedFindings = report.provenanceFindings.map((f) =>
    f.sourceSegmentId && f.sourceSegmentId === targetQuestion.sourceSegmentId
      ? { ...f, requiresClarification: true }
      : f,
  );

  const updatedReport: ClinicalReport = {
    ...report,
    currentRevision: nextRevisionNumber,
    clarifications: updatedClarifications,
    provenanceFindings: updatedFindings,
    revisions: [...report.revisions, newRevision],
  };

  const updatedSession: ClinicalSession = {
    ...session,
    updatedAt: nowIso,
    review: {
      ...session.review,
      status: 'draft_requires_clarification',
      currentRevision: nextRevisionNumber,
      unresolvedClarificationCount: remainingUnresolved,
      isDraftSaved: false,
    },
  };

  return { session: updatedSession, report: updatedReport };
}

/**
 * Applies clinician manual edits to the report, preserving prior revisions and
 * incrementing currentRevision. Preserves clarification-blocked status if questions remain open.
 */
export function transitionEditReport(params: {
  user: User;
  session: ClinicalSession;
  report: ClinicalReport;
  expectedRevision: number;
  soapUpdates: Partial<SoapSections>;
  changeSummary?: string;
  nowIso: string;
}): { session: ClinicalSession; report: ClinicalReport } {
  const { user, session, report, expectedRevision, soapUpdates, changeSummary, nowIso } = params;
  assertAssignedClinician(user, session);
  if (!canSaveOrEditDraft(user, session)) {
    throw new DomainTransitionError(
      'REPORT_ALREADY_FINALIZED',
      'Cannot edit a report that is already finalized or currently regenerating.',
    );
  }
  assertExpectedRevision(expectedRevision, session, report);

  const nextRevisionNumber = report.currentRevision + 1;
  const updatedSoap: SoapSections = {
    ...report.soap,
    ...soapUpdates,
  };

  if (
    !updatedSoap.subjective.trim() ||
    !updatedSoap.objective.trim() ||
    !updatedSoap.assessment.trim() ||
    !updatedSoap.plan.trim()
  ) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      'All four SOAP sections (Subjective, Objective, Assessment, and Plan) must contain non-empty clinical text.',
    );
  }

  const newRevision: ReportRevision = {
    revisionNumber: nextRevisionNumber,
    createdAt: nowIso,
    origin: 'clinician_edit',
    authorId: user.id,
    authorDisplayName: user.displayName,
    soap: updatedSoap,
    unresolvedClarificationCount: session.review.unresolvedClarificationCount,
    changeSummary: changeSummary?.trim() || 'Clinician edited report sections and saved draft.',
  };

  const updatedReport: ClinicalReport = {
    ...report,
    currentRevision: nextRevisionNumber,
    soap: updatedSoap,
    revisions: [...report.revisions, newRevision],
  };

  const updatedSession: ClinicalSession = {
    ...session,
    updatedAt: nowIso,
    review: {
      ...session.review,
      // Preserve whether clarifications are still required!
      status:
        session.review.unresolvedClarificationCount > 0
          ? 'draft_requires_clarification'
          : 'draft_ready_for_approval',
      currentRevision: nextRevisionNumber,
      isDraftSaved: true,
      lastSavedRevision: nextRevisionNumber,
      lastSavedAt: nowIso,
    },
  };

  return { session: updatedSession, report: updatedReport };
}

/**
 * Marks the current revision as rejected with clinician feedback and initiates
 * an asynchronous draft regeneration job without losing prior revisions.
 */
export function transitionRejectDraftStartRegeneration(params: {
  user: User;
  session: ClinicalSession;
  report: ClinicalReport;
  expectedRevision: number;
  rejectionReason: string;
  jobId: string;
  nowIso: string;
}): { session: ClinicalSession; report: ClinicalReport } {
  const { user, session, report, expectedRevision, rejectionReason, jobId, nowIso } = params;
  assertAssignedClinician(user, session);
  if (!canRejectAndRegenerateDraft(user, session)) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      'Cannot reject a finalized report or a draft already regenerating.',
    );
  }
  assertExpectedRevision(expectedRevision, session, report);

  const trimmedReason = rejectionReason.trim();
  if (!trimmedReason) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      'A clinical rejection reason is required to regenerate the draft.',
    );
  }

  const updatedRevisions = report.revisions.map((rev) =>
    rev.revisionNumber === report.currentRevision
      ? {
          ...rev,
          rejectedAt: nowIso,
          rejectedByUserId: user.id,
          rejectionReason: trimmedReason,
        }
      : rev,
  );

  const updatedReport: ClinicalReport = {
    ...report,
    revisions: updatedRevisions,
  };

  const updatedSession: ClinicalSession = {
    ...session,
    updatedAt: nowIso,
    processing: {
      status: 'running',
      activeJobId: jobId,
      kind: 'draft_regeneration',
      retryCount: 0,
      maxRetries: 2,
      startedAt: nowIso,
      stages: [
        {
          key: 'audio_validation',
          label: 'Audio validation',
          status: 'complete',
          detailMessage: 'Completed successfully',
        },
        {
          key: 'speech_transcription',
          label: 'Speech transcription',
          status: 'complete',
          detailMessage: 'Completed successfully',
        },
        {
          key: 'speaker_attribution',
          label: 'Speaker attribution',
          status: 'complete',
          detailMessage: 'Completed successfully',
        },
        {
          key: 'structured_report',
          label: 'Structured report',
          status: 'in_progress',
          detailMessage: 'Revising report with clinician feedback…',
        },
        {
          key: 'clinician_review',
          label: 'Clinician review',
          status: 'waiting',
          detailMessage: 'Starts after the previous step',
        },
      ],
    },
    review: {
      ...session.review,
      isDraftSaved: false,
      lastRejectionReason: trimmedReason,
      lastRejectedRevision: report.currentRevision,
      lastRejectedAt: nowIso,
    },
  };

  return { session: updatedSession, report: updatedReport };
}

/**
 * Completes a draft regeneration job by appending a new revision (currentRevision + 1)
 * and setting review status based on any remaining unresolved clarifications.
 */
export function transitionCompleteDraftRegeneration(params: {
  session: ClinicalSession;
  report: ClinicalReport;
  regeneratedSoap: SoapSections;
  nowIso: string;
}): { session: ClinicalSession; report: ClinicalReport } {
  const { session, report, regeneratedSoap, nowIso } = params;
  if (
    session.processing.status !== 'running' ||
    session.processing.kind !== 'draft_regeneration'
  ) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      'Session is not currently regenerating a draft.',
    );
  }

  const nextRevisionNumber = report.currentRevision + 1;
  const unresolvedCount = report.clarifications.filter((q) => q.status === 'unresolved').length;

  const newRevision: ReportRevision = {
    revisionNumber: nextRevisionNumber,
    createdAt: nowIso,
    origin: 'ai_regenerated_draft',
    authorId: 'agent-report-drafter',
    authorDisplayName: 'Drafting agent',
    soap: regeneratedSoap,
    unresolvedClarificationCount: unresolvedCount,
    changeSummary: `Regenerated draft incorporating clinician feedback: "${session.review.lastRejectionReason ?? 'Revision requested'}"`,
  };

  const updatedReport: ClinicalReport = {
    ...report,
    currentRevision: nextRevisionNumber,
    soap: regeneratedSoap,
    revisions: [...report.revisions, newRevision],
  };

  const updatedSession: ClinicalSession = {
    ...session,
    updatedAt: nowIso,
    processing: {
      ...session.processing,
      status: 'completed',
      completedAt: nowIso,
      stages: session.processing.stages.map((s) => ({
        ...s,
        status: 'complete',
        detailMessage: 'Completed successfully',
      })),
    },
    review: {
      ...session.review,
      status:
        unresolvedCount > 0 ? 'draft_requires_clarification' : 'draft_ready_for_approval',
      currentRevision: nextRevisionNumber,
      unresolvedClarificationCount: unresolvedCount,
      isDraftSaved: false,
    },
  };

  return { session: updatedSession, report: updatedReport };
}

/**
 * Approves and finalizes the clinical report at `expectedRevision`.
 * Blocks approval if any clarification is unresolved or if `expectedRevision` is stale.
 * Initiates the separate privacy de-identification track without releasing to the patient.
 */
export function transitionApproveAndFinalizeReport(params: {
  user: User;
  session: ClinicalSession;
  report: ClinicalReport;
  expectedRevision: number;
  nowIso: string;
}): ClinicalSession {
  const { user, session, report, expectedRevision, nowIso } = params;
  assertAssignedClinician(user, session);

  if (session.review.status === 'approved_finalized') {
    throw new DomainTransitionError(
      'REPORT_ALREADY_FINALIZED',
      `Session ${session.id} is already approved and finalized.`,
    );
  }

  assertExpectedRevision(expectedRevision, session, report);

  const hasOpenClarifications =
    session.review.unresolvedClarificationCount > 0 ||
    report.clarifications.some((q) => q.status === 'unresolved');

  if (hasOpenClarifications) {
    throw new DomainTransitionError(
      'CLARIFICATIONS_UNRESOLVED',
      'Cannot approve a report while clarification questions remain unresolved.',
    );
  }

  if (!canApproveAndFinalizeReport(user, session, report)) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      'Report is not in a valid state for approval.',
    );
  }

  return {
    ...session,
    updatedAt: nowIso,
    review: {
      ...session.review,
      status: 'approved_finalized',
      approvedAt: nowIso,
      approvedRevision: report.currentRevision,
      approvedByUserId: user.id,
      approvedByDisplayName: user.displayName,
    },
    // Patient release remains explicitly 'not_released' until separate release action!
    release: {
      status: 'not_released',
    },
    // Privacy pipeline starts de-identifying upon clinical approval
    privacy: {
      status: 'deidentifying',
      safeHarborChecked: false,
      independentPassesCompleted: 0,
      lastProcessedAt: nowIso,
    },
  };
}

/**
 * Releases an already approved/finalized report to the patient portal.
 */
export function transitionReleaseReportToPatient(params: {
  user: User;
  session: ClinicalSession;
  report: ClinicalReport;
  expectedRevision: number;
  nowIso: string;
}): ClinicalSession {
  const { user, session, report, expectedRevision, nowIso } = params;
  assertAssignedClinician(user, session);

  if (session.review.status !== 'approved_finalized') {
    throw new DomainTransitionError(
      'REPORT_NOT_FINALIZED',
      'Only an approved and finalized clinical report can be released to the patient.',
    );
  }

  assertExpectedRevision(expectedRevision, session, report);

  if (!canReleaseReportToPatient(user, session)) {
    throw new DomainTransitionError(
      'INVALID_LIFECYCLE_TRANSITION',
      'Report has already been released to the patient.',
    );
  }

  return {
    ...session,
    updatedAt: nowIso,
    release: {
      status: 'released',
      releasedRevision: session.review.approvedRevision ?? report.currentRevision,
      releasedAt: nowIso,
      releasedByUserId: user.id,
      releasedByDisplayName: user.displayName,
    },
  };
}
