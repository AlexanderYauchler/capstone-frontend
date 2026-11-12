import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileAudio,
  FolderKanban,
  HardDriveUpload,
  Info,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Square,
  Trash2,
  Upload,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useServiceContext, useServices } from '../../app/providers/ServiceProvider';
import { invalidateWorkspaceQueries } from '../../app/query-keys';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { Dialog } from '../../design-system/components/Dialog';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { ROLE_WORKSPACE_LABELS } from '../../design-system/layouts/Sidebar';
import type {
  ClinicalSession,
  DepartmentId,
  DiagnosisCategory,
  RecordingMetadata,
  ReportTemplateId,
  WorkspacePreferences,
} from '../../domain/models';
import { DEMO_PATIENTS } from '../../services/demo/fixtures';
import { transientMediaRegistry } from '../../services/demo/transient-media-registry';
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  classifyMediaCaptureError,
  detectBrowserAudioEnvironment,
  enumerateAudioInputDevices,
  findPreferredMicrophone,
  formatBytesReadable,
  probeAudioBlobDurationSeconds,
  validateAudioFileForUpload,
  type BrowserAudioInputDevice,
} from './audio-capture-utils';
import {
  CAPTURE_ORIGIN_LABELS,
  formatDurationMmSs,
  formatTimeShort,
} from './session-formatters';
import { ClinicianWorkflowProgress } from './ClinicianWorkflowProgress';
import { CaptureEncounterForm } from './CaptureEncounterForm';

export type StudioCaptureMode = 'microphone' | 'upload';

export type StudioLifecycleStage =
  | 'ready'
  | 'permission_requested'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'ready_to_submit'
  | 'uploading'
  | 'submitted'
  | 'failed';

interface ClinicalRecordingStudioProps {
  readonly defaultMode?: StudioCaptureMode;
  readonly initialSessionId?: string;
  readonly preferences: WorkspacePreferences;
}

const STUDIO_STAGE_METADATA: Record<
  StudioLifecycleStage,
  {
    readonly label: string;
    readonly badgeTone: 'neutral' | 'info' | 'warning' | 'danger' | 'success';
    readonly description: string;
  }
> = {
  ready: {
    label: 'Ready',
    badgeTone: 'info',
    description:
      'Confirm patient recording consent and select a microphone or consented audio file to begin.',
  },
  permission_requested: {
    label: 'Permission requested',
    badgeTone: 'warning',
    description:
      'Waiting for browser microphone access confirmation. Please respond to the browser prompt.',
  },
  recording: {
    label: 'Recording',
    badgeTone: 'info',
    description:
      'Recording from your microphone. The timer and level meter reflect real audio input.',
  },
  paused: {
    label: 'Paused',
    badgeTone: 'warning',
    description:
      'Microphone capture is paused. Resume recording to continue or stop to review the audio.',
  },
  stopped: {
    label: 'Stopped',
    badgeTone: 'neutral',
    description:
      'Microphone recording has stopped and hardware resources have been released.',
  },
  ready_to_submit: {
    label: 'Ready to submit',
    badgeTone: 'info',
    description:
      'Audio was captured and checked in this browser. Listen to it below, record again, or save it to the visit.',
  },
  uploading: {
    label: 'Saving',
    badgeTone: 'info',
    description: 'Saving the recording to this visit…',
  },
  submitted: {
    label: 'Saved',
    badgeTone: 'success',
    description:
      'The recording is linked to this visit. Next, generate the draft report and review it.',
  },
  failed: {
    label: 'Failed',
    badgeTone: 'danger',
    description:
      'Something went wrong. Read the message below, then try again.',
  },
};

const ALL_STUDIO_STAGES_ORDER: readonly StudioLifecycleStage[] = [
  'ready',
  'permission_requested',
  'recording',
  'paused',
  'stopped',
  'ready_to_submit',
  'uploading',
  'submitted',
  'failed',
] as const;

export function ClinicalRecordingStudio({ defaultMode = 'microphone', initialSessionId, preferences }: ClinicalRecordingStudioProps) {
  const services = useServices();
  const { isDemoMode } = useServiceContext();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isStartingDraft, setIsStartingDraft] = useState<boolean>(false);
  const [workflowStage, setWorkflowStage] = useState<1 | 2>(1);

  // Active Encounter State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessionId ?? null,
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string>(DEMO_PATIENTS[0]!.id);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId>(
    currentUser.department ?? 'primary_care',
  );
  const [visitType, setVisitType] = useState<string>('Follow-up consultation');
  const [diagnosisCategory, setDiagnosisCategory] = useState<DiagnosisCategory>('diabetes');
  const [primarySymptom, setPrimarySymptom] = useState<
    'Fatigue' | 'Cough' | 'Headache' | 'Increased thirst' | 'Other'
  >('Fatigue');
  const [templateId, setTemplateId] = useState<ReportTemplateId>(preferences.defaultTemplateId);
  const [consentChecked, setConsentChecked] = useState<boolean>(false);
  const [isInitializingSession, setIsInitializingSession] = useState<boolean>(false);

  // Capture Mode & Studio Stage State
  const [captureMode, setCaptureMode] = useState<StudioCaptureMode>(defaultMode);
  const [studioStage, setStudioStage] = useState<StudioLifecycleStage>('ready');
  const [hasStoppedRecording, setHasStoppedRecording] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<{
    readonly title: string;
    readonly message: string;
    readonly code?: string;
  } | null>(null);

  // Microphone & Browser Capabilities State
  const [browserEnv, setBrowserEnv] = useState(() => detectBrowserAudioEnvironment());
  const [inputDevices, setInputDevices] = useState<readonly BrowserAudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedDeviceLabel, setSelectedDeviceLabel] = useState<string>(
    preferences.defaultMicrophone,
  );
  const [negotiatedMimeType, setNegotiatedMimeType] = useState<string>(
    browserEnv.preferredMimeType || 'audio/webm;codecs=opus',
  );
  const [supportsPauseResume, setSupportsPauseResume] = useState<boolean>(true);

  // Live Recording State & Refs
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [liveInputLevelPct, setLiveInputLevelPct] = useState<number | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [submittedRecording, setSubmittedRecording] = useState<RecordingMetadata | null>(null);

  // File Upload State
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [validatedUploadMime, setValidatedUploadMime] = useState<string>('audio/wav');
  const [uploadDurationSeconds, setUploadDurationSeconds] = useState<number>(0);
  const [uploadProgressPct, setUploadProgressPct] = useState<number>(0);
  const [simulateUploadFailure, setSimulateUploadFailure] = useState<boolean>(false);

  // Refs for cleanup and concurrency protection
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const levelIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isStartingRecordingRef = useRef<boolean>(false);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const elapsedSecondsRef = useRef<number>(0);
  const previewObjectUrlRef = useRef<string | null>(null);

  // Query existing session if activeSessionId is set
  const { data: existingBundle, refetch: refetchBundle } = useQuery({
    queryKey: ['session-review-bundle', activeSessionId],
    queryFn: () => services.sessions.getSessionReviewBundle(activeSessionId!),
    enabled: Boolean(activeSessionId),
  });

  const activeSession: ClinicalSession | undefined = existingBundle?.session;

  // Synchronize form fields and recording state when an existing session loads.
  // Done during render (keyed by session revision) rather than in an effect.
  const sessionSyncKey = activeSession
    ? `${activeSession.id}:${activeSession.updatedAt}:${existingBundle?.recording?.id ?? ''}`
    : null;
  const [syncedSessionKey, setSyncedSessionKey] = useState<string | null>(null);
  if (activeSession && sessionSyncKey !== syncedSessionKey) {
    setSyncedSessionKey(sessionSyncKey);
    setSelectedPatientId(activeSession.patientId);
    setSelectedDepartment(activeSession.department);
    setVisitType(activeSession.visitType);
    setDiagnosisCategory(activeSession.diagnosisCategory);
    setPrimarySymptom(activeSession.primarySymptom);
    setTemplateId(activeSession.templateId);
    setConsentChecked(activeSession.capture.consentConfirmed);
    if (activeSession.capture.consentConfirmed) {
      setWorkflowStage(2);
    }

    if (
      (activeSession.capture.status === 'recording_ready' ||
        activeSession.capture.status === 'capture_completed') &&
      existingBundle?.recording
    ) {
      setSubmittedRecording(existingBundle.recording);
      setStudioStage((prev) =>
        prev === 'recording' || prev === 'paused' || prev === 'uploading' ? prev : 'submitted',
      );
      const transientHandle = transientMediaRegistry.getRecordingBySession(activeSession.id);
      if (transientHandle && !capturedBlob) {
        setCapturedBlob(transientHandle.blob);
      }
    }
  }

  // Helper to release microphone stream, timer, and Web Audio analyser
  const releaseMicrophoneResources = useCallback(() => {
    if (timerIntervalRef.current !== null && typeof window !== 'undefined') {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (levelIntervalRef.current !== null && typeof window !== 'undefined') {
      window.clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    setLiveInputLevelPct(null);

    if (audioContextRef.current) {
      try {
        void audioContextRef.current.close();
      } catch {
        // Ignore close errors
      }
      audioContextRef.current = null;
    }

    if (activeStreamRef.current) {
      transientMediaRegistry.stopStream(activeStreamRef.current);
      activeStreamRef.current = null;
    }
  }, []);

  // Revoke local preview URL helper
  const clearLocalPreviewUrl = useCallback(() => {
    if (
      previewObjectUrlRef.current &&
      previewObjectUrlRef.current.startsWith('blob:') &&
      typeof URL.revokeObjectURL === 'function'
    ) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    previewObjectUrlRef.current = null;
    setPreviewObjectUrl(null);
  }, []);

  const setNewPreviewBlob = useCallback(
    (blob: Blob | null) => {
      clearLocalPreviewUrl();
      setCapturedBlob(blob);
      if (blob && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(blob);
        previewObjectUrlRef.current = url;
        setPreviewObjectUrl(url);
      }
    },
    [clearLocalPreviewUrl],
  );

  // Enumerate microphone devices and listen for hardware connect/disconnect events
  const refreshMicrophoneDevices = useCallback(async () => {
    const { devices, enumerationSupported } = await enumerateAudioInputDevices();
    const envCheck = detectBrowserAudioEnvironment();
    setBrowserEnv(envCheck);
    if (envCheck.preferredMimeType) {
      setNegotiatedMimeType(envCheck.preferredMimeType);
    }
    setInputDevices(devices);

    if (devices.length > 0) {
      setSelectedDeviceId((prevId) => {
        const matched = devices.find((d) => d.deviceId === prevId)
          ?? findPreferredMicrophone(devices, preferences.defaultMicrophone);
        setSelectedDeviceLabel(matched.label);
        return matched.deviceId;
      });
    } else if (enumerationSupported && !activeStreamRef.current) {
      setSelectedDeviceId('');
      setSelectedDeviceLabel('No microphone detected');
    }
  }, [preferences.defaultMicrophone]);

  useEffect(() => {
    // Device enumeration is asynchronous; state updates land when the browser responds.
    void Promise.resolve().then(refreshMicrophoneDevices);

    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.addEventListener === 'function'
    ) {
      const mediaDevices = navigator.mediaDevices;
      const handleDeviceChange = () => {
        void refreshMicrophoneDevices();
      };
      mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
    return undefined;
  }, [refreshMicrophoneDevices]);

  // Guaranteed cleanup on component unmount
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore stop errors on unmount
        }
      }
      releaseMicrophoneResources();
      clearLocalPreviewUrl();
      if (uploadAbortControllerRef.current) {
        uploadAbortControllerRef.current.abort();
      }
    };
  }, [clearLocalPreviewUrl, releaseMicrophoneResources]);

  // Protect against accidental navigation during active recording, permission prompt, or unsubmitted capture
  const hasActiveOrUnsubmittedCapture =
    studioStage === 'permission_requested' ||
    studioStage === 'recording' ||
    studioStage === 'paused' ||
    studioStage === 'uploading' ||
    (studioStage === 'ready_to_submit' && capturedBlob !== null && !submittedRecording);

  const blocker = useBlocker(hasActiveOrUnsubmittedCapture);

  useEffect(() => {
    if (!hasActiveOrUnsubmittedCapture) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasActiveOrUnsubmittedCapture]);

  const selectedPatient =
    DEMO_PATIENTS.find((p) => p.id === selectedPatientId) ?? DEMO_PATIENTS[0]!;

  const isConsentConfirmed = Boolean(
    activeSession ? activeSession.capture.consentConfirmed : consentChecked,
  );

  // Ensure an encounter session exists and has confirmed consent before recording or uploading
  const ensureConsentedSession = async (): Promise<ClinicalSession> => {
    // An existing ID must never fall through to creation on a failed lookup.
    if (activeSessionId && !activeSession) {
      throw new Error('The selected visit could not be loaded. Return to clinical sessions and try again.');
    }
    if (activeSession) {
      if (!activeSession.capture.consentConfirmed) {
        if (!consentChecked) {
          throw new Error(
            'Please confirm that patient recording consent has been obtained before capturing or uploading audio.',
          );
        }
        const updated = await services.sessions.confirmPatientConsent(activeSession.id);
        await invalidateWorkspaceQueries(queryClient);
        return updated;
      }
      return activeSession;
    }

    if (!consentChecked) {
      throw new Error(
        'Please confirm that patient recording consent has been obtained before starting the encounter.',
      );
    }

    setIsInitializingSession(true);
    try {
      const created = await services.sessions.createSession({
        patientId: selectedPatient.id,
        patientName: selectedPatient.displayName,
        department: selectedDepartment,
        visitType: visitType.trim() || 'Follow-up consultation',
        templateId,
        consentConfirmed: true,
        selectedDeviceLabel,
        diagnosisCategory,
        primarySymptom,
      });
      setActiveSessionId(created.id);
      await invalidateWorkspaceQueries(queryClient);
      return created;
    } finally {
      setIsInitializingSession(false);
    }
  };

  const handleConfirmEncounterAndConsent = async () => {
    setErrorDetails(null);
    if (!consentChecked) {
      setStudioStage('failed');
      setErrorDetails({
        title: 'Patient Recording Consent Required',
        message:
          'You must check the patient recording consent confirmation box before initializing or recording a clinical encounter.',
        code: 'CONSENT_REQUIRED',
      });
      return;
    }

    try {
      await ensureConsentedSession();
      setWorkflowStage(2);
      if (studioStage === 'failed') {
        setStudioStage('ready');
      }
    } catch (err) {
      setStudioStage('failed');
      setErrorDetails({
        title: 'Unable to Initialize Clinical Encounter',
        message:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while creating the clinical session.',
      });
    }
  };

  // Start real browser audio recording
  const handleStartRecording = async () => {
    if (
      isStartingRecordingRef.current ||
      studioStage === 'recording' ||
      studioStage === 'paused' ||
      studioStage === 'permission_requested'
    ) {
      return;
    }

    setErrorDetails(null);
    setHasStoppedRecording(false);

    if (!isConsentConfirmed && !consentChecked) {
      setStudioStage('failed');
      setErrorDetails({
        title: 'Patient Recording Consent Required',
        message:
          'Confirm that patient recording consent has been obtained before starting microphone capture.',
        code: 'CONSENT_REQUIRED',
      });
      return;
    }

    const currentEnv = detectBrowserAudioEnvironment();
    setBrowserEnv(currentEnv);
    if (!currentEnv.canRecordLiveMicrophone) {
      setStudioStage('failed');
      setErrorDetails({
        title: 'Unsupported Browser Recording Environment',
        message:
          currentEnv.unsupportedReason ??
          'Your browser does not support compatible microphone audio recording.',
        code: currentEnv.unsupportedErrorCode,
      });
      return;
    }

    isStartingRecordingRef.current = true;

    try {
      // 1. Ensure session exists and consent is recorded
      await ensureConsentedSession();

      // 2. Check if enumerateDevices explicitly reports 0 audioinput devices when supported
      const { devices: preCheckDevices, enumerationSupported } =
        await enumerateAudioInputDevices();
      if (enumerationSupported && preCheckDevices.length === 0) {
        setStudioStage('failed');
        setErrorDetails({
          title: 'Microphone Hardware Not Found',
          message:
            'No audio input device was detected by your browser. Connect a microphone or switch to Audio File Upload.',
          code: 'MIC_DEVICE_UNAVAILABLE',
        });
        return;
      }

      // 3. Transition to Permission requested while awaiting getUserMedia
      setStudioStage('permission_requested');

      const audioConstraints: MediaTrackConstraints | boolean =
        selectedDeviceId && selectedDeviceId !== 'default'
          ? {
              deviceId: { ideal: selectedDeviceId },
              echoCancellation: true,
              noiseSuppression: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
            };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        transientMediaRegistry.stopStream(stream);
        setStudioStage('failed');
        setErrorDetails({
          title: 'Microphone Track Unavailable',
          message:
            'The microphone stream did not contain any active audio tracks. Verify your input device settings and retry.',
          code: 'MIC_DEVICE_UNAVAILABLE',
        });
        return;
      }

      activeStreamRef.current = stream;
      transientMediaRegistry.registerStream(stream);

      const primaryTrack = audioTracks[0]!;
      const activeLabel =
        primaryTrack.label && primaryTrack.label.trim().length > 0
          ? primaryTrack.label.trim()
          : selectedDeviceLabel;
      setSelectedDeviceLabel(activeLabel);

      // Re-enumerate devices now that permission is granted so hardware labels populate
      void refreshMicrophoneDevices();

      // 4. Negotiate MediaRecorder MIME type
      const mimeToUse = currentEnv.preferredMimeType;
      setNegotiatedMimeType(mimeToUse);

      let recorder: MediaRecorder;
      try {
        recorder = mimeToUse
          ? new MediaRecorder(stream, { mimeType: mimeToUse })
          : new MediaRecorder(stream);
      } catch (recErr) {
        releaseMicrophoneResources();
        const classified = classifyMediaCaptureError(recErr);
        setStudioStage('failed');
        setErrorDetails({
          title: classified.title,
          message: classified.message,
          code: classified.code,
        });
        return;
      }

      mediaRecorderRef.current = recorder;
      setSupportsPauseResume(
        typeof recorder.pause === 'function' && typeof recorder.resume === 'function',
      );
      audioChunksRef.current = [];
      clearLocalPreviewUrl();
      setSubmittedRecording(null);
      elapsedSecondsRef.current = 0;
      setElapsedSeconds(0);

      // Listen for unexpected hardware disconnection or track end mid-recording
      const handleUnexpectedTrackEnd = () => {
        if (
          mediaRecorderRef.current &&
          (mediaRecorderRef.current.state === 'recording' ||
            mediaRecorderRef.current.state === 'paused')
        ) {
          try {
            mediaRecorderRef.current.stop();
          } catch {
            // Ignore stop error
          }
          releaseMicrophoneResources();
          setStudioStage('failed');
          setErrorDetails({
            title: 'Microphone Disconnected During Recording',
            message:
              'The active microphone hardware was disconnected or interrupted while recording. Reconnect your microphone or select another input device and retry.',
            code: 'MIC_DEVICE_UNAVAILABLE',
          });
        }
      };

      primaryTrack.addEventListener('ended', handleUnexpectedTrackEnd);

      recorder.addEventListener('dataavailable', (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener('error', () => {
        releaseMicrophoneResources();
        setStudioStage('failed');
        setErrorDetails({
          title: 'Recording Interrupted by Browser Error',
          message:
            'The browser MediaRecorder encountered an unexpected error during capture. Please check your microphone and record again.',
          code: 'MIC_DEVICE_UNAVAILABLE',
        });
      });

      recorder.addEventListener('stop', () => {
        primaryTrack.removeEventListener('ended', handleUnexpectedTrackEnd);
        releaseMicrophoneResources();

        // If we already transitioned to failed due to track disconnect, do not overwrite error state
        setStudioStage((currentStage) => {
          if (currentStage === 'failed') {
            return 'failed';
          }
          const finalMime = recorder.mimeType || mimeToUse || 'audio/webm';
          const assembledBlob = new Blob(audioChunksRef.current, { type: finalMime });

          // Validate the capture: an empty or sub-second recording cannot be used.
          if (assembledBlob.size === 0 || elapsedSecondsRef.current < 1) {
            setNewPreviewBlob(null);
            setHasStoppedRecording(false);
            setErrorDetails({
              title: 'The recording was empty',
              message:
                'No usable audio was captured. Check that the right microphone is selected and not muted, then record again for at least a few seconds.',
              code: 'EMPTY_RECORDING',
            });
            return 'failed';
          }

          setNewPreviewBlob(assembledBlob);
          setHasStoppedRecording(true);
          return 'ready_to_submit';
        });
      });

      // Start recording with 250ms timeslice so chunks accumulate reliably across Chrome/Safari/Firefox
      recorder.start(250);
      setStudioStage('recording');

      // Start real elapsed time counter
      if (typeof window !== 'undefined') {
        timerIntervalRef.current = window.setInterval(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            elapsedSecondsRef.current += 1;
            setElapsedSeconds(elapsedSecondsRef.current);
          }
        }, 1000);
      }

      // Connect Web Audio API AnalyserNode if available for genuine microphone level metering
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        try {
          const AudioCtx = window.AudioContext;
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          levelIntervalRef.current = window.setInterval(() => {
            if (mediaRecorderRef.current?.state !== 'recording') {
              setLiveInputLevelPct(0);
              return;
            }
            analyser.getByteTimeDomainData(dataArray);
            let sumSquares = 0;
            for (let i = 0; i < dataArray.length; i += 1) {
              const normalized = ((dataArray[i] ?? 128) - 128) / 128;
              sumSquares += normalized * normalized;
            }
            const rms = Math.sqrt(sumSquares / dataArray.length);
            const pct = Math.min(100, Math.round(rms * 280));
            setLiveInputLevelPct(pct);
          }, 150);
        } catch {
          setLiveInputLevelPct(null);
        }
      }
    } catch (err) {
      releaseMicrophoneResources();
      const classified = classifyMediaCaptureError(err);
      setStudioStage('failed');
      setErrorDetails({
        title: classified.title,
        message: classified.message,
        code: classified.code,
      });
    } finally {
      isStartingRecordingRef.current = false;
    }
  };

  const handlePauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    if (typeof recorder.pause === 'function') {
      try {
        recorder.pause();
        setStudioStage('paused');
        setLiveInputLevelPct(0);
      } catch (err) {
        setErrorDetails({
          title: 'Pause Not Supported',
          message:
            err instanceof Error
              ? err.message
              : 'This browser does not support pausing an active MediaRecorder stream.',
        });
      }
    }
  };

  const handleResumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    if (typeof recorder.resume === 'function') {
      try {
        recorder.resume();
        setStudioStage('recording');
      } catch (err) {
        setErrorDetails({
          title: 'Unable to Resume Recording',
          message:
            err instanceof Error
              ? err.message
              : 'Could not resume the paused MediaRecorder stream.',
        });
      }
    }
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    setStudioStage('stopped');
    setHasStoppedRecording(true);
    try {
      recorder.stop();
    } catch {
      releaseMicrophoneResources();
      setStudioStage('ready_to_submit');
    }
  };

  const handleDiscardLocalCapture = async () => {
    setErrorDetails(null);
    setHasStoppedRecording(false);
    releaseMicrophoneResources();
    clearLocalPreviewUrl();
    setCapturedBlob(null);
    setSelectedUploadFile(null);
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    setUploadDurationSeconds(0);
    setUploadProgressPct(0);

    if (submittedRecording && activeSessionId) {
      try {
        await services.capture.discardRecording(activeSessionId);
        setSubmittedRecording(null);
        await refetchBundle();
        await invalidateWorkspaceQueries(queryClient);
      } catch (err) {
        setStudioStage('failed');
        setErrorDetails({
          title: 'Unable to Discard Submitted Recording',
          message:
            err instanceof Error
              ? err.message
              : 'An error occurred while discarding the recording.',
        });
        return;
      }
    }

    setStudioStage('ready');
  };

  const handleSubmitLiveRecording = async () => {
    if (!capturedBlob || studioStage === 'uploading' || studioStage === 'submitted') {
      return;
    }

    setErrorDetails(null);
    setStudioStage('uploading');
    setUploadProgressPct(10);

    const abortController = new AbortController();
    uploadAbortControllerRef.current = abortController;

    try {
      const session = await ensureConsentedSession();
      const durationSecs = Math.max(1, elapsedSeconds || 1);
      const { recording } = await services.capture.saveLiveRecording({
        sessionId: session.id,
        deviceName: selectedDeviceLabel,
        mimeType: capturedBlob.type || negotiatedMimeType || 'audio/webm',
        durationSeconds: durationSecs,
        audioBlob: capturedBlob,
        signal: abortController.signal,
        onProgress: (pct) => setUploadProgressPct(pct),
      });

      setSubmittedRecording(recording);
      setStudioStage('submitted');
      await refetchBundle();
      await invalidateWorkspaceQueries(queryClient);
    } catch (err) {
      setStudioStage('failed');
      setErrorDetails({
        title: 'Live Recording Submission Failed',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to submit the recorded visit audio to the capture service.',
        code: 'UPLOAD_INTERRUPTED',
      });
    } finally {
      uploadAbortControllerRef.current = null;
    }
  };

  // File Selection & Validation Handler
  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorDetails(null);
    setSubmittedRecording(null);
    setHasStoppedRecording(false);

    const validation = validateAudioFileForUpload(file);
    if (!validation.valid) {
      setSelectedUploadFile(file);
      setNewPreviewBlob(null);
      setStudioStage('failed');
      setErrorDetails({
        title:
          validation.errorCode === 'UNSUPPORTED_AUDIO_FORMAT'
            ? 'Unsupported Audio File Format'
            : 'Audio File Validation Failed',
        message: validation.errorMessage ?? 'Selected file could not be validated.',
        code: validation.errorCode,
      });
      return;
    }

    setSelectedUploadFile(file);
    setValidatedUploadMime(validation.normalizedMimeType);
    setNewPreviewBlob(file);

    const probedSeconds = await probeAudioBlobDurationSeconds(file, 45);
    setUploadDurationSeconds(probedSeconds);
    setStudioStage('ready_to_submit');
  };

  // Submit Validated Audio File to Capture Service
  const handleUploadAudioFile = async () => {
    if (!selectedUploadFile || studioStage === 'uploading' || studioStage === 'submitted') {
      return;
    }

    if (!isConsentConfirmed && !consentChecked) {
      setStudioStage('failed');
      setErrorDetails({
        title: 'Patient Recording Consent Required',
        message:
          'Confirm that patient recording consent has been obtained before uploading visit audio.',
        code: 'CONSENT_REQUIRED',
      });
      return;
    }

    setErrorDetails(null);
    setStudioStage('uploading');
    setUploadProgressPct(15);

    const abortController = new AbortController();
    uploadAbortControllerRef.current = abortController;

    try {
      const session = await ensureConsentedSession();
      const { recording } = await services.capture.uploadConsentedAudioFile({
        sessionId: session.id,
        fileName: selectedUploadFile.name,
        mimeType: validatedUploadMime,
        byteSize: selectedUploadFile.size,
        durationSeconds: Math.max(1, uploadDurationSeconds || 45),
        audioBlob: selectedUploadFile,
        simulateFailure: simulateUploadFailure,
        signal: abortController.signal,
        onProgress: (pct) => setUploadProgressPct(pct),
      });

      setSubmittedRecording(recording);
      setStudioStage('submitted');
      await refetchBundle();
      await invalidateWorkspaceQueries(queryClient);
    } catch (err) {
      setStudioStage('failed');
      setErrorDetails({
        title: 'Audio File Upload Failed',
        message:
          err instanceof Error
            ? err.message
            : 'Audio file upload was interrupted or rejected by the capture service.',
        code: 'UPLOAD_INTERRUPTED',
      });
    } finally {
      uploadAbortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
      uploadAbortControllerRef.current = null;
    }
    setUploadProgressPct(0);
    setStudioStage('ready_to_submit');
    setErrorDetails({
      title: 'Upload Cancelled',
      message:
        'Audio submission was cancelled. Your audio remains ready locally if you wish to retry or discard it.',
    });
  };

  // Demo fallback when no microphone is available: attaches labeled simulated audio metadata.
  const handleUseSimulatedAudio = async () => {
    if (!isConsentConfirmed && !consentChecked) {
      setStudioStage('failed');
      setErrorDetails({
        title: 'Patient recording consent required',
        message: 'Confirm patient consent before attaching simulated demo audio.',
        code: 'CONSENT_REQUIRED',
      });
      return;
    }
    setErrorDetails(null);
    setStudioStage('uploading');
    try {
      const session = await ensureConsentedSession();
      const { recording } = await services.capture.createSimulatedRecording({
        sessionId: session.id,
        durationSeconds: 312,
      });
      setSubmittedRecording(recording);
      setStudioStage('submitted');
      await refetchBundle();
      await invalidateWorkspaceQueries(queryClient);
    } catch (err) {
      setStudioStage('failed');
      setErrorDetails({
        title: 'Could not attach simulated audio',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    }
  };

  // Next step after saving audio: start the (simulated) processing pipeline and open the review page.
  const handleGenerateDraft = async () => {
    if (!activeSession || !submittedRecording) return;
    setIsStartingDraft(true);
    setErrorDetails(null);
    try {
      await services.processing.startProcessingPipeline({
        sessionId: activeSession.id,
        recordingId: submittedRecording.id,
        origin: submittedRecording.origin,
        templateId: activeSession.templateId,
      });
      await invalidateWorkspaceQueries(queryClient);
      void navigate(`/clinician/sessions/${activeSession.id}`);
    } catch (err) {
      setErrorDetails({
        title: 'Could not start draft generation',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsStartingDraft(false);
    }
  };

  const handleStartFreshEncounter = () => {
    releaseMicrophoneResources();
    clearLocalPreviewUrl();
    setActiveSessionId(null);
    setTemplateId(preferences.defaultTemplateId);
    setCapturedBlob(null);
    setSelectedUploadFile(null);
    setSubmittedRecording(null);
    setHasStoppedRecording(false);
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    setUploadDurationSeconds(0);
    setUploadProgressPct(0);
    setConsentChecked(false);
    setErrorDetails(null);
    setStudioStage('ready');
    setWorkflowStage(1);
  };

  const currentStageMeta = STUDIO_STAGE_METADATA[studioStage];

  return (
    <div className="space-y-6">
      {/* Navigation Blocker Confirmation Dialog during Active Recording / Unsubmitted Audio */}
      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
        title="Leave Clinical Recording Studio?"
        description="You have an active microphone recording or unsubmitted visit audio in memory."
      >
        <div className="space-y-4 text-sm text-[#242628]">
          <p className="leading-relaxed">
            If you leave the Recording Studio now, active microphone streams will be stopped and
            any unsubmitted in-memory recording will be discarded for patient privacy.
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#e4ece7]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (blocker.state === 'blocked') {
                  blocker.reset();
                }
              }}
            >
              Stay in Recording Studio
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (
                  mediaRecorderRef.current &&
                  mediaRecorderRef.current.state !== 'inactive'
                ) {
                  try {
                    mediaRecorderRef.current.stop();
                  } catch {
                    // Ignore stop error
                  }
                }
                releaseMicrophoneResources();
                clearLocalPreviewUrl();
                if (blocker.state === 'blocked') {
                  blocker.proceed();
                }
              }}
            >
              Stop Microphone &amp; Leave Studio
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[13px]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/clinician/dashboard" className="text-[#00783c] hover:underline font-semibold">
            {ROLE_WORKSPACE_LABELS[currentUser.role]}
          </Link>
          <span aria-hidden="true" className="text-[#495057]">
            ›
          </span>
          <Link to="/clinician/sessions" className="text-[#00783c] hover:underline font-semibold">
            Clinical sessions
          </Link>
          <span aria-hidden="true" className="text-[#495057]">
            ›
          </span>
          <span className="font-bold text-[#242628]">
            New recording
            {activeSession ? ` (${activeSession.id})` : ''}
          </span>
        </div>

        <Link
          to="/clinician/sessions"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00783c] hover:text-[#0d4026] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Clinical sessions</span>
        </Link>
      </nav>

      {/* Compact Parkview Emerald Header */}
      <section className="rounded-[18px] overflow-hidden bg-[#00783c] text-white px-6 py-5 sm:px-8 sm:py-6 shadow-2xs relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-36px] bottom-[-88px] w-56 h-56 rounded-full bg-[#f26b21]"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#c8f59b]">
              <span>{ROLE_WORKSPACE_LABELS[currentUser.role]}</span>
              <span>·</span>
              <span>New recording</span>
              <span>·</span>
              <span>{isDemoMode ? 'Audio stays in this browser' : 'Connected service'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight font-display">
              Record a clinical visit
            </h1>
            <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
              {workflowStage === 1
                ? 'Confirm the patient, visit reason, and recording consent before any audio capture begins.'
                : 'Capture the consultation, listen back, and save the recording before generating the report.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <ButtonLink
              to="/clinician/sessions"
              variant="secondary"
              size="sm"
              iconLeft={<FolderKanban className="w-4 h-4 text-[#00783c]" aria-hidden="true" />}
            >
              Clinical sessions
            </ButtonLink>
          </div>
        </div>
      </section>

      <ClinicianWorkflowProgress
        currentStage={workflowStage}
        completedThrough={workflowStage === 2 ? 1 : 0}
      />

      {/* Authoritative 9-State Studio Status Tracker Bar */}
      <Card
        tone={
          studioStage === 'failed'
            ? 'peach'
            : studioStage === 'submitted'
              ? 'mint'
              : 'default'
        }
        padding="md"
        aria-label="Recording studio lifecycle status"
        className={`hidden space-y-3 border-l-4 ${
          studioStage === 'failed'
            ? 'border-l-[var(--color-danger)]'
            : studioStage === 'recording'
              ? 'border-l-[#f26b21]'
              : 'border-l-[#00783c]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0d4026]">
              Recording status:
            </span>
            <StatusBadge tone={currentStageMeta.badgeTone}>
              {currentStageMeta.label}
            </StatusBadge>
            {hasStoppedRecording && studioStage === 'ready_to_submit' && (
              <StatusBadge tone="neutral">Stopped</StatusBadge>
            )}
            {activeSession && (
              <span className="font-mono text-xs font-bold text-[#00783c] bg-[#edf5f0] border border-[#cde0d4] px-2.5 py-0.5 rounded">
                Encounter {activeSession.id} · {activeSession.patientName}
              </span>
            )}
            <span className="text-xs font-semibold text-[#495057]">
              {isConsentConfirmed ? 'Consent Confirmed' : 'Consent Pending'}
            </span>
          </div>

          <div className="text-xs font-semibold text-[#0d4026]">
            {isDemoMode ? 'Demo mode · Nothing is uploaded to a server' : 'Connected mode'}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#242628] leading-relaxed">
          {currentStageMeta.description}
        </p>

        {/* 9-State Visual Pill Bar */}
        <ol
          aria-label="Recording steps"
          className="flex flex-wrap items-center gap-1.5 pt-1"
        >
          {ALL_STUDIO_STAGES_ORDER.map((stageKey) => {
            const meta = STUDIO_STAGE_METADATA[stageKey];
            const isActive = studioStage === stageKey;
            const isCompletedStopped =
              stageKey === 'stopped' &&
              hasStoppedRecording &&
              (studioStage === 'ready_to_submit' ||
                studioStage === 'uploading' ||
                studioStage === 'submitted');
            return (
              <li
                key={stageKey}
                aria-current={isActive ? 'step' : undefined}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                  isActive
                    ? stageKey === 'failed'
                      ? 'bg-[var(--color-danger)] text-white border-[var(--color-danger)]'
                      : 'bg-[#00783c] text-white border-[#00783c]'
                    : isCompletedStopped
                      ? 'bg-[#edf5f0] text-[#00783c] border-[#00783c]/40'
                      : 'bg-[#f7f8f8] text-[#495057] border-[#d5e0db]'
                }`}
              >
                {meta.label}
              </li>
            );
          })}
        </ol>
      </Card>

      {/* Error & Recovery Alert Banner */}
      {errorDetails && (
        <Card
          tone="peach"
          padding="md"
          role="alert"
          className="border-l-4 border-l-[var(--color-danger)] space-y-2.5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle
                className="w-5 h-5 text-[var(--color-danger)] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm font-bold text-[#0d4026]">
                    {errorDetails.title}
                  </strong>
                  {errorDetails.code && (
                    <span className="font-mono text-[11px] font-bold text-[#9a4406] bg-white px-2 py-0.5 rounded border border-[#f26b21]/40">
                      {errorDetails.code}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#242628] leading-relaxed">
                  {errorDetails.message}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {captureMode === 'microphone' && capturedBlob && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleSubmitLiveRecording()}
                >
                  Retry Submission
                </Button>
              )}
              {captureMode === 'upload' && selectedUploadFile && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleUploadAudioFile()}
                >
                  Retry Upload
                </Button>
              )}
              {captureMode === 'microphone' && !capturedBlob && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCaptureMode('upload')}
                >
                  Switch to Audio File Upload
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setErrorDetails(null);
                  if (studioStage === 'failed') {
                    setStudioStage(
                      capturedBlob || selectedUploadFile ? 'ready_to_submit' : 'ready',
                    );
                  }
                }}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* One workflow stage is shown at a time. */}
      <div className="grid grid-cols-1 gap-6 items-start">
        {/* Left Column (5 cols): Step 1 (Encounter Setup) + Step 2 (Consent & Privacy Gate) */}
        <div className={workflowStage === 1 ? 'block' : 'hidden'}>
          <CaptureEncounterForm
            fields={{ selectedPatientId, selectedDepartment, visitType, diagnosisCategory, primarySymptom, templateId }}
            onFieldsChange={(changes) => {
              if (changes.selectedPatientId !== undefined) setSelectedPatientId(changes.selectedPatientId);
              if (changes.selectedDepartment !== undefined) setSelectedDepartment(changes.selectedDepartment);
              if (changes.visitType !== undefined) setVisitType(changes.visitType);
              if (changes.diagnosisCategory !== undefined) setDiagnosisCategory(changes.diagnosisCategory);
              if (changes.primarySymptom !== undefined) setPrimarySymptom(changes.primarySymptom);
              if (changes.templateId !== undefined) setTemplateId(changes.templateId);
            }}
            activeSession={activeSession}
            consentChecked={consentChecked}
            onConsentChange={(checked) => {
              setConsentChecked(checked);
              if (checked && errorDetails?.code === 'CONSENT_REQUIRED') {
                setErrorDetails(null);
                setStudioStage('ready');
              }
            }}
            isInitializingSession={isInitializingSession}
            onConfirm={handleConfirmEncounterAndConsent}
          />
        </div>

        {/* Right Column (7 cols): Step 3 (Live Microphone Capture & Audio File Upload Workbench) */}
        <div className={`min-w-0 w-full max-w-4xl mx-auto space-y-6 ${workflowStage === 2 ? 'block' : 'hidden'}`}>
          <Card padding="md" className="space-y-5">
            {/* Mode Switcher Tabs: Live Microphone vs. File Upload */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4ece7] pb-3.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#00783c]">
                  Stage 2 of 4
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#0d4026] font-display">
                  Record Consultation
                </h2>
              </div>

              <Button
                variant="secondary"
                size="sm"
                disabled={
                  studioStage === 'recording' ||
                  studioStage === 'paused' ||
                  studioStage === 'uploading'
                }
                iconLeft={<ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />}
                onClick={() => setWorkflowStage(1)}
              >
                Patient &amp; consent
              </Button>

              <div
                role="tablist"
                aria-label="Audio capture method"
                className="inline-flex rounded-[10px] bg-[#edf5f0] p-1 border border-[#cde0d4] gap-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={captureMode === 'microphone'}
                  disabled={
                    studioStage === 'recording' ||
                    studioStage === 'paused' ||
                    studioStage === 'uploading'
                  }
                  onClick={() => {
                    setErrorDetails(null);
                    setCaptureMode('microphone');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                    captureMode === 'microphone'
                      ? 'bg-[#00783c] text-white shadow-2xs'
                      : 'text-[#0d4026] hover:bg-white/70'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Microphone</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={captureMode === 'upload'}
                  disabled={
                    studioStage === 'recording' ||
                    studioStage === 'paused' ||
                    studioStage === 'uploading'
                  }
                  onClick={() => {
                    setErrorDetails(null);
                    setCaptureMode('upload');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                    captureMode === 'upload'
                      ? 'bg-[#00783c] text-white shadow-2xs'
                      : 'text-[#0d4026] hover:bg-white/70'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Attach audio file</span>
                </button>
              </div>
            </div>

            {/* TAB 1: LIVE MICROPHONE RECORDING */}
            {captureMode === 'microphone' && (
              <div className="space-y-5">
                {/* Microphone Selector & Format Capabilities Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                  <div className="sm:col-span-8 space-y-1.5">
                    <label
                      htmlFor="microphone-device-select"
                      className="block text-xs font-bold uppercase tracking-wider text-[#0d4026]"
                    >
                      Select Microphone Input Device
                    </label>
                    <select
                      id="microphone-device-select"
                      disabled={
                        studioStage === 'recording' ||
                        studioStage === 'paused' ||
                        studioStage === 'permission_requested'
                      }
                      value={selectedDeviceId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setSelectedDeviceId(nextId);
                        const found = inputDevices.find((d) => d.deviceId === nextId);
                        if (found) {
                          setSelectedDeviceLabel(found.label);
                        }
                      }}
                      className="w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm font-medium text-[#242628] disabled:bg-[#f7f8f8]"
                    >
                      {inputDevices.length > 0 ? (
                        inputDevices.map((dev) => (
                          <option key={dev.deviceId} value={dev.deviceId}>
                            {dev.label}
                          </option>
                        ))
                      ) : (
                        <option value="">
                          {browserEnv.canRecordLiveMicrophone
                            ? 'System Default Microphone (Grant permission on start)'
                            : 'No compatible microphone available'}
                        </option>
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      disabled={
                        studioStage === 'recording' ||
                        studioStage === 'paused' ||
                        studioStage === 'permission_requested'
                      }
                      iconLeft={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
                      onClick={() => void refreshMicrophoneDevices()}
                    >
                      Refresh Devices
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-[#495057]">
                  Your browser will ask for microphone permission when you press Start.
                  {browserEnv.canRecordLiveMicrophone
                    ? ` Audio format: ${negotiatedMimeType || 'audio/webm'}.`
                    : ''}
                </p>

                {/* Unsupported Browser Warning */}
                {!browserEnv.canRecordLiveMicrophone && (
                  <div
                    role="status"
                    className="rounded-[10px] bg-[#feede0] border border-[#f26b21]/50 p-3.5 text-xs text-[#242628] flex items-start gap-2.5"
                  >
                    <MicOff
                      className="w-4 h-4 text-[#9a4406] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div className="space-y-1">
                      <strong className="text-[#9a4406] block">
                        Live Browser Microphone Capture Unavailable
                      </strong>
                      <p>{browserEnv.unsupportedReason}</p>
                    </div>
                  </div>
                )}

                {/* Primary Recording Console Box */}
                <div
                  className={`rounded-[14px] p-5 border-2 transition-colors space-y-4 ${
                    studioStage === 'recording'
                      ? 'bg-[#feede0]/40 border-[#f26b21]'
                      : studioStage === 'paused'
                        ? 'bg-[#feede0]/25 border-[#9a4406]/50'
                        : 'bg-[#edf5f0]/60 border-[#cde0d4]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {studioStage === 'recording' ? (
                          <span
                            aria-hidden="true"
                            className="inline-block w-3 h-3 rounded-full bg-[#f26b21] animate-pulse"
                          />
                        ) : (
                          <Mic className="w-4 h-4 text-[#00783c]" aria-hidden="true" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0d4026]">
                          {studioStage === 'recording'
                            ? `Recording Active · ${selectedDeviceLabel}`
                            : studioStage === 'paused'
                              ? `Recording Paused · ${selectedDeviceLabel}`
                              : studioStage === 'permission_requested'
                                ? 'Requesting Browser Microphone Permission…'
                                : 'Live Microphone Recorder'}
                        </span>
                      </div>

                      {/* Real Elapsed Timer */}
                      <div
                        aria-label="Elapsed recording time"
                        className="text-3xl sm:text-4xl font-bold font-mono text-[#0d4026] tabular-nums"
                      >
                        {formatDurationMmSs(elapsedSeconds) === '—'
                          ? '00:00'
                          : formatDurationMmSs(elapsedSeconds)}
                      </div>
                    </div>

                    {/* Real Microphone Activity Level Indicator (Strictly Driven by Web Audio or Explicit Status) */}
                    <div className="min-w-[200px] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[#495057]">
                        <span>Microphone Input Activity:</span>
                        <strong className="text-[#0d4026] tabular-nums">
                          {studioStage === 'recording'
                            ? liveInputLevelPct !== null
                              ? `${liveInputLevelPct}%`
                              : 'Stream Active'
                            : studioStage === 'paused'
                              ? 'Paused (0%)'
                              : 'Idle'}
                        </strong>
                      </div>
                      <div
                        role="progressbar"
                        aria-label="Real microphone input level"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={
                          studioStage === 'recording' ? (liveInputLevelPct ?? 25) : 0
                        }
                        className="h-2.5 w-full rounded-full bg-white border border-[#cde0d4] overflow-hidden"
                      >
                        <div
                          className="h-full bg-[#00783c] transition-all duration-150"
                          style={{
                            width: `${
                              studioStage === 'recording'
                                ? Math.max(8, liveInputLevelPct ?? 20)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Consent Blocker Reminder */}
                  {!isConsentConfirmed && (
                    <p className="text-xs font-semibold text-[#9a4406] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        Confirm patient recording consent in Step 2 to enable microphone recording.
                      </span>
                    </p>
                  )}

                  {/* Primary Action Buttons: Start / Pause / Resume / Stop */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {(studioStage === 'ready' ||
                      studioStage === 'failed' ||
                      studioStage === 'permission_requested') &&
                      !capturedBlob &&
                      !submittedRecording && (
                        <Button
                          variant="primary"
                          size="md"
                          disabled={
                            !isConsentConfirmed ||
                            !browserEnv.canRecordLiveMicrophone ||
                            studioStage === 'permission_requested'
                          }
                          iconLeft={<Mic className="w-4 h-4" aria-hidden="true" />}
                          onClick={() => void handleStartRecording()}
                        >
                          {studioStage === 'permission_requested'
                            ? 'Waiting for permission…'
                            : 'Start recording'}
                        </Button>
                      )}

                    {(studioStage === 'ready' || studioStage === 'failed') &&
                      !capturedBlob &&
                      !submittedRecording &&
                      isDemoMode && (
                        <Button
                          variant="soft"
                          size="md"
                          disabled={!isConsentConfirmed}
                          iconLeft={<Sparkles className="w-4 h-4" aria-hidden="true" />}
                          onClick={() => void handleUseSimulatedAudio()}
                        >
                          No microphone? Use simulated demo audio
                        </Button>
                      )}

                    {studioStage === 'recording' && (
                      <>
                        {supportsPauseResume && (
                          <Button
                            variant="secondary"
                            size="md"
                            iconLeft={<Pause className="w-4 h-4" aria-hidden="true" />}
                            onClick={handlePauseRecording}
                          >
                            Pause
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="md"
                          iconLeft={<Square className="w-4 h-4" aria-hidden="true" />}
                          onClick={handleStopRecording}
                        >
                          Stop
                        </Button>
                      </>
                    )}

                    {studioStage === 'paused' && (
                      <>
                        <Button
                          variant="primary"
                          size="md"
                          iconLeft={<Play className="w-4 h-4" aria-hidden="true" />}
                          onClick={handleResumeRecording}
                        >
                          Resume
                        </Button>
                        <Button
                          variant="danger"
                          size="md"
                          iconLeft={<Square className="w-4 h-4" aria-hidden="true" />}
                          onClick={handleStopRecording}
                        >
                          Stop
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: UPLOAD CONSENTED AUDIO FILE */}
            {captureMode === 'upload' && (
              <div className="space-y-4">
                <div className="rounded-[14px] border-2 border-dashed border-[#00783c]/45 bg-[#edf5f0]/50 p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <FileAudio
                      className="w-6 h-6 text-[#00783c] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div className="space-y-1 text-xs sm:text-sm">
                      <label
                        htmlFor="clinical-audio-file-input"
                        className="font-bold text-[#0d4026] block cursor-pointer"
                      >
                        Select Consented Clinical Visit Audio File
                      </label>
                      <p className="text-xs text-[#495057]">
                        Supported formats: {ALLOWED_UPLOAD_EXTENSIONS.join(', ').toUpperCase()} ·
                        Maximum file size: 100 MB. Use synthetic or authorized test audio only.
                      </p>
                    </div>
                  </div>

                  <input
                    id="clinical-audio-file-input"
                    type="file"
                    accept=".wav,.mp3,.m4a,.mp4,.aac,.webm,.ogg,.flac,audio/*"
                    disabled={studioStage === 'uploading'}
                    onChange={(e) => void handleFileInputChange(e)}
                    className="block w-full text-xs sm:text-sm text-[#242628] file:mr-3 file:py-2 file:px-3.5 file:rounded-[8px] file:border file:border-[#00783c] file:text-xs file:font-bold file:bg-white file:text-[#00783c] hover:file:bg-[#edf5f0] cursor-pointer"
                  />

                  {selectedUploadFile && (
                    <div className="rounded-[10px] bg-white border border-[#cde0d4] p-3 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-[#495057] block">Selected File:</span>
                        <strong className="text-[#0d4026] break-all">
                          {selectedUploadFile.name}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#495057] block">Size &amp; Format:</span>
                        <strong className="text-[#0d4026]">
                          {formatBytesReadable(selectedUploadFile.size)} · {validatedUploadMime}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#495057] block">Detected Duration:</span>
                        <strong className="text-[#00783c] font-mono">
                          {formatDurationMmSs(uploadDurationSeconds || 45)}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Optional Demo Fault Injection Toggle for Testing Upload Failure & Retry */}
                  {isDemoMode && (
                    <label
                      htmlFor="simulate-upload-failure-toggle"
                      className="inline-flex items-center gap-2 text-xs text-[#495057] pt-1 cursor-pointer"
                    >
                      <input
                        id="simulate-upload-failure-toggle"
                        type="checkbox"
                        checked={simulateUploadFailure}
                        onChange={(e) => setSimulateUploadFailure(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#9a4406] rounded"
                      />
                      <span>
                        Simulate transient network interruption on next upload (for testing retry
                        recovery)
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* UPLOADING PROGRESS PANEL */}
            {studioStage === 'uploading' && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-[12px] bg-[#edf5f0] border border-[#00783c] p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#0d4026]">
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#00783c]" aria-hidden="true" />
                    <span>
                      Uploading &amp; validating audio with capture service ({uploadProgressPct}%)…
                    </span>
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                    onClick={handleCancelUpload}
                  >
                    Cancel Upload
                  </Button>
                </div>
                <div
                  role="progressbar"
                  aria-label="Audio upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadProgressPct}
                  className="h-2.5 w-full rounded-full bg-white border border-[#cde0d4] overflow-hidden"
                >
                  <div
                    className="h-full bg-[#00783c] transition-all duration-200"
                    style={{ width: `${uploadProgressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* AUDIO PREVIEW, DISCARD & SUBMIT WORKBENCH (When audio is captured/selected or submitted) */}
            {(capturedBlob || selectedUploadFile || submittedRecording) && (
              <div className="rounded-[14px] bg-white border-2 border-[#00783c]/35 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4ece7] pb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-[#00783c]" aria-hidden="true" />
                    <div>
                      <h3 className="text-base font-bold text-[#0d4026] font-display">
                        {submittedRecording
                          ? 'Saved recording'
                          : 'Listen before saving'}
                      </h3>
                      <p className="text-xs text-[#495057]">
                        {submittedRecording
                          ? `${
                              CAPTURE_ORIGIN_LABELS[submittedRecording.origin]
                            } · Duration ${submittedRecording.durationLabel} · ${formatBytesReadable(
                              submittedRecording.fileSizeBytes,
                            )}`
                          : captureMode === 'microphone'
                            ? `Captured via ${selectedDeviceLabel} · Duration ${
                                formatDurationMmSs(elapsedSeconds) === '—'
                                  ? '00:01'
                                  : formatDurationMmSs(elapsedSeconds)
                              } · ${formatBytesReadable(capturedBlob?.size)}`
                            : `Selected file ${selectedUploadFile?.name} · ${formatBytesReadable(
                                selectedUploadFile?.size,
                              )}`}
                      </p>
                    </div>
                  </div>

                  <StatusBadge tone={submittedRecording ? 'success' : 'info'}>
                    {submittedRecording ? 'Submitted' : 'Ready to submit'}
                  </StatusBadge>
                </div>

                {/* Native Browser Audio Playback Element */}
                {previewObjectUrl ? (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="studio-audio-preview-player"
                      className="block text-xs font-bold text-[#0d4026]"
                    >
                      Play back the recording (kept in this browser only)
                    </label>
                    <audio
                      id="studio-audio-preview-player"
                      controls
                      src={previewObjectUrl}
                      aria-label="Preview captured visit audio"
                      className="w-full h-10"
                    >
                      {/* Local visit audio has no caption file; the transcript is reviewed on the next screen. */}
                      <track kind="captions" />
                    </audio>
                  </div>
                ) : (
                  <p className="text-xs text-[#495057] italic">
                    {submittedRecording?.origin === 'simulated_demo_audio'
                      ? 'Simulated demo audio has no playable sound. It stands in for a real recording during the demonstration.'
                      : 'The recording details are saved, but the audio itself was kept in browser memory and is gone after a page refresh.'}
                  </p>
                )}

                {/* Action Row: Discard & Record Again vs. Submit to Capture Service */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#e4ece7]">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={studioStage === 'uploading'}
                    iconLeft={<Trash2 className="w-3.5 h-3.5 text-[#9a4406]" aria-hidden="true" />}
                    onClick={() => void handleDiscardLocalCapture()}
                  >
                    {submittedRecording
                      ? 'Discard Submitted Audio & Record Again'
                      : captureMode === 'microphone'
                        ? 'Discard & Record Again'
                        : 'Remove Selected File'}
                  </Button>

                  {!submittedRecording ? (
                    <Button
                      variant="primary"
                      size="md"
                      disabled={
                        !isConsentConfirmed ||
                        studioStage === 'uploading' ||
                        (captureMode === 'microphone' ? !capturedBlob : !selectedUploadFile)
                      }
                      iconLeft={<HardDriveUpload className="w-4 h-4" aria-hidden="true" />}
                      onClick={() =>
                        void (captureMode === 'microphone'
                          ? handleSubmitLiveRecording()
                          : handleUploadAudioFile())
                      }
                    >
                      Save recording to visit
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00783c]">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>Saved to this visit</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* POST-SUBMISSION CONFIRMATION & NEXT WORKFLOW STEPS */}
            {studioStage === 'submitted' && activeSession && submittedRecording && (
              <Card
                tone="mint"
                padding="md"
                role="status"
                className="border-l-4 border-l-[#00783c] space-y-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#00783c]" aria-hidden="true" />
                      <h3 className="text-base sm:text-lg font-bold text-[#0d4026] font-display">
                        Recording saved for visit {activeSession.id}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#242628] leading-relaxed">
                      <strong>{activeSession.patientName}</strong> · {activeSession.visitType} ·{' '}
                      {submittedRecording.durationLabel} ·{' '}
                      {CAPTURE_ORIGIN_LABELS[submittedRecording.origin]}. Next, generate the draft
                      report and review it.
                    </p>
                  </div>
                  <StatusBadge tone="success">Submitted</StatusBadge>
                </div>

                <div className="rounded-[10px] bg-white/90 border border-[#cde0d4] p-3 text-xs text-[#242628] space-y-1">
                  <strong className="text-[#0d4026] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#00783c] shrink-0" aria-hidden="true" />
                    <span>About the draft</span>
                  </strong>
                  <p className="text-[#495057] leading-relaxed">
                    This demo has no transcription or AI service. The draft you will review is a{' '}
                    <strong>simulated demo transcript and SOAP note</strong> for this patient. It is
                    not produced from your recording, and the audio never leaves this browser.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                    onClick={handleStartFreshEncounter}
                  >
                    Record another visit
                  </Button>

                  <div className="flex flex-wrap items-center gap-2">
                    <ButtonLink
                      to="/clinician/sessions"
                      variant="secondary"
                      size="sm"
                    >
                      View in Clinical Sessions
                    </ButtonLink>
                    {activeSession.processing.status === 'idle' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isStartingDraft}
                        iconRight={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                        onClick={() => void handleGenerateDraft()}
                      >
                        {isStartingDraft ? 'Starting…' : 'Generate draft and review'}
                      </Button>
                    ) : (
                      <ButtonLink
                        to={`/clinician/sessions/${activeSession.id}`}
                        variant="primary"
                        size="sm"
                        iconRight={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                      >
                        Open visit {activeSession.id}
                      </ButtonLink>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </Card>

          <Card padding="sm" className="bg-[#f7f8f8] border-[#d5e0db] text-xs text-[#495057] space-y-1">
            <p className="flex items-center gap-1.5 font-bold text-[#0d4026]">
              <ShieldAlert className="w-4 h-4 text-[#00783c]" aria-hidden="true" />
              <span>Where the audio goes</span>
            </p>
            <p className="leading-relaxed">
              {isDemoMode
                ? 'In this demo the recording is held only in this browser tab’s memory. It is never uploaded or written to storage, and it disappears when you refresh or leave.'
                : 'Recordings are sent through the configured capture service.'}
              {activeSession
                ? ` Visit ${activeSession.id} · updated ${formatTimeShort(activeSession.updatedAt)}.`
                : ''}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
