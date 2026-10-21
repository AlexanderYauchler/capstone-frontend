import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  History,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useServices } from '../../app/providers/ServiceProvider';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { CalloutBanner } from '../../design-system/components/CalloutBanner';
import { Card, ParkviewMedallionCard } from '../../design-system/components/Card';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { ParkviewSubNav, ROLE_WORKSPACE_LABELS } from '../../design-system/layouts/Sidebar';
import {
  DEPARTMENT_LABELS,
  formatEncounterDateDisplay,
  formatTimeShort,
} from '../clinician/session-formatters';

export interface PatientReportsListPageProps {
  readonly mode?: 'overview' | 'reports' | 'history';
}

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

  const reports = releasedItems ?? [];
  const latestReleased = reports[0];

  const pageTitle =
    mode === 'overview'
      ? `Welcome, ${currentUser.displayName.split(' ')[0]}`
      : mode === 'history'
        ? 'Report history & timeline'
        : 'My medical reports';

  const pageSubtitle =
    mode === 'overview'
      ? 'Your visit reports, reviewed, finalized, and shared by your care team.'
      : mode === 'history'
        ? 'A chronological timeline of finalized visit reports released to your portal.'
        : 'Finalized clinical visit summaries and care instructions released to you by your physician.';

  return (
    <div className="space-y-6">
      {/* Breadcrumb Row */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[13px]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/patient" className="text-[#00783c] hover:underline font-semibold">
            {ROLE_WORKSPACE_LABELS[currentUser.role]}
          </Link>
          <span aria-hidden="true" className="text-[#495057]">
            ›
          </span>
          <span className="font-bold text-[#242628]">{pageTitle}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#495057]">
          <span className="font-semibold text-[#0d4026]">{currentUser.displayName}</span>
          <span>·</span>
          <span>Synthetic Demo Patient Record</span>
        </div>
      </nav>

      {/* Parkview Patient Hero Header */}
      <section className="rounded-[20px] overflow-hidden bg-[#00783c] text-white shadow-2xs relative">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 p-6 sm:p-9 flex flex-col justify-center relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -bottom-20 w-52 h-52 rounded-full bg-[#f26b21]"
            />
            <div className="relative z-10 space-y-2.5">
              <div className="inline-flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c8f59b]">
                <span>Patients &amp; Visitors</span>
                <span>·</span>
                <span>{currentUser.organizationName}</span>
                <span>·</span>
                <span>Synthetic Demo Data</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-[1.08] font-display">
                {pageTitle}
              </h1>
              <p className="text-sm sm:text-[16px] text-white/95 max-w-xl leading-relaxed">
                {pageSubtitle}
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 bg-gradient-to-br from-[#edd8c5] via-[#f5e7da] to-[#feede0] p-6 sm:p-7 flex flex-col justify-between text-[#242628] border-t lg:border-t-0 lg:border-l border-white/20">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d4026] text-white text-[11px] font-bold">
                <Sparkles className="w-3 h-3 text-[#7dc242]" aria-hidden="true" />
                PATIENT CARE PORTAL
              </span>
              <span className="text-xs font-bold text-[#00783c] bg-white/90 px-2.5 py-1 rounded-full border border-[#056233]/20">
                {reports.length} Released Report{reports.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="my-4 bg-white/95 rounded-[12px] p-4 border border-[#056233]/25 shadow-2xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00783c] text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {currentUser.displayName
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0d4026]">{currentUser.displayName}</p>
                  <p className="text-xs text-[#495057]">Primary Care Team: Dr. Jordan Lee, MD</p>
                </div>
              </div>
              <div className="pt-2 border-t border-[#e5ece8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#0d4026] font-semibold">
                <span>
                  Latest Release:{' '}
                  {latestReleased
                    ? formatEncounterDateDisplay(latestReleased.session.encounterDate)
                    : 'None'}
                </span>
                <span className="text-[#00783c] font-bold">
                  {latestReleased ? `${latestReleased.session.visitType}` : 'No released visits'}
                </span>
              </div>
            </div>

            <p className="text-[11.5px] text-[#495057] font-medium">
              Only physician-approved and explicitly released visit summaries appear in your portal.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="hidden lg:block lg:col-span-3 min-w-0">
          <ParkviewSubNav />
        </div>

        <div className="min-w-0 lg:col-span-9 space-y-6">
          {mode === 'overview' && (
            <section aria-label="Patient quick links" className="space-y-4">
              <h2 className="text-2xl sm:text-[28px] font-bold text-[#0d4026] font-display">
                Quick links
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ParkviewMedallionCard
                  icon={<FileCheck2 className="w-7 h-7" aria-hidden="true" />}
                  title="My medical reports"
                  description="Read finalized visit summaries, medication instructions, and follow-up care steps released by your care team."
                  action={
                    <Link
                      to="/patient/reports"
                      className="inline-flex items-center gap-2 text-sm font-bold text-[#00783c] hover:text-[#0d4026] group"
                    >
                      <span>Browse released reports ({reports.length})</span>
                      <ArrowRight
                        className="w-4 h-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </Link>
                  }
                />

                <ParkviewMedallionCard
                  icon={<History className="w-7 h-7" aria-hidden="true" />}
                  title="Report history & timeline"
                  description="View a chronological record of your finalized primary care visits and wellness consultations at Northfield."
                  action={
                    <Link
                      to="/patient/history"
                      className="inline-flex items-center gap-2 text-sm font-bold text-[#00783c] hover:text-[#0d4026] group"
                    >
                      <span>See visit timeline</span>
                      <ArrowRight
                        className="w-4 h-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </Link>
                  }
                />
              </div>
            </section>
          )}

          <CalloutBanner
            tone="emerald"
            title="Only finalized, clinician-released reports appear here"
            description="Unapproved AI drafts, internal clinician clarification notes, draft revisions, and raw visit recordings are never exposed in the patient portal."
            action={
              latestReleased ? (
                <ButtonLink
                  to={`/patient/reports/${latestReleased.report.id}`}
                  variant="heroDark"
                  size="sm"
                >
                  Open latest report ({formatEncounterDateDisplay(latestReleased.session.encounterDate)})
                </ButtonLink>
              ) : undefined
            }
          />

          {/* Loading State */}
          {isLoading && (
            <Card padding="lg" role="status" className="text-center text-sm font-bold text-[#00783c]">
              <RefreshCw className="w-4 h-4 animate-spin inline mr-2" aria-hidden="true" />
              Loading released visit reports for {currentUser.displayName}…
            </Card>
          )}

          {/* Error State */}
          {isError && (
            <Card
              tone="peach"
              padding="md"
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-[var(--color-danger)]"
            >
              <div className="space-y-1">
                <strong className="text-sm text-[#0d4026] block">
                  Unable to load released patient reports
                </strong>
                <p className="text-xs text-[#242628]">
                  {error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred while retrieving your released visit summaries.'}
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !isError && reports.length === 0 && (
            <Card padding="lg" className="text-center space-y-2">
              <FileCheck2 className="w-8 h-8 text-[#00783c] mx-auto" aria-hidden="true" />
              <h2 className="text-lg font-bold text-[#0d4026] font-display">
                No released visit reports yet
              </h2>
              <p className="text-xs sm:text-sm text-[#495057] max-w-md mx-auto">
                When your clinician approves, finalizes, and releases a visit summary to your
                portal, it will appear here automatically.
              </p>
            </Card>
          )}

          {/* Released Reports List */}
          {!isLoading && !isError && reports.length > 0 && (
            <section aria-label="Released visit reports" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0d4026] font-display">
                    Released visit summaries for {currentUser.displayName} ({reports.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-[#495057]">
                    Select any released visit below to read the full clinical summary and care
                    instructions.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {reports.map(({ session, report }) => (
                  <Card
                    key={report.id}
                    padding="md"
                    className="border-[#cde0d4] hover:border-[#00783c] transition-colors space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e4ece7] pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00783c] bg-[#edf5f0] px-2.5 py-0.5 rounded border border-[#cde0d4]">
                            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{formatEncounterDateDisplay(session.encounterDate)}</span>
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#495057]">
                            {session.id} · {report.id}
                          </span>
                          <StatusBadge tone="success">
                            Released · v{session.release.releasedRevision ?? report.currentRevision}
                          </StatusBadge>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-[#0d4026] font-display">
                          {session.visitType}
                        </h3>

                        <p className="text-xs text-[#495057] flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-semibold text-[#0d4026]">
                            <Stethoscope className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
                            <span>{report.clinicianName}</span>
                          </span>
                          <span>·</span>
                          <span>{DEPARTMENT_LABELS[session.department]}</span>
                          {session.release.releasedAt && (
                            <>
                              <span>·</span>
                              <span>
                                Released {formatTimeShort(session.release.releasedAt)}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <ButtonLink
                        to={`/patient/reports/${report.id}`}
                        variant="primary"
                        size="sm"
                        iconRight={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                      >
                        Read full visit report
                      </ButtonLink>
                    </div>

                    {/* Summary & Next Steps Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs sm:text-sm">
                      <div className="md:col-span-7 space-y-1.5">
                        <strong className="text-xs uppercase tracking-wider text-[#00783c] block">
                          Visit Summary
                        </strong>
                        <p className="text-[#242628] leading-relaxed">
                          {report.narrativeSummary ?? report.soap.assessment}
                        </p>
                      </div>

                      <div className="md:col-span-5 rounded-[10px] bg-[#edf5f0]/80 border border-[#cde0d4] p-3 space-y-1.5 text-xs">
                        <strong className="text-[#0d4026] flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
                          <span>Key Next Steps</span>
                        </strong>
                        <p className="text-[#242628]">
                          <strong>Medications:</strong> {report.patientNextSteps.medicationSummary}
                        </p>
                        <p className="text-[#242628]">
                          <strong>Follow-Up:</strong> {report.patientNextSteps.followUpInstructions}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#e4ece7] flex flex-wrap items-center justify-between gap-2 text-xs text-[#495057]">
                      <span className="inline-flex items-center gap-1.5 text-[#00783c] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          Clinician-approved summary (excludes internal transcripts &amp; draft notes)
                        </span>
                      </span>
                      <Link
                        to={`/patient/reports/${report.id}`}
                        className="inline-flex items-center gap-1 font-bold text-[#00783c] hover:text-[#0d4026] underline underline-offset-4"
                      >
                        <span>View full care instructions</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Privacy & Scope Footer Card */}
          <Card tone="mint" padding="md" className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#00783c] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1 text-xs text-[#242628]">
              <strong className="text-[#0d4026] block">
                Patient Portal Release &amp; Demonstration Notice
              </strong>
              <p className="leading-relaxed text-[#495057]">
                This portal displays synthetic demonstration records for{' '}
                <strong>{currentUser.displayName}</strong>. Reports awaiting clinician review or
                clarification resolution are withheld until explicitly approved, finalized, and
                released by the attending clinician.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
