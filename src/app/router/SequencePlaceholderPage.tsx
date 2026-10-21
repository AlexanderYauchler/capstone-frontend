import { Link, useLocation, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  FileCheck2,
  FileText,
  History,
  Info,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useServices } from '../providers/ServiceProvider';
import { CalloutBanner } from '../../design-system/components/CalloutBanner';
import { Card, ParkviewMedallionCard } from '../../design-system/components/Card';
import { StatCard } from '../../design-system/components/StatCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { ParkviewSubNav, ROLE_WORKSPACE_LABELS } from '../../design-system/layouts/Sidebar';

export interface SequencePlaceholderPageProps {
  readonly title: string;
  readonly subtitle: string;
  readonly sequenceTarget: 'Sequence 3' | 'Sequence 4';
  readonly figmaNodes?: string;
  readonly kind?: 'patient_portal' | 'analytics' | 'default';
}

export function SequencePlaceholderPage({
  title,
  subtitle,
  sequenceTarget,
  kind = 'default',
}: SequencePlaceholderPageProps) {
  const services = useServices();
  const { currentUser } = useAuth();
  const params = useParams<{ sessionId?: string; reportId?: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const analyticsView = searchParams.get('view') === 'monthly' ? 'monthly' : 'cohort';
  const diagnosisParam = searchParams.get('preset') === 'diabetes-sept' ? 'diabetes' : 'all';

  const isPatientView =
    kind === 'patient_portal' ||
    currentUser.role === 'patient' ||
    location.pathname.startsWith('/patient');

  const sessionId = params.sessionId;

  const {
    data: patientReports,
    isLoading: isPatientLoading,
    isError: isPatientError,
    refetch: refetchPatientReports,
  } = useQuery({
    queryKey: ['patient-released-reports', currentUser.linkedPatientId],
    queryFn: () =>
      services.patientPortal.listReleasedReportsForPatient(
        currentUser.linkedPatientId ?? 'pat-alex-morgan',
      ),
    enabled: isPatientView,
  });

  const {
    data: analyticsSummary,
    isLoading: isAnalyticsLoading,
    isError: isAnalyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['analytics-summary', analyticsView, diagnosisParam],
    queryFn: () =>
      services.analytics.getAggregateSummary({
        view: analyticsView,
        diagnosis: diagnosisParam,
      }),
    enabled: kind === 'analytics',
  });

  const { data: sessionBundle } = useQuery({
    queryKey: ['session-subroute-bundle', sessionId],
    queryFn: () => services.sessions.getSessionReviewBundle(sessionId!),
    enabled: Boolean(sessionId),
  });

  const effectiveTitle =
    kind === 'analytics' && analyticsView === 'monthly'
      ? 'Monthly documentation analytics'
      : title;

  const effectiveSubtitle =
    kind === 'analytics' && analyticsView === 'monthly'
      ? 'Monthly operational volume, pending reviews, finalized reports, and clarification metrics.'
      : subtitle;

  const useFullWidthCanvas = kind === 'analytics';

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. Breadcrumb Row
          ===================================================================== */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[13px]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/login" className="text-[#00783c] hover:underline font-semibold">
            Home
          </Link>
          <span aria-hidden="true" className="text-[#495057]">
            ›
          </span>
          <span className="text-[#00783c] font-semibold">
            {ROLE_WORKSPACE_LABELS[currentUser.role]}
          </span>
          {sessionId && (
            <>
              <span aria-hidden="true" className="text-[#495057]">
                ›
              </span>
              <Link
                to={`/clinician/sessions/${sessionId}`}
                className="text-[#00783c] hover:underline font-semibold"
              >
                {sessionId}
              </Link>
            </>
          )}
          <span aria-hidden="true" className="text-[#495057]">
            ›
          </span>
          <span className="font-bold text-[#242628]">{effectiveTitle}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#495057]">
          <span className="font-semibold text-[#0d4026]">{currentUser.displayName}</span>
          <span>·</span>
          <span>{currentUser.title}</span>
        </div>
      </nav>

      {/* =====================================================================
          2. Page Header
          ===================================================================== */}
      {isPatientView ? (
        <section className="rounded-[20px] overflow-hidden bg-[#00783c] text-white shadow-2xs relative">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center relative overflow-hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -bottom-20 w-52 h-52 rounded-full bg-[#f26b21]"
              />
              <div className="relative z-10 space-y-2.5">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c8f59b]">
                  <span>Patients &amp; Visitors</span>
                  <span>·</span>
                  <span>{currentUser.organizationName}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-white leading-[1.08] font-display">
                  {effectiveTitle}
                </h1>
                <p className="text-sm sm:text-[16px] text-white/95 max-w-xl leading-relaxed">
                  {effectiveSubtitle}
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
                  {(patientReports ?? []).length} Released Reports
                </span>
              </div>

              <div className="my-4 bg-white/95 rounded-[12px] p-4 border border-[#056233]/25 shadow-2xs space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00783c] text-white font-bold text-sm flex items-center justify-center shrink-0">
                    AM
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0d4026]">{currentUser.displayName}</p>
                    <p className="text-xs text-[#495057]">
                      Primary Care Team: Dr. Jordan Lee, MD
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#e5ece8] flex items-center justify-between text-xs text-[#0d4026] font-semibold">
                  <span>Latest Release: Sep 18, 2026</span>
                  <span className="text-[#9a4406] font-bold">Oct 6 Visit In Physician Review</span>
                </div>
              </div>

              <p className="text-[11.5px] text-[#495057] font-medium">
                Only physician-approved and released visit summaries appear in the patient portal.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[18px] overflow-hidden bg-[#00783c] text-white px-6 py-6 sm:px-9 sm:py-7 shadow-2xs relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-36px] bottom-[-88px] w-56 h-56 rounded-full bg-[#f26b21]"
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#c8f59b]">
                <span>{ROLE_WORKSPACE_LABELS[currentUser.role]}</span>
                <span>·</span>
                <span>{currentUser.organizationName}</span>
                <span>·</span>
                <span>Oct 6, 2026</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-bold text-white leading-tight font-display">
                {effectiveTitle}
              </h1>
              <p className="text-sm sm:text-[15px] text-white/95 leading-relaxed">
                {effectiveSubtitle}
              </p>
            </div>

            {kind === 'analytics' && (
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <ButtonLink
                  to={`${location.pathname}?view=cohort`}
                  variant={analyticsView === 'cohort' ? 'heroDark' : 'secondary'}
                  size="sm"
                >
                  Clinical cohort view
                </ButtonLink>
                <ButtonLink
                  to={`${location.pathname}?view=monthly`}
                  variant={analyticsView === 'monthly' ? 'heroDark' : 'secondary'}
                  size="sm"
                >
                  Monthly operations
                </ButtonLink>
              </div>
            )}

            {sessionId && (
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <ButtonLink
                  to={`/clinician/sessions/${sessionId}`}
                  variant="heroDark"
                  size="sm"
                  iconLeft={<ArrowLeft className="w-4 h-4 text-[#7dc242]" aria-hidden="true" />}
                >
                  Back to Session {sessionId}
                </ButtonLink>
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================================
          3. Main Workspace Body
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {!useFullWidthCanvas && (
          <div className="hidden lg:block lg:col-span-3 min-w-0">
            <ParkviewSubNav
              extraLinks={
                currentUser.role === 'clinician'
                  ? [
                      { label: 'Start New Visit', to: '/clinician/sessions/new' },
                      { label: 'Upload Recording', to: '/clinician/sessions/upload' },
                    ]
                  : undefined
              }
            />
          </div>
        )}

        <div
          className={
            useFullWidthCanvas
              ? 'min-w-0 lg:col-span-12 space-y-6'
              : 'min-w-0 lg:col-span-9 space-y-7'
          }
        >
          {/* -----------------------------------------------------------------
              PATIENT PORTAL VIEW
              ----------------------------------------------------------------- */}
          {isPatientView && (
            <>
              <p className="text-[15px] text-[#242628] leading-relaxed">
                Northfield Primary Care is committed to providing clear, compassionate visit
                summaries for patients and their families. This portal gives you direct access to
                visit reports that have been reviewed, approved, and released by Dr. Jordan Lee.
              </p>

              {/* "Quick links" Floating-Medallion Cards */}
              <section aria-label="Patient quick links" className="space-y-5">
                <h2 className="text-2xl sm:text-[32px] font-bold text-[#0d4026] font-display text-center">
                  Quick links
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ParkviewMedallionCard
                    icon={<FileCheck2 className="w-7 h-7" aria-hidden="true" />}
                    title="My medical reports"
                    description="Read plain-language visit summaries, medication instructions, and follow-up care steps released by your care team."
                    action={
                      <Link
                        to="/patient/reports"
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#00783c] hover:text-[#0d4026] group"
                      >
                        <span>See released reports</span>
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

              {/* Emerald Banner */}
              <CalloutBanner
                tone="emerald"
                title="Your privacy & clinical accuracy come first"
                description="Unapproved AI drafts, internal clinician clarification notes, and raw visit audio are excluded from the patient portal. You only see reports signed and released by Dr. Jordan Lee."
                action={
                  <ButtonLink to="/patient/reports/rep-0988" variant="heroDark" size="sm">
                    Read latest report (Sep 18)
                  </ButtonLink>
                }
              />

              {/* Released Visit Reports Section */}
              <section aria-label="Released visit summaries" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0d4026] font-display">
                      Released visit summaries for Alex Morgan
                    </h2>
                    <p className="text-sm text-[#495057]">
                      Note: Your October 6, 2026 Diabetes follow-up (CS-1042) is currently with Dr.
                      Lee for final review and will appear here once released.
                    </p>
                  </div>
                  <ButtonLink to="/patient/reports" variant="secondary" size="sm">
                    See all reports overview
                  </ButtonLink>
                </div>

                {isPatientLoading && (
                  <Card padding="md" role="status" className="text-center text-sm text-[#00783c]">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" aria-hidden="true" />
                    Loading released patient summaries…
                  </Card>
                )}

                {isPatientError && (
                  <Card tone="peach" padding="md" role="alert" className="flex items-center justify-between">
                    <span className="text-sm text-[#242628]">
                      Unable to load released patient summaries.
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void refetchPatientReports()}
                    >
                      Retry
                    </Button>
                  </Card>
                )}

                {!isPatientLoading && !isPatientError && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {(patientReports ?? []).map((item) => (
                      <Card
                        key={item.report.id}
                        tone="peach"
                        padding="md"
                        className="flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#00783c]">
                            {item.session.encounterDate} · {item.session.id}
                          </span>
                          <h3 className="text-lg font-bold text-[#0d4026] font-display">
                            {item.session.visitType}
                          </h3>
                          <p className="text-xs text-[#242628] leading-relaxed">
                            {item.report.narrativeSummary ?? item.report.soap.assessment}
                          </p>
                        </div>
                        <Link
                          to={`/patient/reports/${item.report.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00783c] hover:text-[#0d4026] underline underline-offset-4"
                        >
                          <span>Read full visit report</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      </Card>
                    ))}

                    <Card tone="peach" padding="md" className="flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#9a4406]">
                          2026-10-06 · In Clinician Review
                        </span>
                        <h3 className="text-lg font-bold text-[#0d4026] font-display">
                          Diabetes follow-up (Pending)
                        </h3>
                        <p className="text-xs text-[#242628] leading-relaxed">
                          Dr. Jordan Lee is currently reviewing your October 6 visit summary before
                          releasing it to your portal.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#9a4406]">
                        Withheld until physician sign-off
                      </span>
                    </Card>
                  </div>
                )}
              </section>
            </>
          )}

          {/* -----------------------------------------------------------------
              HEALTHCARE ANALYTICS VIEW (Clinician & Analyst)
              Strict Suppression Handling: Never invent a percentage when a
              metric is suppressed or percentage is null!
              ----------------------------------------------------------------- */}
          {kind === 'analytics' && (
            <div className="space-y-6">
              {isAnalyticsLoading && (
                <Card padding="lg" role="status" className="text-center text-sm font-bold text-[#00783c]">
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" aria-hidden="true" />
                  Loading aggregate clinical analytics…
                </Card>
              )}

              {isAnalyticsError && (
                <Card tone="peach" padding="md" role="alert" className="flex items-center justify-between">
                  <span className="text-sm text-[#242628]">
                    Unable to load aggregate analytics summary.
                  </span>
                  <Button variant="primary" size="sm" onClick={() => void refetchAnalytics()}>
                    Retry
                  </Button>
                </Card>
              )}

              {analyticsSummary && (
                <>
                  {/* Top 4 Analytics KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Eligible cohort visits"
                      value={
                        analyticsSummary.isCohortSuppressed
                          ? 'Suppressed (<5)'
                          : analyticsSummary.verifiedVisitsCount
                      }
                      subtitle="Synthetic September 2026 cohort"
                      icon={<ShieldCheck className="w-4 h-4" aria-hidden="true" />}
                      accent="emerald"
                    />
                    <StatCard
                      label="Follow-up documented"
                      value={
                        analyticsSummary.followUpDocumented.isSuppressed ||
                        analyticsSummary.followUpDocumented.percentage === null
                          ? analyticsSummary.followUpDocumented.displayLabel
                          : `${analyticsSummary.followUpDocumented.displayLabel} (${analyticsSummary.followUpDocumented.percentage}%)`
                      }
                      subtitle={
                        analyticsSummary.followUpDocumented.isSuppressed
                          ? 'Suppressed for small-cell threshold (< 5)'
                          : 'Across eligible cohort encounters'
                      }
                      icon={<Activity className="w-4 h-4" aria-hidden="true" />}
                      accent="emerald"
                    />
                    <StatCard
                      label="Primary symptom lead"
                      value={
                        analyticsSummary.topSymptom
                          ? analyticsSummary.topSymptom.metric.isSuppressed
                            ? 'Suppressed (<5)'
                            : analyticsSummary.topSymptom.symptom
                          : 'None'
                      }
                      subtitle={
                        analyticsSummary.topSymptom
                          ? analyticsSummary.topSymptom.metric.isSuppressed
                            ? analyticsSummary.topSymptom.metric.displayLabel
                            : `${analyticsSummary.topSymptom.metric.displayLabel} encounters`
                          : 'No cohort encounters'
                      }
                      icon={<Stethoscope className="w-4 h-4" aria-hidden="true" />}
                      accent="deep"
                    />
                    <StatCard
                      label="Small-cell suppression"
                      value={`< ${analyticsSummary.minimumCellSizeThreshold}`}
                      subtitle="Aggregate privacy threshold"
                      icon={<FileText className="w-4 h-4" aria-hidden="true" />}
                      accent="orange"
                    />
                  </div>

                  {analyticsView === 'cohort' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Symptom Distribution */}
                      <Card padding="md" className="lg:col-span-7 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#e4ece7] pb-3">
                          <div>
                            <h2 className="text-lg font-bold text-[#0d4026] font-display">
                              Cohort Symptom Distribution (September 2026)
                            </h2>
                            <p className="text-xs text-[#495057]">
                              Synthetic aggregate cohort encounters (n ={' '}
                              {analyticsSummary.verifiedVisitsCount}).
                            </p>
                          </div>
                          <StatusBadge tone="info">Synthetic Cohort Preview</StatusBadge>
                        </div>

                        <div className="space-y-3">
                          {analyticsSummary.symptomDistribution.map((item) => {
                            const isSuppressed =
                              item.metric.isSuppressed || item.metric.percentage === null;
                            const pct = item.metric.percentage;
                            return (
                              <div key={item.symptom} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                  <span className="text-[#0d4026]">{item.symptom}</span>
                                  <span className="text-[#495057] tabular-nums">
                                    {isSuppressed
                                      ? item.metric.displayLabel
                                      : `${item.metric.displayLabel} visits (${pct}%)`}
                                  </span>
                                </div>
                                {!isSuppressed && pct !== null && (
                                  <div className="w-full h-2.5 bg-[#edf5f0] rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#00783c] rounded-full"
                                      style={{ width: `${Math.max(pct, 6)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-2 border-t border-[#e4ece7] flex items-center justify-between text-xs text-[#9a4406] font-semibold">
                          <span>{analyticsSummary.suppressedRareCombinationsNote}</span>
                          <span>Complementary cell suppression (&lt; 5)</span>
                        </div>
                      </Card>

                      {/* Weekly Visit Volume */}
                      <Card tone="mint" padding="md" className="lg:col-span-5 space-y-4">
                        <div>
                          <h2 className="text-lg font-bold text-[#0d4026] font-display">
                            Weekly Encounter Volume
                          </h2>
                          <p className="text-xs text-[#495057]">
                            September 2026 weekly cohort cadence across Northfield clinics.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {analyticsSummary.weeklyVisitTrends.map((wk) => {
                            const isSuppressed =
                              wk.metric.isSuppressed || wk.metric.percentage === null;
                            return (
                              <div
                                key={wk.weekLabel}
                                className="bg-white rounded-[10px] p-3.5 border border-[#cde0d4]"
                              >
                                <p className="text-xs font-bold text-[#495057]">
                                  Sept {wk.weekLabel}
                                </p>
                                <p className="text-2xl font-bold text-[#0d4026] font-display tabular-nums mt-1">
                                  {wk.metric.displayLabel}
                                </p>
                                <p className="text-[11px] text-[#00783c] font-semibold">
                                  {isSuppressed
                                    ? 'Suppressed (< 5 threshold)'
                                    : `${wk.metric.percentage}% of monthly cohort`}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </div>
                  ) : (
                    /* Monthly Documentation Operations Table */
                    <Card padding="none" className="overflow-hidden border-[#056233]/30">
                      <div className="p-5 border-b border-[#e4ece7] flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-bold text-[#0d4026] font-display">
                            Monthly Documentation Operations &amp; Clarification Throughput
                          </h2>
                          <p className="text-xs text-[#495057]">
                            Operational volume across August, September, and October 2026 (through
                            Oct 6 reference date).
                          </p>
                        </div>
                        <StatusBadge tone="teal">Operational Metrics</StatusBadge>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-[#edf5f0] border-b border-[#cde0d4] text-[11px] font-bold uppercase tracking-wider text-[#0d4026]">
                              <th className="py-3 px-4">Reporting Period</th>
                              <th className="py-3 px-4">Sessions Created</th>
                              <th className="py-3 px-4">Finalized Reports</th>
                              <th className="py-3 px-4">Released to Patient Portal</th>
                              <th className="py-3 px-4">Clarification Rate</th>
                              <th className="py-3 px-4">Pending at Period End</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e4ece7]">
                            {analyticsSummary.monthlyOperations.map((row) => (
                              <tr key={row.monthKey} className="hover:bg-[#f7f8f8]">
                                <td className="py-3.5 px-4 font-bold text-[#0d4026]">
                                  {row.monthLabel}
                                </td>
                                <td className="py-3.5 px-4 tabular-nums font-semibold">
                                  {row.sessionsCreated}
                                </td>
                                <td className="py-3.5 px-4 tabular-nums">{row.finalizedReports}</td>
                                <td className="py-3.5 px-4 tabular-nums text-[#00783c] font-semibold">
                                  {row.releasedReports}
                                </td>
                                <td className="py-3.5 px-4 tabular-nums">
                                  {row.clarificationResolutionRatePct === null
                                    ? `${row.sessionsWithClarifications} visits`
                                    : `${row.sessionsWithClarifications} visits (${row.clarificationResolutionRatePct}% resolved)`}
                                </td>
                                <td className="py-3.5 px-4 tabular-nums font-semibold text-[#9a4406]">
                                  {row.pendingReviewsAtPeriodEnd}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* -----------------------------------------------------------------
              DEFAULT UPCOMING WORKFLOW PREVIEW (For Sequence 3 sub-routes & Sequence 4 routes)
              ----------------------------------------------------------------- */}
          {kind === 'default' && (
            <Card padding="lg" className="space-y-4 border-[#056233]/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#edf5f0] border border-[#cde0d4] flex items-center justify-center text-[#00783c] shrink-0">
                  <Info className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#00783c]">
                    {sessionBundle
                      ? `Encounter ${sessionBundle.session.id} · ${effectiveTitle}`
                      : `${sequenceTarget} Implementation Scope`}
                  </span>
                  <h2 className="text-xl font-bold text-[#0d4026] font-display">
                    {sessionBundle
                      ? `${effectiveTitle} — ${sessionBundle.session.patientName}`
                      : `${effectiveTitle} — Scheduled for ${sequenceTarget}`}
                  </h2>
                  <p className="text-sm text-[#495057] leading-relaxed">
                    {sessionBundle ? (
                      <>
                        Full SOAP editing, clarification resolution, report revision comparison,
                        clinician approval/finalization, and patient release are available in the
                        primary <strong>Clinical Review Workbench</strong> for encounter{' '}
                        <strong>{sessionBundle.session.id}</strong>.
                      </>
                    ) : (
                      <>
                        This workspace route is part of {sequenceTarget}. Interactive mutations for
                        live audio capture, audio file upload, and administrative configuration
                        belong to {sequenceTarget} so unimplemented operations are never simulated.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {sessionBundle && (
                <div className="rounded-[12px] bg-[#f7f8f8] border border-[#d5e0db] p-4 space-y-2.5 text-xs sm:text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-[#0d4026]">
                      Active Session Context: {sessionBundle.session.id} ·{' '}
                      {sessionBundle.session.patientName}
                    </strong>
                    <span className="text-xs font-semibold text-[#00783c]">
                      {sessionBundle.session.visitType} ({sessionBundle.session.encounterDate})
                    </span>
                  </div>
                  <p className="text-xs text-[#495057]">
                    Review status:{' '}
                    <strong>{sessionBundle.session.review.status.replace(/_/g, ' ')}</strong> ·
                    Current Revision:{' '}
                    <strong>v{sessionBundle.session.review.currentRevision}</strong> · Release
                    status:{' '}
                    <strong>{sessionBundle.session.release.status.replace(/_/g, ' ')}</strong> ·
                    Analytics track:{' '}
                    <strong>{sessionBundle.session.privacy.status.replace(/_/g, ' ')}</strong>
                  </p>
                  {sessionBundle.report && sessionBundle.report.revisions.length > 0 && (
                    <div className="pt-2 border-t border-[#e4ece7] space-y-1">
                      <strong className="text-xs text-[#0d4026] block">
                        Recorded Revisions ({sessionBundle.report.revisions.length}):
                      </strong>
                      {sessionBundle.report.revisions.map((rev) => (
                        <p key={rev.revisionNumber} className="text-xs text-[#495057]">
                          <strong>v{rev.revisionNumber}</strong> ({rev.authorDisplayName}):{' '}
                          {rev.changeSummary}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#e4ece7]">
                {sessionId ? (
                  <ButtonLink
                    to={`/clinician/sessions/${sessionId}`}
                    variant="primary"
                    size="sm"
                    iconLeft={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
                  >
                    Return to Session {sessionId} Review Workbench
                  </ButtonLink>
                ) : currentUser.role === 'clinician' ? (
                  <>
                    <ButtonLink to="/clinician/dashboard" variant="primary" size="sm">
                      Go to Clinician Dashboard
                    </ButtonLink>
                    <ButtonLink to="/clinician/sessions" variant="secondary" size="sm">
                      Browse Clinical Sessions
                    </ButtonLink>
                  </>
                ) : (
                  <ButtonLink to="/login" variant="secondary" size="sm">
                    Switch Demonstration Role
                  </ButtonLink>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
