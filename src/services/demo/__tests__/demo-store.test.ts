import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoServices } from '../demo-services';
import { DemoStore, assertSerializableDemoStateSafe } from '../demo-store';
import { transientMediaRegistry } from '../transient-media-registry';

describe('CoSign DemoStore, Canonical Fixtures & TransientMediaRegistry', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    transientMediaRegistry.clearAll();
  });

  it('derives the exact Figma Clinician Dashboard KPI counters (8 / 2 / 1 / 3) for 2026-10-06', async () => {
    const store = new DemoStore({ persistToSessionStorage: true, referenceDate: '2026-10-06' });
    const services = createDemoServices(store);

    const metrics = await services.sessions.getDashboardMetrics();
    expect(metrics.todaysSessionsCount).toBe(8);
    expect(metrics.needsReviewCount).toBe(2);
    expect(metrics.clarificationNeededSessionsCount).toBe(1);
    expect(metrics.openClarificationQuestionsCount).toBe(2);
    expect(metrics.releasedTodayCount).toBe(3);
  });

  it('keeps transient audio Blobs strictly in memory and clears them on resetToCanonicalSeed', () => {
    const store = new DemoStore({ persistToSessionStorage: true });
    const fakeBlob = new Blob(['synthetic-audio-bytes'], { type: 'audio/webm;codecs=opus' });

    const handle = transientMediaRegistry.putRecordingBlob({
      recordingId: 'rec-test-1',
      sessionId: 'CS-1041',
      mimeType: 'audio/webm;codecs=opus',
      blob: fakeBlob,
    });

    expect(transientMediaRegistry.getRecordingHandle('rec-test-1')).toBeDefined();
    expect(handle.mimeType).toBe('audio/webm;codecs=opus');

    // Resetting the store clears in-memory transient media
    store.resetToCanonicalSeed();
    expect(transientMediaRegistry.getRecordingHandle('rec-test-1')).toBeUndefined();
  });

  it('blocks any attempt to serialize temporary blob: URLs into sessionStorage', () => {
    const store = new DemoStore({ persistToSessionStorage: true });
    const baseState = store.getState();

    const unsafeState = {
      ...baseState,
      recordings: {
        'rec-unsafe': {
          id: 'rec-unsafe',
          sessionId: 'CS-1041',
          origin: 'live_microphone' as const,
          deviceName: 'MacBook microphone',
          mimeType: 'blob:http://localhost:5173/1234-5678',
          durationSeconds: 45,
          durationLabel: '00:45',
          validationStatus: 'valid' as const,
          recordedAt: '2026-10-06T09:00:00-04:00',
        },
      },
    };

    expect(() => assertSerializableDemoStateSafe(unsafeState)).toThrowError(
      /Security violation: Temporary blob: URLs must not be persisted/,
    );
  });

  it('restores canonical seed state after mutations when resetToCanonicalSeed is called', async () => {
    const store = new DemoStore({ persistToSessionStorage: true });
    const services = createDemoServices(store);

    // Mutate session CS-1042 by saving draft
    const updated = await services.review.saveDraft({
      sessionId: 'CS-1042',
      expectedRevision: 1,
    });
    expect(updated.review.isDraftSaved).toBe(true);

    // Reset to canonical seed
    store.resetToCanonicalSeed();
    const restored = await services.sessions.getSessionById('CS-1042');
    expect(restored.review.isDraftSaved).toBe(false);
  });

  it('supports capture, audio upload, and processing job contracts while keeping audio Blobs in memory only', async () => {
    const store = new DemoStore({ persistToSessionStorage: true });
    const services = createDemoServices(store);

    const capabilities = await services.capture.getAudioFormatCapabilities();
    expect(capabilities.targetTranscriptionFormat).toBe('audio/wav;rate=16000;channels=1');

    const newSession = await services.sessions.createSession({
      patientId: 'pat-alex-morgan',
      patientName: 'Alex Morgan',
      department: 'primary_care',
      visitType: 'Follow-up consultation',
      templateId: 'soap_standard',
      consentConfirmed: true,
    });
    expect(newSession.capture.status).toBe('ready_to_capture');

    const audioBlob = new Blob(['test-webm-audio'], { type: 'audio/webm;codecs=opus' });
    const { session: recordedSession, recording } = await services.capture.saveLiveRecording({
      sessionId: newSession.id,
      deviceName: 'MacBook microphone',
      mimeType: 'audio/webm;codecs=opus',
      durationSeconds: 185,
      audioBlob,
    });

    expect(recordedSession.capture.status).toBe('recording_ready');
    expect(recording.origin).toBe('live_microphone');
    expect(transientMediaRegistry.getRecordingHandle(recording.id)?.blob).toBe(audioBlob);

    // Start processing pipeline
    const processingSession = await services.processing.startProcessingPipeline({
      sessionId: newSession.id,
      recordingId: recording.id,
      origin: 'live_microphone',
      templateId: 'soap_standard',
    });
    expect(processingSession.processing.status).toBe('running');

    // Complete demo processing pipeline -> generates transcript & report v1
    const bundle = await services.processing.completeProcessingPipelineDemo(newSession.id);
    expect(bundle.session.processing.status).toBe('completed');
    expect(bundle.report).toBeDefined();
    expect(bundle.transcript).toBeDefined();
  });
});
