import type { CaptureErrorCode } from '../../domain/models';
import { MAX_AUDIO_UPLOAD_BYTES } from '../../services/demo/demo-services';

export interface BrowserAudioInputDevice {
  readonly deviceId: string;
  readonly label: string;
  readonly isDefault: boolean;
}

export interface BrowserAudioEnvironment {
  readonly isSecureContext: boolean;
  readonly hasMediaDevices: boolean;
  readonly hasMediaRecorder: boolean;
  readonly hasSupportedRecordingFormat: boolean;
  readonly canRecordLiveMicrophone: boolean;
  readonly preferredMimeType: string;
  readonly supportedMimeTypes: readonly string[];
  readonly targetTranscriptionFormat: 'audio/wav;rate=16000;channels=1';
  readonly unsupportedReason?: string;
  readonly unsupportedErrorCode?: CaptureErrorCode;
}

export const CANDIDATE_RECORDING_MIME_TYPES: readonly string[] = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/wav',
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.wav',
  '.mp3',
  '.m4a',
  '.mp4',
  '.aac',
  '.webm',
  '.ogg',
  '.flac',
] as const;

export const ALLOWED_UPLOAD_MIME_PREFIXES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
] as const;

export function detectBrowserAudioEnvironment(): BrowserAudioEnvironment {
  const isSecure =
    typeof window !== 'undefined' && typeof window.isSecureContext === 'boolean'
      ? window.isSecureContext
      : true;

  if (!isSecure) {
    return {
      isSecureContext: false,
      hasMediaDevices: false,
      hasMediaRecorder: false,
      hasSupportedRecordingFormat: false,
      canRecordLiveMicrophone: false,
      preferredMimeType: '',
      supportedMimeTypes: [],
      targetTranscriptionFormat: 'audio/wav;rate=16000;channels=1',
      unsupportedErrorCode: 'INSECURE_CONTEXT',
      unsupportedReason:
        'Live microphone capture requires a secure HTTPS or localhost context. Use a secure connection or upload a consented audio file.',
    };
  }

  const hasMediaDevices =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');

  if (!hasMediaDevices) {
    return {
      isSecureContext: true,
      hasMediaDevices: false,
      hasMediaRecorder: typeof MediaRecorder !== 'undefined',
      hasSupportedRecordingFormat: false,
      canRecordLiveMicrophone: false,
      preferredMimeType: '',
      supportedMimeTypes: [],
      targetTranscriptionFormat: 'audio/wav;rate=16000;channels=1',
      unsupportedErrorCode: 'MIC_DEVICE_UNAVAILABLE',
      unsupportedReason:
        'Browser MediaDevices API (navigator.mediaDevices.getUserMedia) is unavailable in this environment. You can still upload a consented audio file.',
    };
  }

  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  if (!hasMediaRecorder) {
    return {
      isSecureContext: true,
      hasMediaDevices: true,
      hasMediaRecorder: false,
      hasSupportedRecordingFormat: false,
      canRecordLiveMicrophone: false,
      preferredMimeType: '',
      supportedMimeTypes: [],
      targetTranscriptionFormat: 'audio/wav;rate=16000;channels=1',
      unsupportedErrorCode: 'UNSUPPORTED_AUDIO_FORMAT',
      unsupportedReason:
        'Browser MediaRecorder API is not supported in this browser environment. Please use a modern version of Chrome, Safari, Edge, or Firefox, or upload a consented audio file.',
    };
  }

  let supportedMimeTypes: string[] = [];
  if (typeof MediaRecorder.isTypeSupported === 'function') {
    supportedMimeTypes = CANDIDATE_RECORDING_MIME_TYPES.filter((mime) => {
      try {
        return MediaRecorder.isTypeSupported(mime);
      } catch {
        return false;
      }
    });
  } else {
    supportedMimeTypes = ['audio/webm'];
  }

  if (supportedMimeTypes.length === 0) {
    return {
      isSecureContext: true,
      hasMediaDevices: true,
      hasMediaRecorder: true,
      hasSupportedRecordingFormat: false,
      canRecordLiveMicrophone: false,
      preferredMimeType: '',
      supportedMimeTypes: [],
      targetTranscriptionFormat: 'audio/wav;rate=16000;channels=1',
      unsupportedErrorCode: 'UNSUPPORTED_AUDIO_FORMAT',
      unsupportedReason:
        'This browser does not support any compatible clinical audio recording codec (WebM/Opus, MP4/AAC, OGG/Opus, or WAV). Please switch browsers or use Audio File Upload.',
    };
  }

  return {
    isSecureContext: true,
    hasMediaDevices: true,
    hasMediaRecorder: true,
    hasSupportedRecordingFormat: true,
    canRecordLiveMicrophone: true,
    preferredMimeType: supportedMimeTypes[0]!,
    supportedMimeTypes,
    targetTranscriptionFormat: 'audio/wav;rate=16000;channels=1',
  };
}

export async function enumerateAudioInputDevices(): Promise<{
  readonly devices: readonly BrowserAudioInputDevice[];
  readonly enumerationSupported: boolean;
}> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.enumerateDevices !== 'function'
  ) {
    return { devices: [], enumerationSupported: false };
  }

  try {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');
    const mapped: BrowserAudioInputDevice[] = audioInputs.map((d, idx) => ({
      deviceId: d.deviceId || `mic-${idx + 1}`,
      label:
        d.label && d.label.trim().length > 0
          ? d.label.trim()
          : idx === 0
            ? 'System Default Microphone'
            : `Audio Input Device #${idx + 1}`,
      isDefault: d.deviceId === 'default' || idx === 0,
    }));
    return { devices: mapped, enumerationSupported: true };
  } catch {
    return { devices: [], enumerationSupported: false };
  }
}

export function classifyMediaCaptureError(err: unknown): {
  readonly code: CaptureErrorCode;
  readonly title: string;
  readonly message: string;
} {
  const name =
    err && typeof err === 'object' && 'name' in err && typeof err.name === 'string'
      ? err.name
      : '';
  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'An unexpected microphone capture error occurred.';
  const lower = `${name} ${rawMessage}`.toLowerCase();

  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    name === 'SecurityError' ||
    lower.includes('permission denied') ||
    lower.includes('not allowed')
  ) {
    return {
      code: 'MIC_PERMISSION_DENIED',
      title: 'Microphone Permission Denied',
      message:
        'Browser microphone access was denied. Allow microphone access in your browser address bar or system privacy settings, then click Retry Microphone Access — or switch to Audio File Upload.',
    };
  }

  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError' ||
    lower.includes('not found') ||
    lower.includes('no microphone') ||
    lower.includes('requested device not found')
  ) {
    return {
      code: 'MIC_DEVICE_UNAVAILABLE',
      title: 'Microphone Hardware Not Found',
      message:
        'No available microphone input device was detected. Connect a microphone or headset, refresh the device list, or use Audio File Upload.',
    };
  }

  if (
    name === 'NotSupportedError' ||
    lower.includes('unsupported') ||
    lower.includes('mime') ||
    lower.includes('codec')
  ) {
    return {
      code: 'UNSUPPORTED_AUDIO_FORMAT',
      title: 'Unsupported Audio Recording Format',
      message:
        'Your browser could not initialize MediaRecorder with a supported audio codec. Please use Audio File Upload or switch to Chrome, Safari, or Firefox.',
    };
  }

  return {
    code: 'MIC_DEVICE_UNAVAILABLE',
    title: 'Microphone Capture Interrupted',
    message:
      rawMessage ||
      'The selected microphone could not be started or was disconnected during capture. Check your audio connection and try again.',
  };
}

export interface AudioFileValidationResult {
  readonly valid: boolean;
  readonly errorCode?: CaptureErrorCode;
  readonly errorMessage?: string;
  readonly normalizedMimeType: string;
}

export function validateAudioFileForUpload(file: File): AudioFileValidationResult {
  const fileName = file.name.trim();
  const lowerName = fileName.toLowerCase();
  const rawMime = (file.type || '').trim().toLowerCase();

  const matchesExtension = ALLOWED_UPLOAD_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const matchesMime = ALLOWED_UPLOAD_MIME_PREFIXES.some(
    (prefix) => rawMime === prefix || rawMime.startsWith(`${prefix};`),
  );

  if (!matchesExtension && !matchesMime) {
    return {
      valid: false,
      errorCode: 'UNSUPPORTED_AUDIO_FORMAT',
      errorMessage: `Unsupported file format for "${fileName || 'selected file'}" (${rawMime || 'unknown type'}). Supported clinical audio formats: WAV, MP3, M4A, MP4, AAC, WebM, OGG, or FLAC.`,
      normalizedMimeType: rawMime || 'application/octet-stream',
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      errorCode: 'UPLOAD_INTERRUPTED',
      errorMessage: `The selected audio file "${fileName}" is empty (0 bytes). Please choose a valid audio recording.`,
      normalizedMimeType: rawMime || 'audio/wav',
    };
  }

  if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      errorCode: 'UPLOAD_INTERRUPTED',
      errorMessage: `The selected audio file "${fileName}" (${sizeMb} MB) exceeds the maximum allowed upload size of 100 MB.`,
      normalizedMimeType: rawMime || 'audio/wav',
    };
  }

  const inferredMime =
    rawMime ||
    (lowerName.endsWith('.wav')
      ? 'audio/wav'
      : lowerName.endsWith('.mp3')
        ? 'audio/mpeg'
        : lowerName.endsWith('.m4a') || lowerName.endsWith('.mp4')
          ? 'audio/mp4'
          : lowerName.endsWith('.aac')
            ? 'audio/aac'
            : lowerName.endsWith('.ogg')
              ? 'audio/ogg'
              : lowerName.endsWith('.flac')
                ? 'audio/flac'
                : 'audio/webm');

  return {
    valid: true,
    normalizedMimeType: inferredMime,
  };
}

export function formatBytesReadable(bytes: number | undefined): string {
  if (bytes === undefined || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function probeAudioBlobDurationSeconds(
  blob: Blob,
  fallbackSeconds = 12,
): Promise<number> {
  if (typeof window === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return Math.max(1, fallbackSeconds);
  }

  return new Promise<number>((resolve) => {
    let settled = false;
    const objectUrl = URL.createObjectURL(blob);
    const finish = (seconds: number) => {
      if (settled) return;
      settled = true;
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }
      resolve(Math.max(1, Math.round(seconds)));
    };

    const timer = window.setTimeout(() => {
      const estimated = blob.size > 0 ? Math.max(1, Math.min(3600, Math.round(blob.size / 8000))) : fallbackSeconds;
      finish(estimated);
    }, 350);

    try {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        window.clearTimeout(timer);
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          finish(audio.duration);
        } else {
          finish(fallbackSeconds);
        }
      };
      audio.onerror = () => {
        window.clearTimeout(timer);
        finish(fallbackSeconds);
      };
      audio.src = objectUrl;
    } catch {
      window.clearTimeout(timer);
      finish(fallbackSeconds);
    }
  });
}
