import { env } from './env';

export interface ClinicClock {
  readonly referenceDate: string; // "2026-10-06"
  readonly referenceDisplayDate: string; // "Oct 6, 2026"
  readonly timezone: string; // "America/Indiana/Indianapolis"
  readonly isDemoClock: boolean;
  nowIso(): string;
  toCalendarDateInClinicTz(isoTimestamp: string): string;
  toYearMonthInClinicTz(isoTimestamp: string): string;
}

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatCalendarDateDisplay(ymd: string): string {
  const parts = ymd.split('-');
  const year = Number(parts[0]);
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const monthLabel = MONTH_ABBR[monthIdx] ?? 'Oct';
  return `${monthLabel} ${day}, ${year}`;
}

export function createClinicClock(
  referenceDate: string = env.VITE_DEMO_REFERENCE_DATE,
  timezone: string = env.VITE_CLINIC_TIMEZONE,
  isDemoClock: boolean = env.VITE_APP_MODE === 'demo',
): ClinicClock {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return {
    referenceDate,
    referenceDisplayDate: formatCalendarDateDisplay(referenceDate),
    timezone,
    isDemoClock,
    nowIso(): string {
      if (isDemoClock) {
        return `${referenceDate}T10:15:00-04:00`;
      }
      return new Date().toISOString();
    },
    toCalendarDateInClinicTz(isoTimestamp: string): string {
      const d = new Date(isoTimestamp);
      if (Number.isNaN(d.getTime())) {
        return isoTimestamp.slice(0, 10);
      }
      return dateFormatter.format(d);
    },
    toYearMonthInClinicTz(isoTimestamp: string): string {
      return this.toCalendarDateInClinicTz(isoTimestamp).slice(0, 7);
    },
  };
}

export const defaultClinicClock = createClinicClock();
