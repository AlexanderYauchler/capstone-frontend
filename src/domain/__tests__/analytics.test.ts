import { describe, expect, it } from 'vitest';
import {
  computeAnalyticsSummary,
  computeMonthlyKpis,
  formatSuppressedMetric,
  normalizeAnalyticsCriteria,
} from '../analytics';
import type { DeidentifiedVisitRecord } from '../models';
import { generateSyntheticAnalyticsDataset } from '../../services/demo/fixtures/analytics-dataset';

const REFERENCE_DATE = '2026-10-06';

function record(overrides: Partial<DeidentifiedVisitRecord>): DeidentifiedVisitRecord {
  return {
    recordKey: 'r',
    encounterDate: '2026-09-10',
    department: 'primary_care',
    diagnosis: 'diabetes',
    primarySymptom: 'Fatigue',
    ageGroup: '40-64',
    sex: 'female',
    reportStatus: 'finalized',
    releasedToPatient: true,
    followUpDocumented: true,
    hadClarifications: false,
    reviewMinutes: 4,
    privacyVerified: true,
    ...overrides,
  };
}

describe('Analytics aggregation', () => {
  const dataset = generateSyntheticAnalyticsDataset(REFERENCE_DATE);

  it('generates the same synthetic dataset on every load', () => {
    const again = generateSyntheticAnalyticsDataset(REFERENCE_DATE);
    expect(again).toEqual(dataset);
    expect(dataset.length).toBeGreaterThan(500);
    expect(dataset.every((r) => r.encounterDate <= REFERENCE_DATE)).toBe(true);
  });

  it('computes monthly KPIs that add up (completed + awaiting = total)', () => {
    const records = [
      record({ reviewMinutes: 2 }),
      record({ reviewMinutes: 6 }),
      record({ reviewMinutes: 4 }),
      record({ reportStatus: 'awaiting_review', reviewMinutes: null, releasedToPatient: false }),
      record({ encounterDate: '2026-08-02' }),
    ];
    const kpis = computeMonthlyKpis(records, '2026-09');
    expect(kpis.totalSessions).toBe(4);
    expect(kpis.completedReports).toBe(3);
    expect(kpis.awaitingReview).toBe(1);
    expect(kpis.completionRatePct).toBe(75);
    expect(kpis.medianReviewMinutes).toBe(4);
    expect(kpis.monthLabel).toBe('September 2026');
  });

  it('changes KPIs, trend, and breakdowns when filters change, and stays internally consistent', () => {
    const all = computeAnalyticsSummary(dataset, { view: 'monthly', monthKey: '2026-09' }, REFERENCE_DATE);
    const diabetes = computeAnalyticsSummary(
      dataset,
      { view: 'monthly', monthKey: '2026-09', diagnosis: 'diabetes' },
      REFERENCE_DATE,
    );
    expect(diabetes.monthlyKpis.totalSessions).toBeLessThan(all.monthlyKpis.totalSessions);
    expect(diabetes.monthlyKpis.totalSessions).toBeGreaterThan(0);

    // The selected month's trend point matches the KPI cards.
    const septPoint = all.monthlyTrend.find((p) => p.monthKey === '2026-09')!;
    expect(septPoint.totalSessions).toBe(all.monthlyKpis.totalSessions);

    // The diagnosis breakdown for the month sums to the month total.
    const sum = all.monthlyDiagnosisCounts.reduce((acc, row) => acc + row.count, 0);
    expect(sum).toBe(all.monthlyKpis.totalSessions);

    // Selecting another month changes the figures.
    const august = computeAnalyticsSummary(dataset, { view: 'monthly', monthKey: '2026-08' }, REFERENCE_DATE);
    expect(august.monthlyKpis.monthKey).toBe('2026-08');
    expect(august.monthlyKpis.totalSessions).not.toBe(all.monthlyKpis.totalSessions);
  });

  it('returns empty results (not errors) when no records match', () => {
    const empty = computeAnalyticsSummary(
      [record({})],
      { view: 'cohort', diagnosis: 'hypertension' },
      REFERENCE_DATE,
    );
    expect(empty.verifiedVisitsCount).toBe(0);
    expect(empty.topSymptom).toBeNull();
    expect(empty.symptomDistribution).toHaveLength(0);
    expect(empty.monthlyKpis.totalSessions).toBe(0);
    expect(empty.monthlyKpis.completionRatePct).toBeNull();
  });

  it('suppresses population counts below 5 and their complements', () => {
    expect(formatSuppressedMetric(3, 100).isSuppressed).toBe(true);
    expect(formatSuppressedMetric(97, 100).isSuppressed).toBe(true);
    expect(formatSuppressedMetric(40, 100)).toMatchObject({ count: 40, percentage: 40 });
  });

  it('excludes unverified records from population statistics by default', () => {
    const records = [record({}), record({ privacyVerified: false, reportStatus: 'awaiting_review' })];
    const summary = computeAnalyticsSummary(
      records,
      { dateFrom: '2026-09-01', dateTo: '2026-09-30' },
      REFERENCE_DATE,
    );
    expect(summary.verifiedVisitsCount).toBe(1);
  });

  it('defaults to the last full month and a three-month overview range', () => {
    const criteria = normalizeAnalyticsCriteria({}, REFERENCE_DATE);
    expect(criteria.monthKey).toBe('2026-09');
    expect(criteria.dateFrom).toBe('2026-07-01');
    expect(criteria.dateTo).toBe(REFERENCE_DATE);
  });
});
