import { defaultClinicClock } from '../../config/clock';
import type {
  AnalyticsFilterCriteria,
  AnalyticsSummaryResponse,
  AuditActionType,
  AuditEvent,
  ClinicalReport,
  ClinicalSession,
  DeidentifiedVisitRecord,
  ProcessingLifecycleState,
  RecordingMetadata,
  SoapSections,
  User,
  UserRole,
  WorkspacePreferences,
} from '../../domain/models';
import {
  DomainTransitionError,
  assertAssignedClinician,
  canPatientViewReport,
  deriveSessionDisplayState,
  transitionApproveAndFinalizeReport,
  transitionCompleteDraftRegeneration,
  transitionEditReport,
  transitionRejectDraftStartRegeneration,
  transitionReleaseReportToPatient,
  transitionReopenClarification,
  transitionResolveClarifications,
  transitionSaveDraft,
} from '../../domain/state-machines';
import type {
  AudioFormatCapability,
  CreateClinicalSessionInput,
  CreateSimulatedRecordingInput,
  DashboardSummaryMetrics,
  ICoSignServices,
  SaveLiveRecordingInput,
  SessionListFilter,
  SessionReviewBundle,
  StartProcessingInput,
  UploadAudioFileInput,
} from '../contracts';
import { DEMO_USERS } from './fixtures';
import { buildSimulatedVisitDraft } from './fixtures/simulated-draft';
import { generateSyntheticAnalyticsDataset } from './fixtures/analytics-dataset';
import { computeAnalyticsSummary } from '../../domain/analytics';
import type { DemoStore } from './demo-store';
import { transientMediaRegistry } from './transient-media-registry';

// ============================================================================
// CoSign — Demo Mode Service Adapters
// ============================================================================

function sanitizeReportForPatient(report: ClinicalReport): ClinicalReport {
  return {
    ...report,
    // Strictly strip clinician-only internal records from patient-facing responses:
    provenanceFindings: [],
    clarifications: [],
    revisions: [],
  };
}

const SUPPORTED_UPLOAD_MIME_TYPES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/flac',
  'video/webm',
  'video/mp4',
]);

const SUPPORTED_UPLOAD_EXTENSIONS = /\.(wav|mp3|m4a|mp4|aac|webm|ogg|flac)$/i;

export const MAX_AUDIO_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function formatReferenceDateLabel(ymd: string): string {
  const [, month, day] = ymd.split('-');
  const monthName = MONTH_NAMES[Number(month) - 1] ?? ymd;
  return `${monthName} ${Number(day)}`;
}

function formatDurationLabel(durationSeconds: number): string {
  const safeSecs = Math.max(0, Math.round(durationSeconds));
  const mins = Math.floor(safeSecs / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(safeSecs % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}

export function createDemoServices(store: DemoStore): ICoSignServices {
  let analyticsDatasetCache: {
    readonly referenceDate: string;
    readonly records: readonly DeidentifiedVisitRecord[];
  } | null = null;

  const getCurrentUserSync = (): User => {
    const role = store.getState().activeRole ?? 'clinician';
    return DEMO_USERS.find((u) => u.role === role) ?? DEMO_USERS[0]!;
  };

  const appendAudit = (action: AuditActionType, summary: string, sessionId?: string): AuditEvent => {
    const actor = getCurrentUserSync();
    const nowIso = defaultClinicClock.nowIso();
    const match = /T(\d{2}:\d{2})/.exec(nowIso);
    const timeLabel = match?.[1] ?? '10:15';
    const evt: AuditEvent = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      timestamp: nowIso,
      timeLabel,
      actorType: 'user',
      actorId: actor.id,
      actorDisplayName: actor.displayName,
      action,
      summary,
    };
    store.update((prev) => ({
      ...prev,
      auditEvents: [evt, ...prev.auditEvents],
    }));
    return evt;
  };

  return {
    mode: 'demo',

    auth: {
      async getCurrentUser(): Promise<User | null> {
        const role = store.getState().activeRole;
        if (!role) return null;
        return DEMO_USERS.find((u) => u.role === role) ?? null;
      },
      async listDemoUsers(): Promise<readonly User[]> {
        return DEMO_USERS;
      },
      async switchRole(role: UserRole): Promise<User> {
        const target = DEMO_USERS.find((u) => u.role === role) ?? DEMO_USERS[0]!;
        store.update((prev) => ({
          ...prev,
          activeRole: target.role,
        }));
        return target;
      },
      async signOut(): Promise<void> {
        store.update((prev) => ({
          ...prev,
          activeRole: null,
        }));
      },
    },

    sessions: {
      async getDashboardMetrics(): Promise<DashboardSummaryMetrics> {
        const state = store.getState();
        const refDate = state.referenceDate; // "2026-10-06"
        const todaysSessions = state.sessions.filter((s) => s.encounterDate === refDate);

        const needsReviewCount = todaysSessions.filter(
          (s) => s.review.status === 'draft_ready_for_approval',
        ).length;

        const clarificationSessions = todaysSessions.filter(
          (s) => s.review.status === 'draft_requires_clarification',
        );

        const openClarificationQuestionsCount = clarificationSessions.reduce(
          (sum, s) => sum + s.review.unresolvedClarificationCount,
          0,
        );

        const releasedTodayCount = todaysSessions.filter(
          (s) =>
            s.release.status === 'released' &&
            s.release.releasedAt !== undefined &&
            defaultClinicClock.toCalendarDateInClinicTz(s.release.releasedAt) === refDate,
        ).length;

        const primaryClarificationSession = clarificationSessions[0];

        return {
          referenceDate: refDate,
          referenceDateLabel: formatReferenceDateLabel(refDate),
          todaysSessionsCount: todaysSessions.length,
          needsReviewCount,
          clarificationNeededSessionsCount: clarificationSessions.length,
          openClarificationQuestionsCount,
          releasedTodayCount,
          attentionSession: primaryClarificationSession
            ? {
                sessionId: primaryClarificationSession.id,
                headline: `${primaryClarificationSession.id} needs your attention`,
                detail: 'Confirm medication strength and allergy status before approval.',
              }
            : undefined,
        };
      },

      async listSessions(filter?: SessionListFilter): Promise<readonly ClinicalSession[]> {
        const state = store.getState();
        let items = state.sessions;

        if (filter?.encounterDate && filter.encounterDate !== 'all') {
          if (filter.encounterDate === 'historical') {
            items = items.filter((s) => s.encounterDate !== state.referenceDate);
          } else {
            items = items.filter((s) => s.encounterDate === filter.encounterDate);
          }
        }

        if (filter?.query) {
          const q = filter.query.trim().toLowerCase();
          items = items.filter((s) => {
            const deptReadable = s.department.replace(/_/g, ' ').toLowerCase();
            return (
              s.id.toLowerCase().includes(q) ||
              s.visitType.toLowerCase().includes(q) ||
              s.patientName.toLowerCase().includes(q) ||
              s.primarySymptom.toLowerCase().includes(q) ||
              s.department.toLowerCase().includes(q) ||
              deptReadable.includes(q)
            );
          });
        }

        if (filter?.statusFilter && filter.statusFilter !== 'all') {
          items = items.filter((s) => {
            const derived = deriveSessionDisplayState(s);
            switch (filter.statusFilter) {
              case 'attention':
                return derived.needsClinicianAttention;
              case 'capture':
                return (
                  derived.code === 'CONSENT_NEEDED' ||
                  derived.code === 'READY_TO_CAPTURE' ||
                  derived.code === 'RECORDING_ACTIVE' ||
                  derived.code === 'RECORDING_PAUSED' ||
                  derived.code === 'RECORDING_ERROR' ||
                  derived.code === 'UPLOAD_INTERRUPTED' ||
                  derived.code === 'RECORDING_READY'
                );
              case 'processing':
                return derived.code === 'PROCESSING' || derived.code === 'REGENERATING_DRAFT';
              case 'needs_review':
                return derived.code === 'NEEDS_REVIEW' || derived.code === 'DRAFT_SAVED_READY';
              case 'clarification_needed':
                return (
                  derived.code === 'CLARIFICATION_NEEDED' ||
                  derived.code === 'DRAFT_SAVED_NEEDS_CLARIFICATION'
                );
              case 'processing_interrupted':
                return derived.code === 'PROCESSING_INTERRUPTED';
              case 'released':
                return derived.code === 'RELEASED' || derived.code === 'APPROVED_NOT_RELEASED';
              default:
                return true;
            }
          });
        }

        return items;
      },

      async getSessionById(sessionId: string): Promise<ClinicalSession> {
        const found = store.getState().sessions.find((s) => s.id === sessionId);
        if (!found) {
          throw new Error(`Session ${sessionId} not found.`);
        }
        return found;
      },

      async getSessionReviewBundle(sessionId: string): Promise<SessionReviewBundle> {
        const state = store.getState();
        const session = state.sessions.find((s) => s.id === sessionId);
        if (!session) {
          throw new Error(`Session ${sessionId} not found.`);
        }
        return {
          session,
          recording: state.recordings[sessionId],
          transcript: state.transcripts[sessionId],
          report: state.reports[sessionId],
        };
      },

      async confirmPatientConsent(sessionId: string): Promise<ClinicalSession> {
        const user = getCurrentUserSync();
        const target = store.getState().sessions.find((s) => s.id === sessionId);
        if (!target) throw new Error(`Session ${sessionId} not found.`);
        assertAssignedClinician(user, target);

        const nowIso = defaultClinicClock.nowIso();
        let updated: ClinicalSession | undefined;
        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            updated = {
              ...s,
              updatedAt: nowIso,
              capture: {
                ...s.capture,
                status: s.capture.status === 'consent_pending' ? 'ready_to_capture' : s.capture.status,
                consentConfirmed: true,
                consentConfirmedAt: nowIso,
                consentConfirmedByUserId: user.id,
              },
            };
            return updated;
          }),
        }));
        if (!updated) throw new Error(`Session ${sessionId} not found.`);
        appendAudit('CONSENT_CONFIRMED', 'Confirmed patient consent for visit recording', sessionId);
        return updated;
      },

      async createSession(input: CreateClinicalSessionInput): Promise<ClinicalSession> {
        const user = getCurrentUserSync();
        if (user.role !== 'clinician') {
          throw new DomainTransitionError(
            'UNAUTHORIZED_ROLE_OR_OWNER',
            'Only authorized clinicians may create or record clinical visits.',
          );
        }

        const nowIso = defaultClinicClock.nowIso();
        const maxNumericId = store.getState().sessions.reduce((max, s) => {
          const match = /^CS-(\d+)$/.exec(s.id);
          const num = match?.[1] ? Number.parseInt(match[1], 10) : 0;
          return num > max ? num : max;
        }, 1048);
        const newId = `CS-${maxNumericId + 1}`;

        const created: ClinicalSession = {
          id: newId,
          patientId: input.patientId,
          patientName: input.patientName,
          assignedClinicianId: user.id,
          assignedClinicianName: user.displayName,
          department: input.department,
          visitType: input.visitType,
          diagnosisCategory: input.diagnosisCategory ?? 'other',
          primarySymptom: input.primarySymptom ?? 'Other',
          followUpDocumented: false,
          templateId: input.templateId,
          encounterDate: store.getState().referenceDate,
          createdAt: nowIso,
          updatedAt: nowIso,
          capture: {
            status: input.consentConfirmed ? 'ready_to_capture' : 'consent_pending',
            origin: 'unselected',
            consentConfirmed: input.consentConfirmed,
            consentConfirmedAt: input.consentConfirmed ? nowIso : undefined,
            consentConfirmedByUserId: input.consentConfirmed ? user.id : undefined,
            selectedDeviceLabel:
              input.selectedDeviceLabel ?? store.getState().preferences.defaultMicrophone,
            durationSeconds: 0,
          },
          processing: {
            status: 'idle',
            retryCount: 0,
            maxRetries: 2,
            stages: [],
          },
          review: {
            status: 'not_generated',
            currentRevision: 0,
            unresolvedClarificationCount: 0,
            isDraftSaved: false,
          },
          release: {
            status: 'not_released',
          },
          privacy: {
            status: 'not_started',
            safeHarborChecked: false,
            independentPassesCompleted: 0,
          },
        };
        store.update((prev) => ({
          ...prev,
          sessions: [created, ...prev.sessions],
        }));
        if (input.consentConfirmed) {
          appendAudit('CONSENT_CONFIRMED', 'Confirmed consent and initialized clinical visit', newId);
        }
        return created;
      },
    },

    capture: {
      async getAudioFormatCapabilities(): Promise<AudioFormatCapability> {
        const candidates = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4;codecs=mp4a.40.2',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/wav',
        ];
        const supported =
          typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
            ? candidates.filter((mime) => {
                try {
                  return MediaRecorder.isTypeSupported(mime);
                } catch {
                  return false;
                }
              })
            : [];
        const preferredMimeType = supported[0] ?? 'audio/webm;codecs=opus';
        return {
          preferredMimeType,
          supportedMimeTypes: supported.length > 0 ? supported : [preferredMimeType],
          requiresServerSideNormalization: true,
          targetTranscriptionFormat: 'audio/wav;rate=16000;channels=1',
        };
      },

      async saveLiveRecording(
        input: SaveLiveRecordingInput,
      ): Promise<{ session: ClinicalSession; recording: RecordingMetadata }> {
        const user = getCurrentUserSync();
        const existingSession = store.getState().sessions.find((s) => s.id === input.sessionId);
        if (!existingSession) throw new Error(`Session ${input.sessionId} not found.`);
        assertAssignedClinician(user, existingSession);

        if (!existingSession.capture.consentConfirmed) {
          throw new DomainTransitionError(
            'CONSENT_REQUIRED',
            'Explicit patient recording consent must be confirmed before capturing or submitting visit audio.',
          );
        }

        if (
          existingSession.capture.status === 'recording_ready' ||
          existingSession.capture.status === 'capture_completed'
        ) {
          throw new DomainTransitionError(
            'INVALID_LIFECYCLE_TRANSITION',
            'Audio has already been submitted for this session. Discard the existing recording before submitting a new one.',
          );
        }

        if (input.signal?.aborted) {
          throw new Error('Audio submission was cancelled.');
        }

        input.onProgress?.(25);
        const nowIso = defaultClinicClock.nowIso();
        const recordingId = `rec-${input.sessionId.toLowerCase()}-${Date.now()}`;
        // Store transient audio Blob strictly in memory; never serialize to sessionStorage
        transientMediaRegistry.putRecordingBlob({
          recordingId,
          sessionId: input.sessionId,
          mimeType: input.mimeType,
          blob: input.audioBlob,
        });
        input.onProgress?.(100);

        const durationLabel = formatDurationLabel(input.durationSeconds);
        const recording: RecordingMetadata = {
          id: recordingId,
          sessionId: input.sessionId,
          origin: 'live_microphone',
          deviceName: input.deviceName,
          mimeType: input.mimeType,
          durationSeconds: input.durationSeconds,
          durationLabel,
          fileSizeBytes: input.audioBlob.size,
          validationStatus: 'valid',
          recordedAt: nowIso,
        };
        let updatedSession: ClinicalSession | undefined;
        store.update((prev) => ({
          ...prev,
          recordings: {
            ...prev.recordings,
            [input.sessionId]: recording,
          },
          sessions: prev.sessions.map((s) => {
            if (s.id !== input.sessionId) return s;
            const nextSession: ClinicalSession = {
              ...s,
              updatedAt: nowIso,
              capture: {
                ...s.capture,
                status: 'recording_ready',
                origin: 'live_microphone',
                selectedDeviceLabel: input.deviceName,
                recordingId,
                durationSeconds: input.durationSeconds,
                uploadProgressPct: 100,
                errorCode: undefined,
                errorMessage: undefined,
              },
            };
            updatedSession = nextSession;
            return nextSession;
          }),
        }));
        if (!updatedSession) throw new Error(`Session ${input.sessionId} not found.`);
        appendAudit(
          'RECORDING_FINISHED',
          `Completed live microphone capture (${durationLabel}, ${input.deviceName})`,
          input.sessionId,
        );
        return { session: updatedSession, recording };
      },

      async createSimulatedRecording(
        input: CreateSimulatedRecordingInput,
      ): Promise<{ session: ClinicalSession; recording: RecordingMetadata }> {
        const user = getCurrentUserSync();
        const existingSession = store.getState().sessions.find((s) => s.id === input.sessionId);
        if (!existingSession) throw new Error(`Session ${input.sessionId} not found.`);
        assertAssignedClinician(user, existingSession);

        if (!existingSession.capture.consentConfirmed) {
          throw new DomainTransitionError(
            'CONSENT_REQUIRED',
            'Explicit patient recording consent must be confirmed before preparing a simulated recording.',
          );
        }

        const nowIso = defaultClinicClock.nowIso();
        const durationSeconds = input.durationSeconds ?? 522;
        const durationLabel = formatDurationLabel(durationSeconds);
        const deviceLabel = input.deviceName ?? 'Simulated Demo Audio Source';
        const recordingId = `rec-sim-${input.sessionId.toLowerCase()}`;
        const recording: RecordingMetadata = {
          id: recordingId,
          sessionId: input.sessionId,
          origin: 'simulated_demo_audio',
          deviceName: deviceLabel,
          mimeType: 'audio/webm;codecs=opus',
          durationSeconds,
          durationLabel,
          validationStatus: 'valid',
          recordedAt: nowIso,
        };
        let updatedSession: ClinicalSession | undefined;
        store.update((prev) => ({
          ...prev,
          recordings: {
            ...prev.recordings,
            [input.sessionId]: recording,
          },
          sessions: prev.sessions.map((s) => {
            if (s.id !== input.sessionId) return s;
            const nextSession: ClinicalSession = {
              ...s,
              updatedAt: nowIso,
              capture: {
                ...s.capture,
                status: 'recording_ready',
                origin: 'simulated_demo_audio',
                selectedDeviceLabel: deviceLabel,
                recordingId,
                durationSeconds,
              },
            };
            updatedSession = nextSession;
            return nextSession;
          }),
        }));
        if (!updatedSession) throw new Error(`Session ${input.sessionId} not found.`);
        appendAudit(
          'RECORDING_FINISHED',
          'Prepared explicitly labeled simulated demo recording',
          input.sessionId,
        );
        return { session: updatedSession, recording };
      },

      async uploadConsentedAudioFile(
        input: UploadAudioFileInput,
      ): Promise<{ session: ClinicalSession; recording: RecordingMetadata }> {
        const user = getCurrentUserSync();
        const existingSession = store.getState().sessions.find((s) => s.id === input.sessionId);
        if (!existingSession) throw new Error(`Session ${input.sessionId} not found.`);
        assertAssignedClinician(user, existingSession);

        if (!existingSession.capture.consentConfirmed) {
          throw new DomainTransitionError(
            'CONSENT_REQUIRED',
            'Explicit patient recording consent must be confirmed before uploading an audio file.',
          );
        }

        if (
          existingSession.capture.status === 'recording_ready' ||
          existingSession.capture.status === 'capture_completed'
        ) {
          throw new DomainTransitionError(
            'INVALID_LIFECYCLE_TRANSITION',
            'Audio has already been submitted for this session. Discard the existing recording before uploading another file.',
          );
        }

        const nowIso = defaultClinicClock.nowIso();

        if (input.signal?.aborted) {
          throw new Error('Audio file upload was cancelled.');
        }

        const normalizedMime = input.mimeType.trim().toLowerCase();
        const baseMime = normalizedMime.split(';')[0] ?? '';
        const isSupportedFormat =
          SUPPORTED_UPLOAD_MIME_TYPES.has(normalizedMime) ||
          SUPPORTED_UPLOAD_MIME_TYPES.has(baseMime) ||
          SUPPORTED_UPLOAD_EXTENSIONS.test(input.fileName);

        if (!isSupportedFormat) {
          store.update((prev) => ({
            ...prev,
            sessions: prev.sessions.map((s) =>
              s.id === input.sessionId
                ? {
                    ...s,
                    updatedAt: nowIso,
                    capture: {
                      ...s.capture,
                      status: 'upload_failed',
                      origin: 'uploaded_file',
                      errorCode: 'UNSUPPORTED_AUDIO_FORMAT',
                      errorMessage: `Unsupported audio format (${input.fileName || input.mimeType}). Supported formats: WAV, MP3, M4A, MP4, AAC, WebM, OGG, FLAC.`,
                    },
                  }
                : s,
            ),
          }));
          throw new Error(
            `Unsupported audio format (${input.fileName || input.mimeType}). Please select a WAV, MP3, M4A, MP4, AAC, WebM, OGG, or FLAC audio file.`,
          );
        }

        if (input.byteSize <= 0 || input.byteSize > MAX_AUDIO_UPLOAD_BYTES) {
          const sizeMsg =
            input.byteSize <= 0
              ? 'The selected audio file is empty (0 bytes).'
              : `The selected audio file (${(input.byteSize / (1024 * 1024)).toFixed(1)} MB) exceeds the 100 MB maximum limit.`;
          store.update((prev) => ({
            ...prev,
            sessions: prev.sessions.map((s) =>
              s.id === input.sessionId
                ? {
                    ...s,
                    updatedAt: nowIso,
                    capture: {
                      ...s.capture,
                      status: 'upload_failed',
                      origin: 'uploaded_file',
                      errorCode: 'UPLOAD_INTERRUPTED',
                      errorMessage: sizeMsg,
                    },
                  }
                : s,
            ),
          }));
          throw new Error(sizeMsg);
        }

        input.onProgress?.(30);

        if (input.simulateFailure) {
          let failedSession: ClinicalSession | undefined;
          store.update((prev) => ({
            ...prev,
            sessions: prev.sessions.map((s) => {
              if (s.id !== input.sessionId) return s;
              const nextSession: ClinicalSession = {
                ...s,
                updatedAt: nowIso,
                capture: {
                  ...s.capture,
                  status: 'upload_failed',
                  origin: 'uploaded_file',
                  errorCode: 'UPLOAD_INTERRUPTED',
                  errorMessage:
                    'Audio file validation or upload was interrupted. Please verify file format and retry.',
                },
              };
              failedSession = nextSession;
              return nextSession;
            }),
          }));
          if (!failedSession) throw new Error(`Session ${input.sessionId} not found.`);
          throw new Error('Audio upload interrupted.');
        }

        if (input.signal?.aborted) {
          throw new Error('Audio file upload was cancelled.');
        }

        const recordingId = `rec-upload-${input.sessionId.toLowerCase()}-${Date.now()}`;
        if (input.audioBlob) {
          transientMediaRegistry.putRecordingBlob({
            recordingId,
            sessionId: input.sessionId,
            mimeType: input.mimeType || 'audio/wav',
            blob: input.audioBlob,
          });
        }
        input.onProgress?.(100);

        const durationLabel = formatDurationLabel(input.durationSeconds);
        const recording: RecordingMetadata = {
          id: recordingId,
          sessionId: input.sessionId,
          origin: 'uploaded_file',
          fileName: input.fileName,
          mimeType: input.mimeType || 'audio/wav',
          durationSeconds: input.durationSeconds,
          durationLabel,
          fileSizeBytes: input.byteSize,
          validationStatus: 'valid',
          recordedAt: nowIso,
        };
        let updatedSession: ClinicalSession | undefined;
        store.update((prev) => ({
          ...prev,
          recordings: {
            ...prev.recordings,
            [input.sessionId]: recording,
          },
          sessions: prev.sessions.map((s) => {
            if (s.id !== input.sessionId) return s;
            const nextSession: ClinicalSession = {
              ...s,
              updatedAt: nowIso,
              capture: {
                ...s.capture,
                status: 'recording_ready',
                origin: 'uploaded_file',
                recordingId,
                durationSeconds: input.durationSeconds,
                uploadProgressPct: 100,
                errorCode: undefined,
                errorMessage: undefined,
              },
            };
            updatedSession = nextSession;
            return nextSession;
          }),
        }));
        if (!updatedSession) throw new Error(`Session ${input.sessionId} not found.`);
        appendAudit(
          'AUDIO_UPLOADED',
          `Uploaded consented recording (${input.fileName}, ${durationLabel})`,
          input.sessionId,
        );
        return { session: updatedSession, recording };
      },

      async discardRecording(sessionId: string): Promise<ClinicalSession> {
        const user = getCurrentUserSync();
        const existingSession = store.getState().sessions.find((s) => s.id === sessionId);
        if (!existingSession) throw new Error(`Session ${sessionId} not found.`);
        assertAssignedClinician(user, existingSession);

        transientMediaRegistry.removeRecordingsForSession(sessionId);

        const nowIso = defaultClinicClock.nowIso();
        let updatedSession: ClinicalSession | undefined;
        store.update((prev) => {
          const nextRecordings = { ...prev.recordings };
          delete nextRecordings[sessionId];
          return {
            ...prev,
            recordings: nextRecordings,
            sessions: prev.sessions.map((s) => {
              if (s.id !== sessionId) return s;
              const nextSession: ClinicalSession = {
                ...s,
                updatedAt: nowIso,
                capture: {
                  ...s.capture,
                  status: s.capture.consentConfirmed ? 'ready_to_capture' : 'consent_pending',
                  origin: 'unselected',
                  recordingId: undefined,
                  durationSeconds: 0,
                  uploadProgressPct: undefined,
                  errorCode: undefined,
                  errorMessage: undefined,
                },
                // A discarded recording also clears any interrupted processing job,
                // so the visit can be captured again from a clean state.
                processing:
                  s.review.status === 'not_generated'
                    ? { status: 'idle', retryCount: 0, maxRetries: 2, stages: [] }
                    : s.processing,
              };
              updatedSession = nextSession;
              return nextSession;
            }),
          };
        });
        if (!updatedSession) throw new Error(`Session ${sessionId} not found.`);
        appendAudit('RECORDING_DISCARDED', 'Discarded unsubmitted recording', sessionId);
        return updatedSession;
      },
    },

    processing: {
      async startProcessingPipeline(input: StartProcessingInput): Promise<ClinicalSession> {
        const nowIso = defaultClinicClock.nowIso();
        let updatedSession: ClinicalSession | undefined;
        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => {
            if (s.id !== input.sessionId) return s;
            const nextSession: ClinicalSession = {
              ...s,
              updatedAt: nowIso,
              templateId: input.templateId,
              capture: {
                ...s.capture,
                status: 'capture_completed',
                origin: input.origin,
                recordingId: input.recordingId,
              },
              processing: {
                status: 'running',
                activeJobId: `job-${input.sessionId.toLowerCase()}`,
                kind: 'initial_processing',
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
                    status: 'in_progress',
                    detailMessage: 'Working on this step…',
                  },
                  {
                    key: 'speaker_attribution',
                    label: 'Speaker attribution',
                    status: 'waiting',
                    detailMessage: 'Starts after the previous step',
                  },
                  {
                    key: 'structured_report',
                    label: 'Structured report',
                    status: 'waiting',
                    detailMessage: 'Starts after the previous step',
                  },
                  {
                    key: 'clinician_review',
                    label: 'Clinician review',
                    status: 'waiting',
                    detailMessage: 'Starts after the previous step',
                  },
                ],
              },
            };
            updatedSession = nextSession;
            return nextSession;
          }),
        }));
        if (!updatedSession) throw new Error(`Session ${input.sessionId} not found.`);
        return updatedSession;
      },

      async getProcessingStatus(sessionId: string): Promise<ProcessingLifecycleState> {
        const found = store.getState().sessions.find((s) => s.id === sessionId);
        if (!found) throw new Error(`Session ${sessionId} not found.`);
        return found.processing;
      },

      async retryProcessingPipeline(sessionId: string): Promise<ClinicalSession> {
        const nowIso = defaultClinicClock.nowIso();
        const target = store.getState().sessions.find((s) => s.id === sessionId);
        if (!target) throw new Error(`Session ${sessionId} not found.`);
        if (target.processing.retryCount >= target.processing.maxRetries) {
          throw new DomainTransitionError(
            'INVALID_LIFECYCLE_TRANSITION',
            `Retry limit reached (${target.processing.maxRetries} attempts). Discard the recording and capture the visit again.`,
          );
        }
        let updatedSession: ClinicalSession | undefined;
        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const nextSession: ClinicalSession = {
              ...s,
              updatedAt: nowIso,
              processing: {
                ...s.processing,
                status: 'running',
                failedStage: undefined,
                retryCount: s.processing.retryCount + 1,
                startedAt: nowIso,
                stages: s.processing.stages.map((stage) =>
                  stage.status === 'failed'
                    ? { ...stage, status: 'in_progress' as const, detailMessage: 'Retrying transcription…' }
                    : stage,
                ),
              },
            };
            updatedSession = nextSession;
            return nextSession;
          }),
        }));
        if (!updatedSession) throw new Error(`Session ${sessionId} not found.`);
        return updatedSession;
      },

      async completeProcessingPipelineDemo(sessionId: string): Promise<SessionReviewBundle> {
        const nowIso = defaultClinicClock.nowIso();
        const state = store.getState();
        const targetSession = state.sessions.find((s) => s.id === sessionId);
        if (!targetSession) throw new Error(`Session ${sessionId} not found.`);
        // Seeded sessions keep their canonical drafts; new visits get a simulated draft
        // built for their own patient (never another patient's report).
        const simulated =
          state.reports[sessionId] && state.transcripts[sessionId]
            ? null
            : buildSimulatedVisitDraft(targetSession, nowIso);
        const existingReport = state.reports[sessionId] ?? simulated!.report;
        const existingTranscript = state.transcripts[sessionId] ?? simulated!.transcript;
        let updatedSession: ClinicalSession | undefined;

        store.update((prev) => ({
          ...prev,
          transcripts: {
            ...prev.transcripts,
            [sessionId]: { ...existingTranscript, sessionId },
          },
          reports: {
            ...prev.reports,
            [sessionId]: { ...existingReport, sessionId },
          },
          sessions: prev.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const unresolved = existingReport.clarifications.filter((c) => c.status === 'unresolved').length;
            const nextSession: ClinicalSession = {
              ...s,
              updatedAt: nowIso,
              processing: {
                ...s.processing,
                status: 'completed',
                completedAt: nowIso,
                stages: s.processing.stages.map((st) => ({
                  ...st,
                  status: 'complete' as const,
                  detailMessage: 'Completed successfully',
                })),
              },
              review: {
                ...s.review,
                status: unresolved > 0 ? 'draft_requires_clarification' : 'draft_ready_for_approval',
                currentReportId: existingReport.id,
                currentRevision: existingReport.currentRevision,
                unresolvedClarificationCount: unresolved,
                isDraftSaved: false,
                reviewStartedAt: nowIso,
              },
            };
            updatedSession = nextSession;
            return nextSession;
          }),
        }));

        if (!updatedSession) throw new Error(`Session ${sessionId} not found.`);
        const nextState = store.getState();
        return {
          session: updatedSession,
          recording: nextState.recordings[sessionId],
          transcript: nextState.transcripts[sessionId],
          report: nextState.reports[sessionId],
        };
      },
    },

    review: {
      async saveDraft({ sessionId, expectedRevision }): Promise<ClinicalSession> {
        const user = getCurrentUserSync();
        const state = store.getState();
        const session = state.sessions.find((s) => s.id === sessionId);
        const report = state.reports[sessionId];
        if (!session || !report) throw new Error(`Review bundle for ${sessionId} not found.`);

        const updatedSession = transitionSaveDraft({
          user,
          session,
          report,
          expectedRevision,
          nowIso: defaultClinicClock.nowIso(),
        });

        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? updatedSession : s)),
        }));
        appendAudit('DRAFT_SAVED', `Saved clinical draft v${report.currentRevision}`, sessionId);
        return updatedSession;
      },

      async resolveClarifications({ sessionId, expectedRevision, answers }): Promise<SessionReviewBundle> {
        const user = getCurrentUserSync();
        const state = store.getState();
        const session = state.sessions.find((s) => s.id === sessionId);
        const report = state.reports[sessionId];
        if (!session || !report) throw new Error(`Review bundle for ${sessionId} not found.`);

        const result = transitionResolveClarifications({
          user,
          session,
          report,
          expectedRevision,
          answers,
          nowIso: defaultClinicClock.nowIso(),
        });

        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? result.session : s)),
          reports: {
            ...prev.reports,
            [sessionId]: result.report,
          },
        }));

        appendAudit('CLARIFICATIONS_RESOLVED', 'Answered clarification questions', sessionId);
        return {
          session: result.session,
          recording: state.recordings[sessionId],
          transcript: state.transcripts[sessionId],
          report: result.report,
        };
      },

      async reopenClarification({ sessionId, expectedRevision, questionId }): Promise<SessionReviewBundle> {
        const user = getCurrentUserSync();
        const state = store.getState();
        const session = state.sessions.find((s) => s.id === sessionId);
        const report = state.reports[sessionId];
        if (!session || !report) throw new Error(`Review bundle for ${sessionId} not found.`);

        const result = transitionReopenClarification({
          user,
          session,
          report,
          expectedRevision,
          questionId,
          nowIso: defaultClinicClock.nowIso(),
        });

        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? result.session : s)),
          reports: {
            ...prev.reports,
            [sessionId]: result.report,
          },
        }));

        appendAudit('DRAFT_EDITED', 'Reopened clinical clarification question for review', sessionId);
        return {
          session: result.session,
          recording: state.recordings[sessionId],
          transcript: state.transcripts[sessionId],
          report: result.report,
        };
      },

      async editReport({
        sessionId,
        expectedRevision,
        subjective,
        objective,
        assessment,
        plan,
        additionalNotes,
        soapUpdates,
        changeSummary,
      }): Promise<SessionReviewBundle> {
        const user = getCurrentUserSync();
        const state = store.getState();
        const session = state.sessions.find((s) => s.id === sessionId);
        const report = state.reports[sessionId];
        if (!session || !report) throw new Error(`Review bundle for ${sessionId} not found.`);

        const mergedSoapUpdates: Partial<SoapSections> = {
          ...(subjective !== undefined ? { subjective } : {}),
          ...(objective !== undefined ? { objective } : {}),
          ...(assessment !== undefined ? { assessment } : {}),
          ...(plan !== undefined ? { plan } : {}),
          ...(additionalNotes !== undefined ? { additionalNotes } : {}),
          ...soapUpdates,
        };

        const result = transitionEditReport({
          user,
          session,
          report,
          expectedRevision,
          soapUpdates: mergedSoapUpdates,
          changeSummary,
          nowIso: defaultClinicClock.nowIso(),
        });

        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? result.session : s)),
          reports: {
            ...prev.reports,
            [sessionId]: result.report,
          },
        }));

        appendAudit('DRAFT_EDITED', 'Saved corrected clinical draft', sessionId);
        return {
          session: result.session,
          recording: state.recordings[sessionId],
          transcript: state.transcripts[sessionId],
          report: result.report,
        };
      },

      async rejectAndRegenerate({ sessionId, expectedRevision, rejectionReason }): Promise<SessionReviewBundle> {
        const user = getCurrentUserSync();
        const state = store.getState();
        const session = state.sessions.find((s) => s.id === sessionId);
        const report = state.reports[sessionId];
        if (!session || !report) throw new Error(`Review bundle for ${sessionId} not found.`);

        const result = transitionRejectDraftStartRegeneration({
          user,
          session,
          report,
          expectedRevision,
          rejectionReason,
          jobId: `job-regen-${Date.now()}`,
          nowIso: defaultClinicClock.nowIso(),
        });

        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? result.session : s)),
          reports: {
            ...prev.reports,
            [sessionId]: result.report,
          },
        }));

        appendAudit('DRAFT_REJECTED_REGENERATING', 'Requested a new draft with clinician feedback', sessionId);
        return {
          session: result.session,
          recording: state.recordings[sessionId],
          transcript: state.transcripts[sessionId],
          report: result.report,
        };
      },

      async completeRegeneration(sessionId: string): Promise<SessionReviewBundle> {
        const state = store.getState();
        const session = state.sessions.find((s) => s.id === sessionId);
        const report = state.reports[sessionId];
        if (!session || !report) throw new Error(`Review bundle for ${sessionId} not found.`);

        const result = transitionCompleteDraftRegeneration({
          session,
          report,
          regeneratedSoap: report.soap,
          nowIso: defaultClinicClock.nowIso(),
        });

        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? result.session : s)),
          reports: {
            ...prev.reports,
            [sessionId]: result.report,
          },
        }));

        appendAudit('DRAFT_REGENERATED', `Drafting agent generated revision v${result.report.currentRevision}`, sessionId);
        return {
          session: result.session,
          recording: state.recordings[sessionId],
          transcript: state.transcripts[sessionId],
          report: result.report,
        };
      },

      async approveAndFinalize({ sessionId, expectedRevision }): Promise<SessionReviewBundle> {
        const user = getCurrentUserSync();
        const state = store.getState();
        const session = state.sessions.find((s) => s.id === sessionId);
        const report = state.reports[sessionId];
        if (!session || !report) throw new Error(`Review bundle for ${sessionId} not found.`);

        const updatedSession = transitionApproveAndFinalizeReport({
          user,
          session,
          report,
          expectedRevision,
          nowIso: defaultClinicClock.nowIso(),
        });

        // Preserve the report's AI provenance (isSimulatedAiOutput, provenanceFindings, and revisions)
        const finalizedReport: ClinicalReport = {
          ...report,
        };

        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? updatedSession : s)),
          reports: {
            ...prev.reports,
            [sessionId]: finalizedReport,
          },
        }));

        appendAudit(
          'REPORT_APPROVED_FINALIZED',
          `Approved and finalized clinical report Revision v${finalizedReport.currentRevision} for ${session.id} (${session.patientName})`,
          sessionId,
        );
        return {
          session: updatedSession,
          recording: state.recordings[sessionId],
          transcript: state.transcripts[sessionId],
          report: finalizedReport,
        };
      },

      async releaseToPatient({ sessionId, expectedRevision }): Promise<SessionReviewBundle> {
        const user = getCurrentUserSync();
        const state = store.getState();
        const session = state.sessions.find((s) => s.id === sessionId);
        const report = state.reports[sessionId];
        if (!session || !report) throw new Error(`Review bundle for ${sessionId} not found.`);

        const updatedSession = transitionReleaseReportToPatient({
          user,
          session,
          report,
          expectedRevision,
          nowIso: defaultClinicClock.nowIso(),
        });

        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? updatedSession : s)),
        }));

        appendAudit(
          'REPORT_RELEASED_TO_PATIENT',
          `Released finalized report Revision v${updatedSession.release.releasedRevision ?? report.currentRevision} to patient portal (${session.patientName})`,
          sessionId,
        );
        return {
          session: updatedSession,
          recording: state.recordings[sessionId],
          transcript: state.transcripts[sessionId],
          report,
        };
      },
    },

    privacy: {
      async completePrivacyVerification(sessionId: string): Promise<ClinicalSession> {
        const nowIso = defaultClinicClock.nowIso();
        let updated: ClinicalSession | undefined;
        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            updated = {
              ...s,
              updatedAt: nowIso,
              privacy: {
                status: 'verified_eligible',
                safeHarborChecked: true,
                independentPassesCompleted: 2,
                lastProcessedAt: nowIso,
              },
            };
            return updated;
          }),
        }));
        if (!updated) throw new Error(`Session ${sessionId} not found.`);
        appendAudit('PRIVACY_VERIFICATION_COMPLETED', '2-pass privacy verification completed', sessionId);
        return updated;
      },

      async triggerVerificationRetryDemo(sessionId: string): Promise<ClinicalSession> {
        const nowIso = defaultClinicClock.nowIso();
        let updated: ClinicalSession | undefined;
        store.update((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            updated = {
              ...s,
              updatedAt: nowIso,
              privacy: {
                status: 'verification_retry_required',
                safeHarborChecked: false,
                independentPassesCompleted: 1,
                lastProcessedAt: nowIso,
                retryReason: 'An independent check found a remaining identifier in the demo pipeline.',
              },
            };
            return updated;
          }),
        }));
        if (!updated) throw new Error(`Session ${sessionId} not found.`);
        return updated;
      },
    },

    patientPortal: {
      async listReleasedReportsForPatient(patientId: string) {
        const trimmedPatientId = patientId.trim();
        if (!trimmedPatientId) {
          throw new Error('A valid patient identifier is required to list released reports.');
        }

        const state = store.getState();
        const activeUser = getCurrentUserSync();
        if (
          activeUser.role === 'patient' &&
          activeUser.linkedPatientId &&
          activeUser.linkedPatientId !== trimmedPatientId
        ) {
          throw new Error(
            'Access denied: You may only view released reports belonging to your own patient profile.',
          );
        }

        const effectivePatientUser: User =
          activeUser.role === 'patient'
            ? activeUser
            : (DEMO_USERS.find(
                (u) => u.role === 'patient' && u.linkedPatientId === trimmedPatientId,
              ) ?? {
                id: `patient-${trimmedPatientId}`,
                displayName: trimmedPatientId,
                role: 'patient',
                title: 'Patient Portal Member',
                organizationName: 'Northfield Primary Care',
                linkedPatientId: trimmedPatientId,
              });

        return [...state.sessions]
          .filter(
            (s) =>
              canPatientViewReport(effectivePatientUser, s) &&
              state.reports[s.id] !== undefined,
          )
          .sort((a, b) => b.encounterDate.localeCompare(a.encounterDate))
          .map((s) => ({
            session: s,
            report: sanitizeReportForPatient(state.reports[s.id]!),
          }));
      },

      async getReleasedReportDetail(patientId: string, reportOrSessionId: string) {
        const trimmedPatientId = patientId.trim();
        const trimmedTargetId = reportOrSessionId.trim();
        if (!trimmedPatientId || !trimmedTargetId) {
          throw new Error('A valid patient ID and report ID are required.');
        }

        const state = store.getState();
        const activeUser = getCurrentUserSync();
        if (
          activeUser.role === 'patient' &&
          activeUser.linkedPatientId &&
          activeUser.linkedPatientId !== trimmedPatientId
        ) {
          throw new Error(
            'Access denied: You are not authorized to access another patient’s clinical records.',
          );
        }

        const matchedSession = state.sessions.find(
          (s) =>
            s.id === trimmedTargetId ||
            s.review.currentReportId === trimmedTargetId ||
            state.reports[s.id]?.id === trimmedTargetId,
        );

        if (!matchedSession || !state.reports[matchedSession.id]) {
          throw new Error(
            `Requested report "${trimmedTargetId}" could not be found in the patient portal.`,
          );
        }

        if (matchedSession.patientId !== trimmedPatientId) {
          throw new Error(
            'Access denied: This clinical report belongs to another patient record and cannot be accessed from your portal.',
          );
        }

        if (matchedSession.review.status !== 'approved_finalized') {
          throw new Error(
            `Report unavailable: Visit ${matchedSession.id} (${matchedSession.visitType}) is still under clinician review and has not been finalized or released.`,
          );
        }

        if (matchedSession.release.status !== 'released') {
          throw new Error(
            `Report unavailable: Visit ${matchedSession.id} (${matchedSession.visitType}) has been approved by the clinician, but has not yet been released to the patient portal.`,
          );
        }

        return {
          session: matchedSession,
          report: sanitizeReportForPatient(state.reports[matchedSession.id]!),
        };
      },
    },

    analytics: {
      async getAggregateSummary(
        partialCriteria: Partial<AnalyticsFilterCriteria>,
      ): Promise<AnalyticsSummaryResponse> {
        const referenceDate = store.getState().referenceDate;
        if (!analyticsDatasetCache || analyticsDatasetCache.referenceDate !== referenceDate) {
          analyticsDatasetCache = {
            referenceDate,
            records: generateSyntheticAnalyticsDataset(referenceDate),
          };
        }
        return computeAnalyticsSummary(analyticsDatasetCache.records, partialCriteria, referenceDate);
      },
    },

    admin: {
      async listAuditEvents(): Promise<readonly AuditEvent[]> {
        return store.getState().auditEvents;
      },
      async getPreferences(): Promise<WorkspacePreferences> {
        return store.getState().preferences;
      },
      async savePreferences(prefs: Partial<WorkspacePreferences>): Promise<WorkspacePreferences> {
        const nowIso = defaultClinicClock.nowIso();
        let nextPrefs: WorkspacePreferences | undefined;
        store.update((prev) => {
          nextPrefs = {
            ...prev.preferences,
            ...prefs,
            updatedAt: nowIso,
          };
          return {
            ...prev,
            preferences: nextPrefs,
          };
        });
        appendAudit('PREFERENCES_UPDATED', 'Updated workspace preferences');
        return nextPrefs!;
      },
    },
  };
}
