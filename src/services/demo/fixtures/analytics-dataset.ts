import type {
  AdministrativeSex,
  AgeGroup,
  ClinicalSession,
  DeidentifiedVisitRecord,
  DepartmentId,
  DiagnosisCategory,
} from '../../../domain/models';

// ============================================================================
// CoSign — Synthetic de-identified analytics dataset (demo only)
// Generated deterministically from a fixed seed, so every demo shows the same
// numbers. These are fictional records, not real population statistics.
// ============================================================================

export const ANALYTICS_DATASET_START = '2026-01-05';

/** Small deterministic PRNG (mulberry32) so the dataset is identical on every load. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(random: () => number, options: ReadonlyArray<readonly [T, number]>): T {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of options) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return options[options.length - 1]![0];
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round(
    (Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86_400_000,
  );
}

const SYMPTOMS_BY_DIAGNOSIS: Record<
  DiagnosisCategory,
  ReadonlyArray<readonly [ClinicalSession['primarySymptom'], number]>
> = {
  diabetes: [
    ['Fatigue', 5],
    ['Increased thirst', 4],
    ['Other', 1],
  ],
  hypertension: [
    ['Headache', 5],
    ['Fatigue', 2],
    ['Other', 2],
  ],
  URI_acute: [
    ['Cough', 7],
    ['Headache', 1],
    ['Fatigue', 1],
  ],
  wellness: [
    ['Other', 6],
    ['Fatigue', 1],
  ],
  other: [
    ['Other', 4],
    ['Fatigue', 2],
    ['Headache', 1],
  ],
};

const DEPARTMENT_BY_DIAGNOSIS: Record<
  DiagnosisCategory,
  ReadonlyArray<readonly [DepartmentId, number]>
> = {
  diabetes: [
    ['primary_care', 6],
    ['endocrinology', 4],
  ],
  hypertension: [
    ['primary_care', 6],
    ['cardiology', 4],
  ],
  URI_acute: [
    ['acute_care', 6],
    ['primary_care', 4],
  ],
  wellness: [['primary_care', 1]],
  other: [
    ['primary_care', 5],
    ['acute_care', 2],
    ['cardiology', 1],
  ],
};

/**
 * Builds the synthetic dataset from the start date through the clinic reference date.
 * Respiratory visits rise in winter and autumn so month-to-month filtering is visible.
 */
export function generateSyntheticAnalyticsDataset(
  referenceDate: string,
  seed = 20261006,
): DeidentifiedVisitRecord[] {
  const random = createSeededRandom(seed);
  const records: DeidentifiedVisitRecord[] = [];
  const cursor = new Date(`${ANALYTICS_DATASET_START}T12:00:00Z`);
  const end = new Date(`${referenceDate}T12:00:00Z`);
  let sequence = 0;

  while (cursor <= end) {
    const weekday = cursor.getUTCDay();
    const ymd = toYmd(cursor);
    if (weekday !== 0 && weekday !== 6) {
      const month = cursor.getUTCMonth() + 1;
      const respiratorySeason = month <= 2 || month >= 10;
      const visitsToday = 3 + Math.floor(random() * 4); // 3–6 visits per clinic day
      const daysBeforeReference = daysBetween(ymd, referenceDate);

      for (let i = 0; i < visitsToday; i += 1) {
        sequence += 1;
        const diagnosis = pickWeighted<DiagnosisCategory>(random, [
          ['diabetes', 26],
          ['hypertension', 24],
          ['URI_acute', respiratorySeason ? 28 : 12],
          ['wellness', 14],
          ['other', 10],
        ]);
        const ageGroup = pickWeighted<AgeGroup>(random, [
          ['18-39', diagnosis === 'URI_acute' ? 5 : 2],
          ['40-64', 5],
          ['65+', diagnosis === 'URI_acute' ? 2 : 4],
        ]);
        const sex = pickWeighted<AdministrativeSex>(random, [
          ['female', 52],
          ['male', 48],
        ]);
        // Recent visits are still moving through review; older visits are finalized.
        const awaitingProbability =
          daysBeforeReference <= 1 ? 0.55 : daysBeforeReference <= 7 ? 0.25 : daysBeforeReference <= 14 ? 0.06 : 0;
        const isAwaiting = random() < awaitingProbability;
        const hadClarifications = random() < 0.19;
        const reviewMinutes = isAwaiting
          ? null
          : Math.max(1, Math.round(2 + random() * 5 + (hadClarifications ? 3 : 0) - month * 0.12));

        records.push({
          recordKey: `deid-${sequence.toString().padStart(5, '0')}`,
          encounterDate: ymd,
          department: pickWeighted(random, DEPARTMENT_BY_DIAGNOSIS[diagnosis]),
          diagnosis,
          primarySymptom: pickWeighted(random, SYMPTOMS_BY_DIAGNOSIS[diagnosis]),
          ageGroup,
          sex,
          reportStatus: isAwaiting ? 'awaiting_review' : 'finalized',
          releasedToPatient: !isAwaiting && random() < 0.97,
          followUpDocumented: random() < (diagnosis === 'wellness' ? 0.6 : 0.82),
          hadClarifications,
          reviewMinutes,
          privacyVerified: !isAwaiting,
        });
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return records;
}
