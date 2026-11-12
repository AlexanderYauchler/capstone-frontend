import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  FileCheck2,
  FlaskConical,
  History,
  MessageCircle,
  Pill,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useServices } from '../../app/providers/ServiceProvider';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { PageHeader } from '../../design-system/components/PageHeader';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { ROLE_WORKSPACE_LABELS } from '../../design-system/layouts/Sidebar';
import type { ClinicalReport, ClinicalSession } from '../../domain/models';
import { DEPARTMENT_LABELS, formatEncounterDateDisplay } from '../clinician/session-formatters';

export interface PatientReportsListPageProps {
  readonly mode?: 'overview' | 'reports' | 'history';
}

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------
const MONTH_NAMES = [
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

interface DateParts {
  readonly year: number;
  readonly month: string;
  readonly monthShort: string;
  readonly day: number;
}

/** Splits a "YYYY-MM-DD" clinic date into display parts; returns null for unexpected formats. */
function parseEncounterDate(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = MONTH_NAMES[Number(match[2]) - 1];
  if (!month) return null;
  return {
    year: Number(match[1]),
    month,
    monthShort: month.slice(0, 3),
    day: Number(match[3]),
  };
}

/** Month + day block so a patient can scan visit dates without reading a full date string. */
function DateBlock({ encounterDate }: { readonly encounterDate: string }) {
  const parts = parseEncounterDate(encounterDate);
  return (
    <div
      className="w-14 shrink-0 rounded-[10px] bg-[#edf5f0] border border-[#cde0d4] py-2 text-center text-[#0d4026]"
      aria-hidden="true"
    >
      {parts ? (
        <>
          <span className="block text-xs font-semibold leading-none">{parts.monthShort}</span>
          <span className="block text-2xl font-bold leading-tight font-display tabular-nums">
            {parts.day}
          </span>
          <span className="block text-[11px] leading-none text-[#495057] tabular-nums">
            {parts.year}
          </span>
        </>
      ) : (
        <CalendarDays className="w-6 h-6 mx-auto text-[#00783c]" />
      )}
    </div>
  );
}

// The service returns patient-safe reports already sorted newest first.
interface ReleasedItem {
  readonly session: ClinicalSession;
  readonly report: ClinicalReport;
}

function visitSummaryText({ report }: ReleasedItem): string {
  return report.narrativeSummary ?? report.soap.assessment;
}

function versionLabel({ session, report }: ReleasedItem): string | null {
  const version = session.release.releasedRevision ?? report.currentRevision;
  return version > 1 ? `Updated (version ${version})` : null;
}

// ----------------------------------------------------------------------------
// Overview pieces
// ----------------------------------------------------------------------------
function NextStepRow({
  icon,
  label,
  children,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 w-8 h-8 shrink-0 rounded-full bg-[#edf5f0] text-[#00783c] flex items-center justify-center"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-sm font-bold text-[#0d4026]">{label}</dt>
        <dd className="text-sm text-[#242628] leading-relaxed">{children}</dd>
      </div>
    </div>
  );
}

function LatestVisitCard({ item }: { readonly item: ReleasedItem }) {
  const { session, report } = item;
  return (
    <Card tone="elevated" padding="lg" aria-labelledby="latest-visit-heading" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <DateBlock encounterDate={session.encounterDate} />
          <div className="space-y-1 min-w-0">
            <h2
              id="latest-visit-heading"
              className="text-2xl font-bold text-[#0d4026] font-display leading-tight"
            >
              Your latest visit: {session.visitType}
            </h2>
            <p className="text-sm text-[#495057] flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#0d4026]">
                <Stethoscope className="w-4 h-4 text-[#00783c]" aria-hidden="true" />
                {report.clinicianName}
              </span>
              <span aria-hidden="true">·</span>
              <span>{DEPARTMENT_LABELS[session.department]}</span>
              <span aria-hidden="true">·</span>
              <span>{formatEncounterDateDisplay(session.encounterDate)}</span>
            </p>
          </div>
        </div>
        <ButtonLink
          to={`/patient/reports/${report.id}`}
          variant="primary"
          size="md"
          iconRight={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
          className="shrink-0"
        >
          Open latest report
        </ButtonLink>
      </div>

      <p className="text-[15px] text-[#242628] leading-relaxed max-w-[68ch]">
        {visitSummaryText(item)}
      </p>

      <div className="border-t border-[#e4ece7] pt-5">
        <h3 className="text-lg font-bold text-[#0d4026] font-display mb-4">What to do next</h3>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
          <NextStepRow icon={<Pill className="w-4 h-4" />} label="Medications">
            {report.patientNextSteps.medicationSummary}
          </NextStepRow>
          <NextStepRow icon={<FlaskConical className="w-4 h-4" />} label="Tests">
            {report.patientNextSteps.testsOrdered}
          </NextStepRow>
          <NextStepRow icon={<CalendarCheck className="w-4 h-4" />} label="Follow-up">
            {report.patientNextSteps.followUpInstructions}
          </NextStepRow>
        </dl>
      </div>

      <p className="flex items-start gap-2 rounded-[10px] bg-[#f7f8f8] border border-[#e4ece7] px-4 py-3 text-sm text-[#242628]">
        <MessageCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#00783c]" aria-hidden="true" />
        <span>
          <strong className="text-[#0d4026]">Questions about this visit? </strong>
          {report.patientNextSteps.contactGuidance}
        </span>
      </p>
    </Card>
  );
}

function QuickLinkTile({
  to,
  icon,
  title,
  description,
}: {
  readonly to: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-[14px] border border-[#d5e0db] bg-white p-5 hover:border-[#056233] hover:bg-[#f7f8f8] transition-colors"
    >
      <span
        aria-hidden="true"
        className="w-12 h-12 shrink-0 rounded-full bg-[#edf5f0] text-[#00783c] flex items-center justify-center"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-[#0d4026] font-display">{title}</span>
        <span className="block text-sm text-[#495057]">{description}</span>
      </span>
      <ChevronRight
        className="w-5 h-5 shrink-0 text-[#00783c] group-hover:translate-x-0.5 transition-transform"
        aria-hidden="true"
      />
    </Link>
  );
}

// ----------------------------------------------------------------------------
// Reports list + history timeline
// ----------------------------------------------------------------------------
function VisitSummaryCard({ item }: { readonly item: ReleasedItem }) {
  const { session, report } = item;
  const updated = versionLabel(item);
  return (
    <Card padding="md" className="flex gap-4 sm:gap-5 hover:border-[#056233] transition-colors">
      <DateBlock encounterDate={session.encounterDate} />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[#0d4026] font-display">{session.visitType}</h3>
            <StatusBadge tone="success">Final report</StatusBadge>
            {updated && <span className="text-xs font-semibold text-[#495057]">{updated}</span>}
          </div>
          <p className="text-sm text-[#495057]">
            {report.clinicianName} · {DEPARTMENT_LABELS[session.department]} ·{' '}
            {formatEncounterDateDisplay(session.encounterDate)}
          </p>
        </div>

        <p className="text-sm text-[#242628] leading-relaxed line-clamp-2 max-w-[68ch]">
          {visitSummaryText(item)}
        </p>

        <p className="text-sm text-[#242628]">
          <strong className="text-[#0d4026]">Follow-up: </strong>
          {report.patientNextSteps.followUpInstructions}
        </p>

        <ButtonLink
          to={`/patient/reports/${report.id}`}
          variant="secondary"
          size="sm"
          iconRight={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
          aria-label={`Read report: ${session.visitType}, ${formatEncounterDateDisplay(session.encounterDate)}`}
        >
          Read report
        </ButtonLink>
      </div>
    </Card>
  );
}

interface YearGroup {
  readonly year: string;
  readonly items: readonly ReleasedItem[];
}

function groupByYear(items: readonly ReleasedItem[]): YearGroup[] {
  const groups: { year: string; items: ReleasedItem[] }[] = [];
  for (const item of items) {
    const year = String(parseEncounterDate(item.session.encounterDate)?.year ?? 'Other');
    const existing = groups.find((g) => g.year === year);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ year, items: [item] });
    }
  }
  return groups;
}

function VisitTimeline({ items }: { readonly items: readonly ReleasedItem[] }) {
  return (
    <div className="space-y-8">
      {groupByYear(items).map((group) => (
        <section key={group.year} aria-labelledby={`year-${group.year}`} className="space-y-4">
          <h2
            id={`year-${group.year}`}
            className="text-xl font-bold text-[#0d4026] font-display tabular-nums"
          >
            {group.year}
          </h2>
          <ol className="relative ml-3 border-l-2 border-[#cde0d4] space-y-5">
            {group.items.map((item) => {
              const { session, report } = item;
              const parts = parseEncounterDate(session.encounterDate);
              return (
                <li key={report.id} className="relative pl-6">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[9px] top-5 w-4 h-4 rounded-full bg-white border-[3px] border-[#00783c]"
                  />
                  <Link
                    to={`/patient/reports/${report.id}`}
                    className="group block rounded-[14px] border border-[#d5e0db] bg-white p-5 hover:border-[#056233] hover:bg-[#f7f8f8] transition-colors"
                  >
                    <p className="text-sm font-semibold text-[#00783c] tabular-nums">
                      {parts
                        ? `${parts.month} ${parts.day}, ${parts.year}`
                        : formatEncounterDateDisplay(session.encounterDate)}
                    </p>
                    <h3 className="text-lg font-bold text-[#0d4026] font-display mt-0.5">
                      {session.visitType}
                    </h3>
                    <p className="text-sm text-[#495057]">
                      {report.clinicianName} · {DEPARTMENT_LABELS[session.department]}
                    </p>
                    <p className="text-sm text-[#242628] leading-relaxed mt-2 line-clamp-2 max-w-[68ch]">
                      {visitSummaryText(item)}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#00783c] group-hover:text-[#0d4026]">
                      Read report
                      <ArrowRight
                        className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------
export function PatientReportsListPage({ mode = 'reports' }: PatientReportsListPageProps) {
  const services = useServices();
  const { currentUser } = useAuth();
  // No fallback patient: a profile without a linked record sees an error, never another patient’s data.
  const patientId = currentUser.linkedPatientId ?? '';

  const {
    data: releasedItems,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['patient-released-reports', patientId],
    queryFn: () => services.patientPortal.listReleasedReportsForPatient(patientId),
  });

  const reports: readonly ReleasedItem[] = releasedItems ?? [];
  const latestReleased = reports[0];
  const hasReports = !isLoading && !isError && reports.length > 0;
  const workspaceLabel = ROLE_WORKSPACE_LABELS[currentUser.role];

  const pageTitle =
    mode === 'overview'
      ? `Welcome, ${currentUser.displayName.split(' ')[0]}`
      : mode === 'history'
        ? 'Visit history'
        : 'My medical reports';

  const pageSubtitle =
    mode === 'overview'
      ? 'See your latest visit and what to do next. Your care team has reviewed everything here.'
      : mode === 'history'
        ? 'Every visit your care team has finalized, newest first.'
        : 'Your finalized visit summaries and care instructions.';

  const breadcrumbs =
    mode === 'overview'
      ? [{ label: workspaceLabel }]
      : [{ label: workspaceLabel, to: '/patient' }, { label: pageTitle }];

  return (
    <div className="space-y-8">
      <PageHeader breadcrumbs={breadcrumbs} title={pageTitle} description={pageSubtitle} />

      {isLoading && (
        <Card padding="lg" role="status" className="text-center text-sm font-bold text-[#00783c]">
          <RefreshCw className="w-4 h-4 animate-spin inline mr-2" aria-hidden="true" />
          Loading your visit reports…
        </Card>
      )}

      {isError && (
        <Card
          tone="peach"
          padding="md"
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-[var(--color-danger)]"
        >
          <div className="space-y-1">
            <strong className="text-sm text-[#0d4026] block">
              We couldn’t load your visit reports
            </strong>
            <p className="text-sm text-[#242628]">
              {error instanceof Error
                ? error.message
                : 'Something went wrong while loading your reports. Try again in a moment.'}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </Card>
      )}

      {!isLoading && !isError && reports.length === 0 && (
        <Card padding="lg" className="text-center space-y-2">
          <FileCheck2 className="w-8 h-8 text-[#00783c] mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#0d4026] font-display">No visit reports yet</h2>
          <p className="text-sm text-[#495057] max-w-md mx-auto">
            After your clinician reviews and shares a visit summary, it will show up here
            automatically.
          </p>
        </Card>
      )}

      {/* Overview: one featured visit, then two shortcuts */}
      {mode === 'overview' && hasReports && latestReleased && (
        <LatestVisitCard item={latestReleased} />
      )}

      {mode === 'overview' && !isLoading && !isError && (
        <section aria-labelledby="quick-links-heading" className="space-y-4">
          <h2 id="quick-links-heading" className="text-xl font-bold text-[#0d4026] font-display">
            Quick links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickLinkTile
              to="/patient/reports"
              icon={<FileCheck2 className="w-6 h-6" />}
              title="My medical reports"
              description={
                <span>
                  {reports.length} Released Report{reports.length === 1 ? '' : 's'}
                </span>
              }
            />
            <QuickLinkTile
              to="/patient/history"
              icon={<History className="w-6 h-6" />}
              title="Visit history"
              description="See your visits in date order"
            />
          </div>
        </section>
      )}

      {/* Reports: one card per visit */}
      {mode === 'reports' && hasReports && (
        <section aria-labelledby="reports-heading" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="reports-heading" className="text-xl font-bold text-[#0d4026] font-display">
              {reports.length} visit report{reports.length === 1 ? '' : 's'}
            </h2>
            <Link
              to="/patient/history"
              className="text-sm font-bold text-[#00783c] hover:text-[#0d4026] underline underline-offset-4"
            >
              See as a timeline
            </Link>
          </div>
          <div className="space-y-4">
            {reports.map((item) => (
              <VisitSummaryCard key={item.report.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* History: grouped by year along a timeline */}
      {mode === 'history' && hasReports && <VisitTimeline items={reports} />}

      <p className="flex items-start gap-2 text-sm text-[#495057] max-w-[68ch]">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-[#00783c]" aria-hidden="true" />
        <span>
          Only reports your clinician has approved and shared appear here. Drafts, recordings, and
          internal notes are never shown. This portal uses synthetic demo data.
        </span>
      </p>
    </div>
  );
}
