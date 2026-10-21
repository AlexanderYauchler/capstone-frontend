// ============================================================================
// CoSign — Strict Orthogonal Domain Models (Sequence 2)
// ============================================================================

export type UserRole = 'clinician' | 'patient' | 'analyst' | 'admin';

export const VALID_USER_ROLES: readonly UserRole[] = [
  'clinician',
  'patient',
  'analyst',
  'admin',
] as const;

export function parseValidUserRole(value: string | null | undefined): UserRole | null {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return (VALID_USER_ROLES as readonly string[]).includes(normalized)
    ? (normalized as UserRole)
    : null;
}

export type DepartmentId = 'primary_care' | 'endocrinology' | 'cardiology' | 'acute_care';

export interface User {
  readonly id: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly title: string;
  readonly department?: DepartmentId;
  readonly organizationName: string;
  readonly linkedPatientId?: string;
}

export interface PatientReference {
  readonly id: string;
  readonly displayName: string;
  readonly dateOfBirthLabel: string;
  readonly isSyntheticDemo: true;
}

export type ReportTemplateId = 'soap_standard' | 'narrative_summary';

export type DiagnosisCategory = 'diabetes' | 'hypertension' | 'URI_acute' | 'wellness' | 'other';

// ----------------------------------------------------------------------------
// 1. Authoritative Lifecycle 1: Capture & Consent
// ----------------------------------------------------------------------------
export type CaptureStatus =
  | 'consent_pending'
  | 'ready_to_capture'
  | 'recording_active'
  | 'recording_paused'
  | 'recording_error'
  | 'recording_ready'
  | 'uploading'
  | 'upload_failed'
  | 'capture_completed';

export type CaptureOrigin =
  | 'unselected'
  | 'live_microphone'
  | 'simulated_demo_audio'
  | 'uploaded_file';

export type CaptureErrorCode =
  | 'MIC_PERMISSION_DENIED'
  | 'MIC_DEVICE_UNAVAILABLE'
  | 'INSECURE_CONTEXT'
  | 'UPLOAD_INTERRUPTED'
  | 'UNSUPPORTED_AUDIO_FORMAT';

export interface CaptureLifecycleState {
  readonly status: CaptureStatus;
  readonly origin: CaptureOrigin;
  readonly consentConfirmed: boolean;
  readonly consentConfirmedAt?: string;
  readonly consentConfirmedByUserId?: string;
  readonly selectedDeviceLabel: string;
  readonly recordingId?: string;
  readonly durationSeconds: number;
  readonly uploadProgressPct?: number;
  readonly errorCode?: CaptureErrorCode;
  readonly errorMessage?: string;
}

export interface RecordingMetadata {
  readonly id: string;
  readonly sessionId: string;
  readonly origin: Exclude<CaptureOrigin, 'unselected'>;
  readonly deviceName?: string;
  readonly fileName?: string;
  readonly mimeType: string; // Negotiated at runtime (e.g. audio/webm;codecs=opus, audio/mp4, audio/wav)
  readonly durationSeconds: number;
  readonly durationLabel: string; // e.g. "08:42"
  readonly fileSizeBytes?: number;
  readonly validationStatus: 'valid' | 'invalid_format' | 'corrupted';
  readonly recordedAt: string;
}

// ----------------------------------------------------------------------------
// 2. Authoritative Lifecycle 2: Audio & AI Processing Pipeline
// ----------------------------------------------------------------------------
export type PipelineStageKey =
  | 'audio_validation'
  | 'speech_transcription'
  | 'speaker_attribution'
  | 'structured_report'
  | 'clinician_review';

export type StageStatus = 'waiting' | 'in_progress' | 'complete' | 'failed';

export interface PipelineStageState {
  readonly key: PipelineStageKey;
  readonly label: string;
  readonly status: StageStatus;
  readonly detailMessage: string;
}

export type ProcessingStatus = 'idle' | 'running' | 'failed_retryable' | 'completed';

export type ProcessingJobKind = 'initial_processing' | 'draft_regeneration';

export interface ProcessingLifecycleState {
  readonly status: ProcessingStatus;
  readonly activeJobId?: string;
  readonly kind?: ProcessingJobKind;
  readonly stages: readonly PipelineStageState[];
  readonly failedStage?: PipelineStageKey;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
}

// ----------------------------------------------------------------------------
// 3. Authoritative Lifecycle 3: Report Review & Approval
// ----------------------------------------------------------------------------
export type ReviewApprovalStatus =
  | 'not_generated'
  | 'draft_requires_clarification'
  | 'draft_ready_for_approval'
  | 'approved_finalized';

export interface ReportReviewLifecycleState {
  readonly status: ReviewApprovalStatus;
  readonly currentReportId?: string;
  readonly currentRevision: number; // 0 before generation, 1 for v1, 2 for v2, etc.
  readonly unresolvedClarificationCount: number;
  readonly isDraftSaved: boolean; // Orthogonal to status: saving never clears clarification blockers
  readonly lastSavedRevision?: number;
  readonly lastSavedAt?: string;
  readonly reviewStartedAt?: string;
  readonly lastRejectionReason?: string;
  readonly lastRejectedRevision?: number;
  readonly lastRejectedAt?: string;
  readonly approvedAt?: string;
  readonly approvedRevision?: number;
  readonly approvedByUserId?: string;
  readonly approvedByDisplayName?: string;
}

// ----------------------------------------------------------------------------
// 4. Authoritative Lifecycle 4: Patient Portal Release
// ----------------------------------------------------------------------------
export type ReleaseStatus = 'not_released' | 'released';

export interface PatientReleaseState {
  readonly status: ReleaseStatus;
  readonly releasedRevision?: number;
  readonly releasedAt?: string;
  readonly releasedByUserId?: string;
  readonly releasedByDisplayName?: string;
}

// ----------------------------------------------------------------------------
// 5. Authoritative Lifecycle 5: Privacy & Analytics Verification
// ----------------------------------------------------------------------------
export type PrivacyStatus =
  | 'not_started'
  | 'deidentifying'
  | 'verification_retry_required'
  | 'verified_eligible';

export interface PrivacyVerificationState {
  readonly status: PrivacyStatus;
  readonly safeHarborChecked: boolean;
  readonly independentPassesCompleted: number; // Required: 2
  readonly lastProcessedAt?: string;
  readonly retryReason?: string;
}

// ----------------------------------------------------------------------------
// Aggregate ClinicalSession Entity
// ----------------------------------------------------------------------------
export interface ClinicalSession {
  readonly id: string; // e.g. "CS-1042"
  readonly patientId: string;
  readonly patientName: string;
  readonly assignedClinicianId: string;
  readonly assignedClinicianName: string;
  readonly department: DepartmentId;
  readonly visitType: string;
  readonly diagnosisCategory: DiagnosisCategory;
  readonly primarySymptom: 'Fatigue' | 'Cough' | 'Headache' | 'Increased thirst' | 'Other';
  readonly followUpDocumented: boolean;
  readonly templateId: ReportTemplateId;
  readonly encounterDate: string; // "YYYY-MM-DD" in clinic timezone
  readonly createdAt: string; // ISO-8601
  readonly updatedAt: string;
  readonly capture: CaptureLifecycleState;
  readonly processing: ProcessingLifecycleState;
  readonly review: ReportReviewLifecycleState;
  readonly release: PatientReleaseState;
  readonly privacy: PrivacyVerificationState;
}

// ----------------------------------------------------------------------------
// Transcript, Clarifications & Report Revisions
// ----------------------------------------------------------------------------
export interface TranscriptSegment {
  readonly id: string;
  readonly sessionId: string;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly timestampLabel: string; // "00:28", "01:25", "03:18", "04:06"
  readonly speaker: 'patient' | 'clinician';
  readonly text: string;
  readonly requiresClarification?: boolean;
  readonly linkedClarificationId?: string;
  readonly evidenceTitle: string;
  readonly evidenceDetail: string;
}

export interface Transcript {
  readonly id: string;
  readonly sessionId: string;
  readonly segments: readonly TranscriptSegment[];
  readonly generatedAt: string;
}

export interface ClarificationResponse {
  readonly questionId: string;
  readonly responseText: string;
  readonly respondedByUserId: string;
  readonly respondedByDisplayName: string;
  readonly respondedAt: string;
}

export interface ClarificationQuestion {
  readonly id: string;
  readonly sessionId: string;
  readonly reportRevision: number;
  readonly orderIndex: number;
  readonly prompt: string;
  readonly defaultDemoAnswer: string;
  readonly sourceSegmentId: string;
  readonly sourceTimestamp: string;
  readonly sourceQuote: string;
  readonly clinicalRationale: string;
  readonly status: 'unresolved' | 'resolved';
  readonly response?: ClarificationResponse;
}

export interface SoapSections {
  readonly subjective: string;
  readonly objective: string;
  readonly assessment: string;
  readonly plan: string;
  readonly additionalNotes?: string;
}

export type SoapSectionKey = 'subjective' | 'objective' | 'assessment' | 'plan';

export interface ProvenanceFinding {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly sourceTimestamp?: string;
  readonly sourceSegmentId?: string;
  readonly requiresClarification: boolean;
  readonly soapSection?: SoapSectionKey;
}

export interface PatientNextSteps {
  readonly medicationSummary: string;
  readonly testsOrdered: string;
  readonly followUpInstructions: string;
  readonly contactGuidance: string;
}

export type RevisionOrigin =
  | 'ai_initial_draft'
  | 'clinician_clarification'
  | 'clinician_edit'
  | 'ai_regenerated_draft';

export interface ReportRevision {
  readonly revisionNumber: number;
  readonly createdAt: string;
  readonly origin: RevisionOrigin;
  readonly authorId: string;
  readonly authorDisplayName: string;
  readonly soap: SoapSections;
  readonly unresolvedClarificationCount: number;
  readonly changeSummary: string;
  readonly rejectedAt?: string;
  readonly rejectedByUserId?: string;
  readonly rejectionReason?: string;
}

export interface ClinicalReport {
  readonly id: string;
  readonly sessionId: string;
  readonly patientId: string;
  readonly patientName: string;
  readonly clinicianName: string;
  readonly visitType: string;
  readonly encounterDate: string;
  readonly templateId: ReportTemplateId;
  readonly currentRevision: number;
  readonly soap: SoapSections;
  readonly narrativeSummary?: string;
  readonly provenanceFindings: readonly ProvenanceFinding[];
  readonly patientNextSteps: PatientNextSteps;
  readonly clarifications: readonly ClarificationQuestion[];
  readonly revisions: readonly ReportRevision[];
  readonly isSimulatedAiOutput: boolean;
}

// ----------------------------------------------------------------------------
// Analytics, Audit & Settings Models
// ----------------------------------------------------------------------------
export interface AnalyticsFilterCriteria {
  readonly view: 'cohort' | 'monthly';
  readonly monthKey: string; // e.g. "2026-09", "2026-10", "2026-08", "all"
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly department: DepartmentId | 'all';
  readonly diagnosis: DiagnosisCategory | 'all';
  readonly documentationStatus: 'verified_only' | 'all_statuses';
}

export interface SuppressedMetricValue {
  readonly count: number | null;
  readonly percentage: number | null;
  readonly isSuppressed: boolean;
  readonly displayLabel: string;
}

export interface MonthlyOperationsRow {
  readonly monthKey: string; // "2026-08", "2026-09", "2026-10"
  readonly monthLabel: string; // "August 2026", "September 2026", "October 2026 (Through Oct 6)"
  readonly sessionsCreated: number;
  readonly pendingReviewsAtPeriodEnd: number;
  readonly finalizedReports: number;
  readonly releasedReports: number;
  readonly sessionsWithClarifications: number;
  readonly clarificationResolutionRatePct: number | null;
  readonly medianReviewDurationSeconds: number | null;
}

export interface AnalyticsSummaryResponse {
  readonly criteria: AnalyticsFilterCriteria;
  readonly minimumCellSizeThreshold: 5;
  readonly isCohortSuppressed: boolean;
  readonly verifiedVisitsCount: number;
  readonly followUpDocumented: SuppressedMetricValue;
  readonly topSymptom: {
    readonly symptom: string;
    readonly metric: SuppressedMetricValue;
  } | null;
  readonly weeklyVisitTrends: readonly {
    readonly weekLabel: string;
    readonly metric: SuppressedMetricValue;
  }[];
  readonly symptomDistribution: readonly {
    readonly symptom: string;
    readonly metric: SuppressedMetricValue;
  }[];
  readonly suppressedRareCombinationsNote: string;
  readonly monthlyOperations: readonly MonthlyOperationsRow[];
}

export type AuditActionType =
  | 'CONSENT_CONFIRMED'
  | 'RECORDING_STARTED'
  | 'RECORDING_FINISHED'
  | 'RECORDING_DISCARDED'
  | 'AUDIO_UPLOADED'
  | 'DRAFT_GENERATED'
  | 'CLARIFICATIONS_RESOLVED'
  | 'DRAFT_EDITED'
  | 'DRAFT_SAVED'
  | 'DRAFT_REJECTED_REGENERATING'
  | 'DRAFT_REGENERATED'
  | 'REPORT_APPROVED_FINALIZED'
  | 'REPORT_RELEASED_TO_PATIENT'
  | 'PRIVACY_VERIFICATION_COMPLETED'
  | 'PREFERENCES_UPDATED';

export interface AuditEvent {
  readonly id: string;
  readonly sessionId?: string;
  readonly timestamp: string;
  readonly timeLabel: string;
  readonly actorType: 'user' | 'ai_agent' | 'system';
  readonly actorId: string;
  readonly actorDisplayName: string;
  readonly action: AuditActionType;
  readonly summary: string;
}

export interface WorkspacePreferences {
  readonly defaultMicrophone: 'MacBook microphone' | 'External USB microphone';
  readonly defaultTemplateId: ReportTemplateId;
  readonly interfaceDensity: 'comfortable_high_contrast' | 'compact';
  readonly updatedAt: string;
}
