import type {
  AdministrativeSex,
  AgeGroup,
  AnalyticsFilterCriteria,
  AnalyticsReportStatus,
  DepartmentId,
  DiagnosisCategory,
} from '../../domain/models';
import { ANALYTICS_DIAGNOSIS_LABELS, normalizeAnalyticsCriteria } from '../../domain/analytics';

// ============================================================================
// URL <-> filter criteria mapping for the analytics screens.
// Filters live in the URL so views are shareable and the back button works.
// ============================================================================

export const DEPARTMENT_OPTIONS: ReadonlyArray<{ value: DepartmentId; label: string }> = [
  { value: 'primary_care', label: 'Primary Care' },
  { value: 'endocrinology', label: 'Endocrinology' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'acute_care', label: 'Acute Care' },
];

export const DIAGNOSIS_OPTIONS: ReadonlyArray<{ value: DiagnosisCategory; label: string }> = (
  Object.keys(ANALYTICS_DIAGNOSIS_LABELS) as DiagnosisCategory[]
).map((value) => ({ value, label: ANALYTICS_DIAGNOSIS_LABELS[value] }));

export const AGE_OPTIONS: ReadonlyArray<{ value: AgeGroup; label: string }> = [
  { value: '18-39', label: '18–39' },
  { value: '40-64', label: '40–64' },
  { value: '65+', label: '65 and over' },
];

export const SEX_OPTIONS: ReadonlyArray<{ value: AdministrativeSex; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

export const STATUS_OPTIONS: ReadonlyArray<{ value: AnalyticsReportStatus; label: string }> = [
  { value: 'finalized', label: 'Report completed' },
  { value: 'awaiting_review', label: 'Awaiting review' },
];

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | 'all' {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : 'all';
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const YM = /^\d{4}-\d{2}$/;

/** Reads filter criteria from the URL. Unknown values fall back to defaults. */
export function criteriaFromSearchParams(
  params: URLSearchParams,
  referenceDate: string,
): AnalyticsFilterCriteria {
  // Legacy saved-view link from earlier builds.
  if (params.get('preset') === 'diabetes-sept') {
    return normalizeAnalyticsCriteria(
      {
        view: params.get('view') === 'monthly' ? 'monthly' : 'cohort',
        diagnosis: 'diabetes',
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
        monthKey: '2026-09',
      },
      referenceDate,
    );
  }
  const from = params.get('from');
  const to = params.get('to');
  const month = params.get('month');
  return normalizeAnalyticsCriteria(
    {
      view: params.get('view') === 'monthly' ? 'monthly' : 'cohort',
      dateFrom: from && YMD.test(from) ? from : undefined,
      dateTo: to && YMD.test(to) ? to : undefined,
      monthKey: month && YM.test(month) ? month : undefined,
      department: pick(params.get('dept'), DEPARTMENT_OPTIONS.map((o) => o.value)),
      diagnosis: pick(params.get('dx'), DIAGNOSIS_OPTIONS.map((o) => o.value)),
      ageGroup: pick(params.get('age'), AGE_OPTIONS.map((o) => o.value)),
      sex: pick(params.get('sex'), SEX_OPTIONS.map((o) => o.value)),
      reportStatus: pick(params.get('status'), STATUS_OPTIONS.map((o) => o.value)),
      documentationStatus: params.get('docs') === 'all' ? 'all_statuses' : 'verified_only',
    },
    referenceDate,
  );
}

/** Writes only non-default criteria to the URL so links stay short. */
export function criteriaToSearchParams(
  criteria: AnalyticsFilterCriteria,
  referenceDate: string,
): URLSearchParams {
  const defaults = normalizeAnalyticsCriteria({}, referenceDate);
  const params = new URLSearchParams();
  params.set('view', criteria.view);
  if (criteria.view === 'cohort') {
    if (criteria.dateFrom !== defaults.dateFrom) params.set('from', criteria.dateFrom);
    if (criteria.dateTo !== defaults.dateTo) params.set('to', criteria.dateTo);
    if (criteria.documentationStatus === 'all_statuses') params.set('docs', 'all');
  } else {
    if (criteria.monthKey !== defaults.monthKey) params.set('month', criteria.monthKey);
    if (criteria.reportStatus !== 'all') params.set('status', criteria.reportStatus);
  }
  if (criteria.department !== 'all') params.set('dept', criteria.department);
  if (criteria.diagnosis !== 'all') params.set('dx', criteria.diagnosis);
  if (criteria.ageGroup !== 'all') params.set('age', criteria.ageGroup);
  if (criteria.sex !== 'all') params.set('sex', criteria.sex);
  return params;
}
