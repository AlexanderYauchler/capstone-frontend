import type {
  AnalyticsFilterCriteria,
  AnalyticsSummaryResponse,
  AuditEvent,
  CaptureOrigin,
  ClinicalReport,
  ClinicalSession,
  DepartmentId,
  DiagnosisCategory,
  ProcessingLifecycleState,
  RecordingMetadata,
  ReportTemplateId,
  SoapSections,
  Transcript,
  User,
  UserRole,
  WorkspacePreferences,
} from '../../domain/models';

// ============================================================================
// CoSign — Replaceable Service Layer Contracts (Demo & Connected Modes)
// Note: Endpoint shapes are provisional and isolated inside service adapters
// so backend contract refinements do not require rewriting React UI components.
// ============================================================================

export interface SessionListFilter {
  readonly query?: string;
  readonly statusFilter?: string;
  readonly encounterDate?: string;
}

export interface DashboardSummaryMetrics {
  readonly referenceDate: string; // "2026-10-06"
  readonly referenceDateLabel: string; // "October 6"
  readonly todaysSessionsCount: number; // 8
  readonly needsReviewCount: number; // 2
  readonly clarificationNeededSessionsCount: number; // 1
  readonly openClarificationQuestionsCount: number; // 2
  readonly releasedTodayCount: number; // 3
  readonly attentionSession?: {
    readonly sessionId: string;
    readonly headline: string;
    readonly detail: string;
  };
}

export interface SessionReviewBundle {
  readonly session: ClinicalSession;
  readonly recording?: RecordingMetadata;
  readonly transcript?: Transcript;
  readonly report?: ClinicalReport;
}

export interface IAuthService {
  getCurrentUser(): Promise<User | null>;
  listDemoUsers(): Promise<readonly User[]>;
  switchRole(role: UserRole): Promise<User>;
  signOut(): Promise<void>;
}

export interface CreateClinicalSessionInput {
  readonly patientId: string;
  readonly patientName: string;
  readonly department: DepartmentId;
  readonly visitType: string;
  readonly templateId: ReportTemplateId;
  readonly consentConfirmed: boolean;
  readonly selectedDeviceLabel?: string;
  readonly diagnosisCategory?: DiagnosisCategory;
  readonly primarySymptom?: 'Fatigue' | 'Cough' | 'Headache' | 'Increased thirst' | 'Other';
}

export interface AudioFormatCapability {
  readonly preferredMimeType: string;
  readonly supportedMimeTypes: readonly string[];
  readonly requiresServerSideNormalization: boolean;
  readonly targetTranscriptionFormat: 'audio/wav;rate=16000;channels=1';
}

export interface SaveLiveRecordingInput {
  readonly sessionId: string;
  readonly deviceName: string;
  readonly mimeType: string;
  readonly durationSeconds: number;
  readonly audioBlob: Blob;
  readonly onProgress?: (progressPct: number) => void;
  readonly signal?: AbortSignal;
}

export interface CreateSimulatedRecordingInput {
  readonly sessionId: string;
  readonly durationSeconds?: number;
  readonly deviceName?: string;
}

export interface UploadAudioFileInput {
  readonly sessionId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly durationSeconds: number;
  readonly audioBlob?: Blob;
  readonly simulateFailure?: boolean;
  readonly onProgress?: (progressPct: number) => void;
  readonly signal?: AbortSignal;
}

export interface StartProcessingInput {
  readonly sessionId: string;
  readonly recordingId: string;
  readonly origin: Exclude<CaptureOrigin, 'unselected'>;
  readonly templateId: ReportTemplateId;
}

export interface ISessionService {
  getDashboardMetrics(): Promise<DashboardSummaryMetrics>;
  listSessions(filter?: SessionListFilter): Promise<readonly ClinicalSession[]>;
  getSessionById(sessionId: string): Promise<ClinicalSession>;
  getSessionReviewBundle(sessionId: string): Promise<SessionReviewBundle>;
  createSession(input: CreateClinicalSessionInput): Promise<ClinicalSession>;
  confirmPatientConsent(sessionId: string): Promise<ClinicalSession>;
}

export interface ICaptureService {
  getAudioFormatCapabilities(): Promise<AudioFormatCapability>;
  saveLiveRecording(
    input: SaveLiveRecordingInput,
  ): Promise<{ session: ClinicalSession; recording: RecordingMetadata }>;
  createSimulatedRecording(
    input: CreateSimulatedRecordingInput,
  ): Promise<{ session: ClinicalSession; recording: RecordingMetadata }>;
  uploadConsentedAudioFile(
    input: UploadAudioFileInput,
  ): Promise<{ session: ClinicalSession; recording: RecordingMetadata }>;
  discardRecording(sessionId: string): Promise<ClinicalSession>;
}

export interface IProcessingService {
  startProcessingPipeline(input: StartProcessingInput): Promise<ClinicalSession>;
  getProcessingStatus(sessionId: string): Promise<ProcessingLifecycleState>;
  retryProcessingPipeline(sessionId: string): Promise<ClinicalSession>;
  completeProcessingPipelineDemo(sessionId: string): Promise<SessionReviewBundle>;
}

export interface IReviewService {
  saveDraft(params: { sessionId: string; expectedRevision: number }): Promise<ClinicalSession>;
  resolveClarifications(params: {
    sessionId: string;
    expectedRevision: number;
    answers: ReadonlyArray<{ questionId: string; responseText: string }>;
  }): Promise<SessionReviewBundle>;
  reopenClarification(params: {
    sessionId: string;
    expectedRevision: number;
    questionId: string;
  }): Promise<SessionReviewBundle>;
  editReport(params: {
    sessionId: string;
    expectedRevision: number;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    additionalNotes?: string;
    soapUpdates?: Partial<SoapSections>;
    changeSummary?: string;
  }): Promise<SessionReviewBundle>;
  rejectAndRegenerate(params: {
    sessionId: string;
    expectedRevision: number;
    rejectionReason: string;
  }): Promise<SessionReviewBundle>;
  completeRegeneration(sessionId: string): Promise<SessionReviewBundle>;
  approveAndFinalize(params: {
    sessionId: string;
    expectedRevision: number;
  }): Promise<SessionReviewBundle>;
  releaseToPatient(params: {
    sessionId: string;
    expectedRevision: number;
  }): Promise<SessionReviewBundle>;
}

export interface IPrivacyService {
  completePrivacyVerification(sessionId: string): Promise<ClinicalSession>;
  triggerVerificationRetryDemo(sessionId: string): Promise<ClinicalSession>;
}

export interface IPatientPortalService {
  listReleasedReportsForPatient(
    patientId: string,
  ): Promise<ReadonlyArray<{ session: ClinicalSession; report: ClinicalReport }>>;
  getReleasedReportDetail(
    patientId: string,
    reportOrSessionId: string,
  ): Promise<{ session: ClinicalSession; report: ClinicalReport }>;
}

export interface IAnalyticsService {
  getAggregateSummary(criteria: Partial<AnalyticsFilterCriteria>): Promise<AnalyticsSummaryResponse>;
}

export interface IAdminService {
  listAuditEvents(): Promise<readonly AuditEvent[]>;
  getPreferences(): Promise<WorkspacePreferences>;
  savePreferences(prefs: Partial<WorkspacePreferences>): Promise<WorkspacePreferences>;
}

export interface ICoSignServices {
  readonly mode: 'demo' | 'connected';
  readonly auth: IAuthService;
  readonly sessions: ISessionService;
  readonly capture: ICaptureService;
  readonly processing: IProcessingService;
  readonly review: IReviewService;
  readonly privacy: IPrivacyService;
  readonly patientPortal: IPatientPortalService;
  readonly analytics: IAnalyticsService;
  readonly admin: IAdminService;
}
