import type {
  CaptureOrigin,
  ClinicalSession,
  DepartmentId,
  DiagnosisCategory,
} from '../../domain/models';
import { deriveSessionDisplayState } from '../../domain/state-machines';

export const DEPARTMENT_LABELS: Record<DepartmentId, string> = {
  primary_care: 'Primary Care',
  endocrinology: 'Endocrinology',
  cardiology: 'Cardiology',
  acute_care: 'Acute Care',
};

export const DIAGNOSIS_LABELS: Record<DiagnosisCategory, string> = {
  diabetes: 'Type 2 Diabetes',
  hypertension: 'Hypertension',
  URI_acute: 'Acute URI / Respiratory',
  wellness: 'Preventive Wellness',
  other: 'General Primary Care',
};

export const CAPTURE_ORIGIN_LABELS: Record<CaptureOrigin, string> = {
  unselected: 'Not started',
  live_microphone: 'Live Microphone',
  simulated_demo_audio: 'Simulated Audio',
  uploaded_file: 'Uploaded Audio',
};

export function formatDurationMmSs(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export function formatTimeShort(iso: string | undefined): string {
  if (!iso) return '—';
  const match = /T(\d{2}:\d{2})/.exec(iso);
  if (match?.[1]) {
    return match[1];
  }
  return iso;
}

export function formatEncounterDateDisplay(dateStr: string): string {
  switch (dateStr) {
    case '2026-10-06':
      return 'Oct 6, 2026 (Today)';
    case '2026-09-18':
      return 'Sep 18, 2026';
    case '2026-08-02':
      return 'Aug 2, 2026';
    default:
      return dateStr;
  }
}

export function getSessionPriorityWeight(session: ClinicalSession): number {
  const derived = deriveSessionDisplayState(session);
  switch (derived.code) {
    case 'CLARIFICATION_NEEDED':
    case 'DRAFT_SAVED_NEEDS_CLARIFICATION':
      return 1;
    case 'PROCESSING_INTERRUPTED':
    case 'UPLOAD_INTERRUPTED':
    case 'RECORDING_ERROR':
      return 2;
    case 'NEEDS_REVIEW':
    case 'DRAFT_SAVED_READY':
      return 3;
    case 'PROCESSING':
    case 'REGENERATING_DRAFT':
      return 4;
    case 'APPROVED_NOT_RELEASED':
      return 5;
    case 'RELEASED':
      return 6;
    default:
      return 7;
  }
}
