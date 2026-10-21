import type { ICoSignServices } from '../contracts';

// ============================================================================
// CoSign — Connected Mode Provisional API Adapter Skeleton
// Activated when VITE_APP_MODE=connected.
// Note: Does NOT instantiate DemoStore or write any data to sessionStorage.
// ============================================================================

export function createConnectedServices(apiBaseUrl: string): ICoSignServices {
  const notConnectedError = (endpoint: string): Promise<never> =>
    Promise.reject(
      new Error(
        `Connected Mode endpoint (${apiBaseUrl}${endpoint}) is provisional and awaiting teammate backend service integration.`,
      ),
    );

  return {
    mode: 'connected',
    auth: {
      getCurrentUser: () => notConnectedError('/auth/me'),
      listDemoUsers: async () => [],
      switchRole: () => notConnectedError('/auth/switch-role'),
      signOut: () => notConnectedError('/auth/logout'),
    },
    sessions: {
      getDashboardMetrics: () => notConnectedError('/sessions/dashboard-metrics'),
      listSessions: () => notConnectedError('/sessions'),
      getSessionById: (id) => notConnectedError(`/sessions/${id}`),
      getSessionReviewBundle: (id) => notConnectedError(`/sessions/${id}/review-bundle`),
      createSession: () => notConnectedError('/sessions'),
      confirmPatientConsent: (id) => notConnectedError(`/sessions/${id}/consent`),
    },
    capture: {
      getAudioFormatCapabilities: () => notConnectedError('/capture/capabilities'),
      saveLiveRecording: ({ sessionId }) =>
        notConnectedError(`/sessions/${sessionId}/recordings/live`),
      createSimulatedRecording: ({ sessionId }) =>
        notConnectedError(`/sessions/${sessionId}/recordings/simulated`),
      uploadConsentedAudioFile: ({ sessionId }) =>
        notConnectedError(`/sessions/${sessionId}/recordings/upload`),
      discardRecording: (sessionId) =>
        notConnectedError(`/sessions/${sessionId}/recordings`),
    },
    processing: {
      startProcessingPipeline: ({ sessionId }) =>
        notConnectedError(`/sessions/${sessionId}/processing/start`),
      getProcessingStatus: (sessionId) =>
        notConnectedError(`/sessions/${sessionId}/processing/status`),
      retryProcessingPipeline: (sessionId) =>
        notConnectedError(`/sessions/${sessionId}/processing/retry`),
      completeProcessingPipelineDemo: (sessionId) =>
        notConnectedError(`/sessions/${sessionId}/processing/complete`),
    },
    review: {
      saveDraft: ({ sessionId }) => notConnectedError(`/sessions/${sessionId}/report/save`),
      resolveClarifications: ({ sessionId }) =>
        notConnectedError(`/sessions/${sessionId}/clarifications`),
      reopenClarification: ({ sessionId, questionId }) =>
        notConnectedError(`/sessions/${sessionId}/clarifications/${questionId}/reopen`),
      editReport: ({ sessionId }) => notConnectedError(`/sessions/${sessionId}/report`),
      rejectAndRegenerate: ({ sessionId }) =>
        notConnectedError(`/sessions/${sessionId}/report/reject`),
      completeRegeneration: (sessionId) =>
        notConnectedError(`/sessions/${sessionId}/report/complete-regeneration`),
      approveAndFinalize: ({ sessionId }) =>
        notConnectedError(`/sessions/${sessionId}/report/approve`),
      releaseToPatient: ({ sessionId }) => notConnectedError(`/sessions/${sessionId}/release`),
    },
    privacy: {
      completePrivacyVerification: (id) => notConnectedError(`/sessions/${id}/privacy/verify`),
      triggerVerificationRetryDemo: (id) => notConnectedError(`/sessions/${id}/privacy/retry`),
    },
    patientPortal: {
      listReleasedReportsForPatient: () => notConnectedError('/patient/reports'),
      getReleasedReportDetail: (_, id) => notConnectedError(`/patient/reports/${id}`),
    },
    analytics: {
      getAggregateSummary: () => notConnectedError('/analytics/aggregate'),
    },
    admin: {
      listAuditEvents: () => notConnectedError('/audit-events'),
      getPreferences: () => notConnectedError('/preferences'),
      savePreferences: () => notConnectedError('/preferences'),
    },
  };
}
