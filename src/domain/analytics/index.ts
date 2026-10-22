import type {
  AnalyticsFilterCriteria,
  AnalyticsSummaryResponse,
  CategoryBreakdownRow,
  DeidentifiedVisitRecord,
  DiagnosisCategory,
  MonthlyKpiSummary,
  MonthlyOperationsRow,
  MonthlyTrendPoint,
  SuppressedMetricValue,
} from '../models';

// ============================================================================
// CoSign — Pure analytics aggregation over de-identified visit records
// Shared by the demo service and unit tests. Population statistics apply small
// cell suppression (<5); operational counts (sessions, reviews) do not.
// ============================================================================

export const MINIMUM_CELL_SIZE = 5;

export const ANALYTICS_DIAGNOSIS_LABELS: Record<DiagnosisCategory, string> = {
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',
  URI_acute: 'Respiratory infection',
  wellness: 'Wellness / preventive',
  other: 'Other',
};

const MONTH_LONG = [
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

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${MONTH_LONG[Number(month) - 1] ?? monthKey} ${year}`;
}

function formatShortMonth(monthKey: string): string {
  const month = Number(monthKey.split('-')[1]);
  return (MONTH_LONG[month - 1] ?? monthKey).slice(0, 3);
}

function formatShortDate(ymd: string): string {
  const [, month, day] = ymd.split('-');
  return `${(MONTH_LONG[Number(month) - 1] ?? '').slice(0, 3)} ${Number(day)}`;
}

export function formatSuppressedMetric(rawCount: number, total: number): SuppressedMetricValue {
  if (rawCount > 0 && rawCount < MINIMUM_CELL_SIZE) {
    return { count: null, percentage: null, isSuppressed: true, displayLabel: 'Suppressed (<5)' };
  }
  const complement = total - rawCount;
  if (complement > 0 && complement < MINIMUM_CELL_SIZE) {
    return {
      count: null,
      percentage: null,
      isSuppressed: true,
      displayLabel: 'Suppressed (complementary <5)',
    };
  }
  return {
    count: rawCount,
    percentage: total > 0 ? Math.round((rawCount / total) * 100) : null,
    isSuppressed: false,
    displayLabel: `${rawCount}`,
  };
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function shiftMonthStart(referenceDate: string, monthsBack: number): string {
  const [year, month] = referenceDate.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(year, month - 1 - monthsBack, 1));
  return d.toISOString().slice(0, 10);
}

/** Month keys present in the dataset, oldest first. */
export function listDatasetMonths(records: readonly DeidentifiedVisitRecord[]): string[] {
  return [...new Set(records.map((r) => r.encounterDate.slice(0, 7)))].sort();
}

/** Fills in sensible defaults: last full month for monthly, the last ~3 months for overview. */
export function normalizeAnalyticsCriteria(
  partial: Partial<AnalyticsFilterCriteria>,
  referenceDate: string,
): AnalyticsFilterCriteria {
  return {
    view: partial.view ?? 'cohort',
    monthKey: partial.monthKey ?? shiftMonthStart(referenceDate, 1).slice(0, 7),
    dateFrom: partial.dateFrom ?? shiftMonthStart(referenceDate, 3),
    dateTo: partial.dateTo ?? referenceDate,
    department: partial.department ?? 'all',
    diagnosis: partial.diagnosis ?? 'all',
    documentationStatus: partial.documentationStatus ?? 'verified_only',
    ageGroup: partial.ageGroup ?? 'all',
    sex: partial.sex ?? 'all',
    reportStatus: partial.reportStatus ?? 'all',
  };
}

/** Dimension filters shared by every view (not date-based). */
export function matchesDimensionFilters(
  record: DeidentifiedVisitRecord,
  criteria: AnalyticsFilterCriteria,
): boolean {
  return (
    (criteria.department === 'all' || record.department === criteria.department) &&
    (criteria.diagnosis === 'all' || record.diagnosis === criteria.diagnosis) &&
    (criteria.ageGroup === 'all' || record.ageGroup === criteria.ageGroup) &&
    (criteria.sex === 'all' || record.sex === criteria.sex) &&
    (criteria.reportStatus === 'all' || record.reportStatus === criteria.reportStatus)
  );
}

function breakdown<K extends string>(
  records: readonly DeidentifiedVisitRecord[],
  keys: readonly K[],
  getKey: (r: DeidentifiedVisitRecord) => K,
  labelFor: (key: K) => string,
): CategoryBreakdownRow[] {
  const total = records.length;
  return keys.map((key) => {
    const count = records.filter((r) => getKey(r) === key).length;
    return {
      key,
      label: labelFor(key),
      metric:
        count === 0
          ? { count: 0, percentage: 0, isSuppressed: false, displayLabel: '0' }
          : formatSuppressedMetric(count, total),
    };
  });
}

export function computeMonthlyKpis(
  records: readonly DeidentifiedVisitRecord[],
  monthKey: string,
): MonthlyKpiSummary {
  const inMonth = records.filter((r) => r.encounterDate.startsWith(monthKey));
  const completed = inMonth.filter((r) => r.reportStatus === 'finalized');
  const reviewTimes = completed
    .map((r) => r.reviewMinutes)
    .filter((m): m is number => m !== null);
  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    totalSessions: inMonth.length,
    completedReports: completed.length,
    awaitingReview: inMonth.length - completed.length,
    releasedReports: inMonth.filter((r) => r.releasedToPatient).length,
    completionRatePct:
      inMonth.length > 0 ? Math.round((completed.length / inMonth.length) * 100) : null,
    medianReviewMinutes: median(reviewTimes),
    sessionsWithClarifications: inMonth.filter((r) => r.hadClarifications).length,
  };
}

function bucketTrend(
  records: readonly DeidentifiedVisitRecord[],
  dateFrom: string,
  dateTo: string,
): Array<{ weekLabel: string; count: number }> {
  const spanDays =
    (Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000;
  if (spanDays > 120) {
    // Long ranges are grouped by month so the chart stays readable.
    const months = listDatasetMonths(records);
    return months.map((m) => ({
      weekLabel: formatShortMonth(m),
      count: records.filter((r) => r.encounterDate.startsWith(m)).length,
    }));
  }
  const buckets: Array<{ weekLabel: string; count: number }> = [];
  const cursor = new Date(`${dateFrom}T00:00:00Z`);
  const end = new Date(`${dateTo}T00:00:00Z`);
  while (cursor <= end) {
    const start = cursor.toISOString().slice(0, 10);
    const weekEnd = new Date(cursor);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const stop = (weekEnd < end ? weekEnd : end).toISOString().slice(0, 10);
    buckets.push({
      weekLabel: formatShortDate(start),
      count: records.filter((r) => r.encounterDate >= start && r.encounterDate <= stop).length,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return buckets;
}

/**
 * Computes every number shown on the analytics screens from one record list,
 * so KPI cards, charts, and tables always agree for the same filters.
 */
export function computeAnalyticsSummary(
  allRecords: readonly DeidentifiedVisitRecord[],
  partialCriteria: Partial<AnalyticsFilterCriteria>,
  referenceDate: string,
): AnalyticsSummaryResponse {
  const criteria = normalizeAnalyticsCriteria(partialCriteria, referenceDate);
  const months = listDatasetMonths(allRecords);
  const dimensionMatched = allRecords.filter((r) => matchesDimensionFilters(r, criteria));

  // Population (cohort) statistics: date range, and only finalized + privacy-verified records
  // unless the analyst explicitly includes all documentation statuses.
  const cohort = dimensionMatched.filter(
    (r) =>
      r.encounterDate >= criteria.dateFrom &&
      r.encounterDate <= criteria.dateTo &&
      (criteria.documentationStatus === 'all_statuses' || r.privacyVerified),
  );
  const cohortTotal = cohort.length;

  const symptomKeys = ['Fatigue', 'Cough', 'Headache', 'Increased thirst', 'Other'] as const;
  const symptomDistribution = symptomKeys
    .map((symptom) => ({
      symptom,
      raw: cohort.filter((r) => r.primarySymptom === symptom).length,
    }))
    .filter((row) => row.raw > 0)
    .sort((a, b) => b.raw - a.raw)
    .map((row) => ({ symptom: row.symptom, metric: formatSuppressedMetric(row.raw, cohortTotal) }));

  const top = symptomDistribution[0];

  const monthlyOperations: MonthlyOperationsRow[] = months.map((m) => {
    const k = computeMonthlyKpis(dimensionMatched, m);
    return {
      monthKey: m,
      monthLabel: k.monthLabel,
      sessionsCreated: k.totalSessions,
      pendingReviewsAtPeriodEnd: k.awaitingReview,
      finalizedReports: k.completedReports,
      releasedReports: k.releasedReports,
      sessionsWithClarifications: k.sessionsWithClarifications,
      clarificationResolutionRatePct:
        k.sessionsWithClarifications > 0
          ? Math.round(
              (dimensionMatched.filter(
                (r) => r.encounterDate.startsWith(m) && r.hadClarifications && r.reportStatus === 'finalized',
              ).length /
                k.sessionsWithClarifications) *
                100,
            )
          : null,
      medianReviewDurationSeconds:
        k.medianReviewMinutes === null ? null : Math.round(k.medianReviewMinutes * 60),
    };
  });

  const monthlyTrend: MonthlyTrendPoint[] = months.map((m) => {
    const k = computeMonthlyKpis(dimensionMatched, m);
    return {
      monthKey: m,
      monthLabel: k.monthLabel,
      shortLabel: formatShortMonth(m),
      totalSessions: k.totalSessions,
      completedReports: k.completedReports,
      awaitingReview: k.awaitingReview,
    };
  });

  const inSelectedMonth = dimensionMatched.filter((r) =>
    r.encounterDate.startsWith(criteria.monthKey),
  );
  const diagnosisKeys = Object.keys(ANALYTICS_DIAGNOSIS_LABELS) as DiagnosisCategory[];

  return {
    criteria,
    minimumCellSizeThreshold: MINIMUM_CELL_SIZE,
    isCohortSuppressed: cohortTotal > 0 && cohortTotal < MINIMUM_CELL_SIZE,
    verifiedVisitsCount: cohortTotal,
    followUpDocumented: formatSuppressedMetric(
      cohort.filter((r) => r.followUpDocumented).length,
      cohortTotal,
    ),
    topSymptom: top ? { symptom: top.symptom, metric: top.metric } : null,
    weeklyVisitTrends: bucketTrend(cohort, criteria.dateFrom, criteria.dateTo).map((b) => ({
      weekLabel: b.weekLabel,
      metric:
        b.count === 0
          ? { count: 0, percentage: 0, isSuppressed: false, displayLabel: '0' }
          : formatSuppressedMetric(b.count, Number.POSITIVE_INFINITY),
    })),
    symptomDistribution,
    suppressedRareCombinationsNote: `Counts from 1 to ${MINIMUM_CELL_SIZE - 1} are hidden to protect privacy.`,
    monthlyOperations,
    datasetRecordCount: allRecords.length,
    availableMonths: months.map((m) => ({ monthKey: m, label: formatMonthLabel(m) })),
    datasetDateRange: {
      from: allRecords[0]?.encounterDate ?? criteria.dateFrom,
      to: allRecords[allRecords.length - 1]?.encounterDate ?? criteria.dateTo,
    },
    ageGroupBreakdown: breakdown(cohort, ['18-39', '40-64', '65+'] as const, (r) => r.ageGroup, (k) =>
      k === '65+' ? 'Age 65 and over' : `Age ${k}`,
    ),
    sexBreakdown: breakdown(cohort, ['female', 'male'] as const, (r) => r.sex, (k) =>
      k === 'female' ? 'Female' : 'Male',
    ),
    diagnosisBreakdown: breakdown(cohort, diagnosisKeys, (r) => r.diagnosis, (k) => ANALYTICS_DIAGNOSIS_LABELS[k]),
    monthlyKpis: computeMonthlyKpis(dimensionMatched, criteria.monthKey),
    monthlyTrend,
    monthlyDiagnosisCounts: diagnosisKeys.map((key) => ({
      key,
      label: ANALYTICS_DIAGNOSIS_LABELS[key],
      count: inSelectedMonth.filter((r) => r.diagnosis === key).length,
    })),
  };
}
