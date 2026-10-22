import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck2,
  FolderKanban,
  Mic,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useServices } from '../../app/providers/ServiceProvider';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { StatCard } from '../../design-system/components/StatCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { ROLE_WORKSPACE_LABELS } from '../../design-system/layouts/Sidebar';
import { deriveSessionDisplayState } from '../../domain/state-machines';
import {
  CAPTURE_ORIGIN_LABELS,
  DEPARTMENT_LABELS,
  formatDurationMmSs,
  formatEncounterDateDisplay,
  formatTimeShort,
} from './session-formatters';

type DashboardQueueTab =
  | 'all_today'
  | 'attention'
  | 'needs_review'
  | 'clarification'
  | 'released_today';

export function ClinicianDashboardPage() {
  const services = useServices();
  const { currentUser } = useAuth();
  const [activeQueueTab, setActiveQueueTab] = useState<DashboardQueueTab>('all_today');

  const {
    data: dashboardMetrics,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => services.sessions.getDashboardMetrics(),
  });

  const {
    data: allSessions,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['clinician-dashboard-sessions'],
    queryFn: () => services.sessions.listSessions(),
  });

  const isLoading = isMetricsLoading || isSessionsLoading;
  const isError = isMetricsError || isSessionsError;

  const referenceDate = dashboardMetrics?.referenceDate ?? '2026-10-06';
  const sessions = allSessions ?? [];
  const todaysSessions = sessions.filter((s) => s.encounterDate === referenceDate);

  const clarificationSessions = todaysSessions.filter((s) => {
    const code = deriveSessionDisplayState(s).code;
    return code === 'CLARIFICATION_NEEDED' || code === 'DRAFT_SAVED_NEEDS_CLARIFICATION';
  });

  const needsReviewSessions = todaysSessions.filter((s) => {
    const code = deriveSessionDisplayState(s).code;
    return code === 'NEEDS_REVIEW' || code === 'DRAFT_SAVED_READY';
  });

  const interruptedSessions = todaysSessions.filter((s) => {
    const code = deriveSessionDisplayState(s).code;
    return code === 'PROCESSING_INTERRUPTED' || code === 'UPLOAD_INTERRUPTED';
  });

  const attentionSessions = todaysSessions.filter(
    (s) => deriveSessionDisplayState(s).needsClinicianAttention,
  );

  const releasedTodaySessions = todaysSessions.filter(
    (s) => deriveSessionDisplayState(s).code === 'RELEASED',
  );

  const recentlyFinalizedSessions = sessions.filter((s) => {
    const code = deriveSessionDisplayState(s).code;
    return code === 'RELEASED' || code === 'APPROVED_NOT_RELEASED';
  });

  const displayedQueue = (() => {
    switch (activeQueueTab) {
      case 'attention':
        return attentionSessions;
      case 'needs_review':
        return needsReviewSessions;
      case 'clarification':
        return clarificationSessions;
      case 'released_today':
        return releasedTodaySessions;
      case 'all_today':
      default:
        return todaysSessions;
    }
  })();

  const primaryClarificationSession = clarificationSessions[0];
  const clinicianLastName = currentUser.displayName.split(' ').slice(-1)[0] ?? 'Lee';

  return (
    <div className="space-y-6">
      {/* Breadcrumb Row */}
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
          <span aria-hidden="true" className="text-[#495057]">
            ›
          </span>
          <span className="font-bold text-[#242628]">Clinician Dashboard</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#495057]">
          <span className="font-semibold text-[#0d4026]">{currentUser.displayName}</span>
          <span>·</span>
          <span>{currentUser.title}</span>
        </div>
      </nav>

      {/* Compact Parkview Emerald Action Header */}
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
              <span>{dashboardMetrics?.referenceDateLabel ?? 'October 6'}, 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-bold text-white leading-tight font-display">
              Good morning, Dr. {clinicianLastName}
            </h1>
            <p className="text-sm sm:text-[15px] text-white/95 leading-relaxed">
              Your visits, review queue, and next steps — all in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <ButtonLink
              to="/clinician/sessions"
              variant="heroDark"
              size="md"
              iconLeft={<FolderKanban className="w-4 h-4 text-[#7dc242]" aria-hidden="true" />}
            >
              Manage all sessions
            </ButtonLink>
            {primaryClarificationSession && (
              <ButtonLink
                to={`/clinician/sessions/${primaryClarificationSession.id}`}
                variant="secondary"
                size="md"
                iconRight={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
              >
                Review priority {primaryClarificationSession.id}
              </ButtonLink>
            )}
            <ButtonLink
              to="/clinician/sessions/new"
              variant="secondary"
              size="md"
              iconLeft={<Mic className="w-4 h-4 text-[#00783c]" aria-hidden="true" />}
            >
              New recording
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <Card padding="lg" role="status" aria-live="polite" className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#00783c]">
            <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Loading clinician workspace metrics and session queue…</span>
          </div>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Card
          tone="peach"
          padding="lg"
          role="alert"
          className="border-l-4 border-l-[var(--color-danger)] space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0d4026]">
                Unable to load clinician dashboard data
              </h2>
              <p className="text-xs sm:text-sm text-[#242628] mt-1">
                {metricsError instanceof Error
                  ? metricsError.message
                  : sessionsError instanceof Error
                    ? sessionsError.message
                    : 'An unexpected error occurred while reading clinical sessions.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                void refetchMetrics();
                void refetchSessions();
              }}
            >
              Retry loading dashboard
            </Button>
          </div>
        </Card>
      )}

      {/* Main Dashboard Content */}
      {!isLoading && !isError && dashboardMetrics && (
        <div className="space-y-6">
          {/* 4 Dynamic KPI Stat Cards */}
          <section
            aria-label="Clinician workspace summary metrics"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard
              label="Today’s sessions"
              value={dashboardMetrics.todaysSessionsCount}
              subtitle={`Scheduled on ${dashboardMetrics.referenceDateLabel}`}
              icon={<CalendarClock className="w-4 h-4" aria-hidden="true" />}
              accent="emerald"
            />
            <StatCard
              label="Needs review"
              value={dashboardMetrics.needsReviewCount}
              subtitle="SOAP drafts ready for sign-off"
              icon={<ClipboardList className="w-4 h-4" aria-hidden="true" />}
              accent="emerald"
            />
            <StatCard
              label="Clarification needed"
              value={dashboardMetrics.clarificationNeededSessionsCount}
              subtitle={`${dashboardMetrics.openClarificationQuestionsCount} prompts blocking approval`}
              icon={<AlertTriangle className="w-4 h-4" aria-hidden="true" />}
              accent="orange"
            />
            <StatCard
              label="Released today"
              value={dashboardMetrics.releasedTodayCount}
              subtitle="Shared to patient portal"
              icon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
              accent="deep"
            />
          </section>

          {/* Priority Clinical Tasks Row (Clarifications, Pending Reviews, Interrupted Jobs) */}
          <section aria-label="Priority clinical tasks" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {primaryClarificationSession ? (
              <Card
                tone="peach"
                padding="md"
                className="lg:col-span-7 border-l-4 border-l-[#f26b21] flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9a4406]">
                    <AlertTriangle className="w-4 h-4 text-[#f26b21]" aria-hidden="true" />
                    <span>
                      Priority Clinical Clarification · Visit {primaryClarificationSession.id}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#0d4026] font-display">
                    {primaryClarificationSession.patientName} —{' '}
                    {primaryClarificationSession.visitType} (
                    {formatDurationMmSs(primaryClarificationSession.capture.durationSeconds)} ·{' '}
                    {DEPARTMENT_LABELS[primaryClarificationSession.department]})
                  </h2>
                  <p className="text-xs sm:text-sm text-[#242628] leading-relaxed">
                    {dashboardMetrics.attentionSession?.detail ??
                      `${primaryClarificationSession.review.unresolvedClarificationCount} clinical details require physician confirmation before sign-off.`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-xs font-semibold text-[#9a4406]">
                    {primaryClarificationSession.review.unresolvedClarificationCount} open
                    clarification questions · Revision v
                    {primaryClarificationSession.review.currentRevision}
                  </span>
                  <ButtonLink
                    to={`/clinician/sessions/${primaryClarificationSession.id}`}
                    variant="primary"
                    size="sm"
                    iconRight={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                  >
                    Inspect &amp; review {primaryClarificationSession.id}
                  </ButtonLink>
                </div>
              </Card>
            ) : (
              <Card
                tone="mint"
                padding="md"
                className="lg:col-span-7 flex items-center justify-between gap-4"
              >
                <div>
                  <h2 className="text-lg font-bold text-[#0d4026] font-display">
                    No open clarification blockers
                  </h2>
                  <p className="text-xs sm:text-sm text-[#495057]">
                    All drafted reports currently have their clinical clarification questions
                    resolved.
                  </p>
                </div>
                <StatusBadge tone="success">Clear</StatusBadge>
              </Card>
            )}

            {/* Right Column: Actionable Review & Pipeline Summary */}
            <Card padding="md" className="lg:col-span-5 flex flex-col justify-between gap-3.5">
              <div className="flex items-center justify-between border-b border-[#e4ece7] pb-2.5">
                <h2 className="text-base font-bold text-[#0d4026] font-display">
                  Actionable Queue Breakdown
                </h2>
                <Link
                  to="/clinician/sessions?status=attention"
                  className="text-xs font-bold text-[#00783c] hover:underline"
                >
                  Filter attention queue ({attentionSessions.length})
                </Link>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm">
                <li className="flex items-center justify-between gap-2">
                  <span className="text-[#242628] font-medium">
                    Drafts ready for approval ({needsReviewSessions.map((s) => s.id).join(', ') || 'None'})
                  </span>
                  <Link
                    to="/clinician/sessions?status=needs_review"
                    className="font-bold text-[#00783c] hover:underline shrink-0"
                  >
                    {needsReviewSessions.length} visits →
                  </Link>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-[#242628] font-medium">
                    Interrupted processing ({interruptedSessions.map((s) => s.id).join(', ') || 'None'})
                  </span>
                  <Link
                    to="/clinician/sessions?status=processing_interrupted"
                    className="font-bold text-[#9a4406] hover:underline shrink-0"
                  >
                    {interruptedSessions.length} visit →
                  </Link>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-[#242628] font-medium">
                    Finalized &amp; released today (
                    {releasedTodaySessions.map((s) => s.id).join(', ') || 'None'})
                  </span>
                  <Link
                    to="/clinician/sessions?status=released"
                    className="font-bold text-[#00783c] hover:underline shrink-0"
                  >
                    {releasedTodaySessions.length} visits →
                  </Link>
                </li>
              </ul>
            </Card>
          </section>

          {/* Today's Clinical Sessions Queue Table */}
          <section aria-label="Today's clinical queue" className="space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0d4026] font-display">
                  Today’s clinical sessions ({dashboardMetrics.referenceDateLabel}, 2026)
                </h2>
                <p className="text-xs sm:text-sm text-[#495057]">
                  Showing {displayedQueue.length} of {todaysSessions.length} encounters scheduled on{' '}
                  {referenceDate} for {currentUser.displayName}.
                </p>
              </div>

              {/* Interactive Queue Filter Pills */}
              <div
                role="tablist"
                aria-label="Filter today's clinical queue"
                className="flex flex-wrap items-center gap-1.5"
              >
                {(
                  [
                    {
                      id: 'all_today',
                      label: `All Today (${todaysSessions.length})`,
                    },
                    {
                      id: 'attention',
                      label: `Needs Attention (${attentionSessions.length})`,
                    },
                    {
                      id: 'needs_review',
                      label: `Needs Review (${needsReviewSessions.length})`,
                    },
                    {
                      id: 'clarification',
                      label: `Clarification (${clarificationSessions.length})`,
                    },
                    {
                      id: 'released_today',
                      label: `Released (${releasedTodaySessions.length})`,
                    },
                  ] as const
                ).map((tab) => {
                  const isSelected = activeQueueTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      type="button"
                      aria-selected={isSelected}
                      onClick={() => setActiveQueueTab(tab.id)}
                      className={[
                        'px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors cursor-pointer border',
                        isSelected
                          ? 'bg-[#02754b] text-white border-[#02754b]'
                          : 'bg-[#edf5f0] text-[#0d4026] border-[#cde0d4] hover:bg-[#dfeee5]',
                      ].join(' ')}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {displayedQueue.length === 0 ? (
              <Card padding="lg" className="text-center space-y-3">
                <p className="text-sm font-semibold text-[#0d4026]">
                  No clinical sessions match the selected dashboard filter.
                </p>
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveQueueTab('all_today')}
                  >
                    Show all today’s sessions
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="bg-white border border-[#056233]/30 rounded-[14px] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#edf5f0] border-b border-[#cde0d4] text-[11px] font-bold uppercase tracking-wider text-[#0d4026]">
                        <th className="py-3 px-4 hidden sm:table-cell">Encounter</th>
                        <th className="py-3 px-3 sm:px-4">Patient &amp; Visit Type</th>
                        <th className="py-3 px-4 hidden lg:table-cell">Department &amp; Symptom</th>
                        <th className="py-3 px-4 hidden md:table-cell">Audio Capture</th>
                        <th className="py-3 px-3 sm:px-4">Workflow Status</th>
                        <th className="py-3 px-3 sm:px-4 text-right">Next Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4ece7] text-sm">
                      {displayedQueue.map((session) => {
                        const derived = deriveSessionDisplayState(session);
                        const isPriority =
                          derived.code === 'CLARIFICATION_NEEDED' ||
                          derived.code === 'DRAFT_SAVED_NEEDS_CLARIFICATION';
                        return (
                          <tr
                            key={session.id}
                            className={
                              isPriority
                                ? 'bg-[#feede0]/45 hover:bg-[#feede0]/75 transition-colors'
                                : 'hover:bg-[#f7f8f8] transition-colors'
                            }
                          >
                            <td className="py-3.5 px-4 align-middle whitespace-nowrap hidden sm:table-cell">
                              <Link
                                to={`/clinician/sessions/${session.id}`}
                                className="font-mono text-xs font-bold text-[#00783c] hover:underline bg-[#edf5f0] border border-[#cde0d4] px-2 py-0.5 rounded inline-block"
                              >
                                {session.id}
                              </Link>
                              <div className="text-[11px] text-[#495057] mt-0.5 tabular-nums">
                                Updated {formatTimeShort(session.updatedAt)}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 align-middle">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Link
                                  to={`/clinician/sessions/${session.id}`}
                                  className="sm:hidden font-mono text-[10.5px] font-bold text-[#00783c] bg-[#edf5f0] border border-[#cde0d4] px-1.5 py-0.2 rounded"
                                >
                                  {session.id}
                                </Link>
                                <Link
                                  to={`/clinician/sessions/${session.id}`}
                                  className="font-bold text-[#0d4026] hover:text-[#00783c] hover:underline text-sm sm:text-[15px]"
                                >
                                  {session.patientName}
                                </Link>
                              </div>
                              <div className="text-xs text-[#495057]">{session.visitType}</div>
                            </td>
                            <td className="py-3.5 px-4 align-middle hidden lg:table-cell">
                              <div className="text-xs font-semibold text-[#242628]">
                                {DEPARTMENT_LABELS[session.department]}
                              </div>
                              <div className="text-xs text-[#495057]">
                                Symptom: <strong>{session.primarySymptom}</strong>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 align-middle hidden md:table-cell whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#242628] tabular-nums">
                                <Clock className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
                                <span>{formatDurationMmSs(session.capture.durationSeconds)}</span>
                              </div>
                              <div className="text-[11px] text-[#495057]">
                                {CAPTURE_ORIGIN_LABELS[session.capture.origin]}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 align-middle whitespace-nowrap">
                              <StatusBadge tone={derived.badgeTone}>
                                {derived.badgeLabel}
                              </StatusBadge>
                              {session.review.unresolvedClarificationCount > 0 && (
                                <div className="text-[11px] font-semibold text-[#9a4406] mt-1">
                                  {session.review.unresolvedClarificationCount} open prompts
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 align-middle text-right whitespace-nowrap">
                              <Link
                                to={`/clinician/sessions/${session.id}`}
                                aria-label={`${derived.nextStepLabel} for ${session.patientName} (${session.id})`}
                                className="inline-flex items-center gap-1 sm:gap-1.5 text-xs font-bold text-[#00783c] hover:text-[#0d4026] bg-[#edf5f0] hover:bg-[#dfeee5] px-2.5 sm:px-3 py-1.5 rounded-[8px] border border-[#cde0d4] transition-colors"
                              >
                                <span>{derived.nextStepLabel}</span>
                                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Recently Finalized & Released Sessions Section */}
          <section aria-label="Recently finalized and released sessions" className="space-y-3.5 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#0d4026] font-display">
                  Recently finalized &amp; released reports
                </h2>
                <p className="text-xs sm:text-sm text-[#495057]">
                  Completed SOAP and narrative summaries approved by {currentUser.displayName} across
                  today and prior clinic dates.
                </p>
              </div>
              <ButtonLink to="/clinician/sessions?status=released" variant="secondary" size="sm">
                View all released ({recentlyFinalizedSessions.length})
              </ButtonLink>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentlyFinalizedSessions.slice(0, 3).map((session) => (
                <Card
                  key={session.id}
                  padding="md"
                  className="flex flex-col justify-between gap-3 border-[#cde0d4]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#00783c] bg-[#edf5f0] px-2 py-0.5 rounded border border-[#cde0d4]">
                        {session.id}
                      </span>
                      <span className="text-xs text-[#495057] font-semibold">
                        {formatEncounterDateDisplay(session.encounterDate)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#0d4026] font-display">
                      {session.patientName} · {session.visitType}
                    </h3>
                    <p className="text-xs text-[#495057]">
                      {DEPARTMENT_LABELS[session.department]} · Revision v
                      {session.review.approvedRevision ?? session.review.currentRevision} approved
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#e4ece7] flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        session.release.status === 'released'
                          ? 'text-[#00783c]'
                          : 'text-[#9a4406]'
                      }`}
                    >
                      <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                      {session.release.status === 'released'
                        ? 'Released to patient'
                        : 'Approved · Pending release'}
                    </span>
                    <Link
                      to={`/clinician/sessions/${session.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0d4026] hover:text-[#00783c] underline underline-offset-4"
                    >
                      <span>
                        {session.release.status === 'released'
                          ? 'View report'
                          : 'Release to patient'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
