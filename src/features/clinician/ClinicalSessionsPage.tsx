import { Link, useLocation, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpDown,
  Calendar,
  Clock,
  Filter,
  Mic,
  RefreshCw,
  RotateCcw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useServices } from '../../app/providers/ServiceProvider';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { ROLE_WORKSPACE_LABELS } from '../../design-system/layouts/Sidebar';
import { deriveSessionDisplayState } from '../../domain/state-machines';
import {
  CAPTURE_ORIGIN_LABELS,
  DEPARTMENT_LABELS,
  formatDurationMmSs,
  formatEncounterDateDisplay,
  formatTimeShort,
  getSessionPriorityWeight,
} from './session-formatters';

export type SessionSortKey =
  | 'updated_desc'
  | 'updated_asc'
  | 'priority'
  | 'patient_asc'
  | 'duration_desc';

const VALID_STATUS_FILTERS = [
  'all',
  'attention',
  'clarification_needed',
  'needs_review',
  'processing',
  'processing_interrupted',
  'released',
] as const;

export type SessionStatusFilterKey = (typeof VALID_STATUS_FILTERS)[number];

const STATUS_FILTER_OPTIONS: readonly {
  readonly value: SessionStatusFilterKey;
  readonly label: string;
}[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'attention', label: 'All needing clinician attention' },
  { value: 'clarification_needed', label: 'Clarification needed' },
  { value: 'needs_review', label: 'Needs review (Ready for sign-off)' },
  { value: 'processing', label: 'Processing in pipeline' },
  { value: 'processing_interrupted', label: 'Processing interrupted' },
  { value: 'released', label: 'Approved & released' },
];

const ENCOUNTER_DATE_OPTIONS: readonly {
  readonly value: string;
  readonly label: string;
}[] = [
  { value: 'all', label: 'All encounter dates' },
  { value: '2026-10-06', label: 'Oct 6, 2026 (Today)' },
  { value: '2026-09-18', label: 'Sep 18, 2026' },
  { value: '2026-08-02', label: 'Aug 2, 2026' },
];

const SORT_OPTIONS: readonly {
  readonly value: SessionSortKey;
  readonly label: string;
}[] = [
  { value: 'updated_desc', label: 'Latest activity first' },
  { value: 'priority', label: 'Clinical priority (Clarifications first)' },
  { value: 'patient_asc', label: 'Patient name (A–Z)' },
  { value: 'duration_desc', label: 'Recording duration (Longest first)' },
  { value: 'updated_asc', label: 'Oldest activity first' },
];

function parseStatusFilter(val: string | null): SessionStatusFilterKey {
  if (val && (VALID_STATUS_FILTERS as readonly string[]).includes(val)) {
    return val as SessionStatusFilterKey;
  }
  return 'all';
}

function parseSortKey(val: string | null): SessionSortKey {
  const valid: readonly SessionSortKey[] = [
    'updated_desc',
    'updated_asc',
    'priority',
    'patient_asc',
    'duration_desc',
  ];
  if (val && (valid as readonly string[]).includes(val)) {
    return val as SessionSortKey;
  }
  return 'updated_desc';
}

export function ClinicalSessionsPage() {
  const services = useServices();
  const { currentUser } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryText = searchParams.get('q') ?? '';
  const statusFilter = parseStatusFilter(searchParams.get('status'));
  const encounterDate = searchParams.get('date') ?? 'all';
  const sortBy = parseSortKey(searchParams.get('sort'));

  const updateUrlParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (!v || v === 'all' || (k === 'sort' && v === 'updated_desc') || (k === 'q' && v === '')) {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    setSearchParams(next, { replace: true });
  };

  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const {
    data: filteredSessions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['clinical-sessions-list', queryText, statusFilter, encounterDate],
    queryFn: () =>
      services.sessions.listSessions({
        query: queryText,
        statusFilter,
        encounterDate,
      }),
  });

  const { data: totalSessionsList } = useQuery({
    queryKey: ['clinical-sessions-unfiltered-total'],
    queryFn: () => services.sessions.listSessions(),
  });

  const sortedSessions = [...(filteredSessions ?? [])].sort((a, b) => {
    switch (sortBy) {
      case 'priority': {
        const diff = getSessionPriorityWeight(a) - getSessionPriorityWeight(b);
        if (diff !== 0) return diff;
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      case 'patient_asc': {
        const nameCmp = a.patientName.localeCompare(b.patientName);
        if (nameCmp !== 0) return nameCmp;
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      case 'duration_desc':
        return b.capture.durationSeconds - a.capture.durationSeconds;
      case 'updated_asc':
        return a.updatedAt.localeCompare(b.updatedAt);
      case 'updated_desc':
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });

  const hasActiveFilters =
    queryText.trim().length > 0 ||
    statusFilter !== 'all' ||
    encounterDate !== 'all' ||
    sortBy !== 'updated_desc';

  const totalCount = totalSessionsList?.length ?? sortedSessions.length;

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
          <Link
            to="/clinician/dashboard"
            className="text-[#00783c] hover:underline font-semibold"
          >
            {ROLE_WORKSPACE_LABELS[currentUser.role]}
          </Link>
          <span aria-hidden="true" className="text-[#495057]">
            ›
          </span>
          <span className="font-bold text-[#242628]">Clinical sessions</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#495057]">
          <span className="font-semibold text-[#0d4026]">{currentUser.displayName}</span>
          <span>·</span>
          <span>{currentUser.title}</span>
        </div>
      </nav>

      {/* Compact Parkview Emerald Header */}
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
              <span>Session Management Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-bold text-white leading-tight font-display">
              Clinical sessions
            </h1>
            <p className="text-sm sm:text-[15px] text-white/95 leading-relaxed">
              Follow each visit from recording through review and patient release. Search, filter,
              and sort across today’s schedule and historical records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <ButtonLink
              to="/clinician/sessions/new"
              variant="heroDark"
              size="md"
              iconLeft={<Mic className="w-4 h-4 text-[#7dc242]" aria-hidden="true" />}
            >
              Start a clinical visit
            </ButtonLink>
            <ButtonLink
              to="/clinician/sessions/upload"
              variant="secondary"
              size="md"
              iconLeft={<Upload className="w-4 h-4 text-[#00783c]" aria-hidden="true" />}
            >
              Upload recording
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Search, Filter & Sort Controls Card */}
      <Card padding="md" className="space-y-4 border-[#056233]/30">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          {/* Search Input */}
          <div className="md:col-span-4 space-y-1.5">
            <label
              htmlFor="session-search-input"
              className="block text-xs font-bold uppercase tracking-wider text-[#0d4026]"
            >
              Search sessions
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-[#00783c] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="session-search-input"
                type="search"
                value={queryText}
                onChange={(e) => updateUrlParam({ q: e.target.value })}
                placeholder="Search ID (CS-1042), patient, visit type, symptom…"
                className="w-full h-10 pl-9 pr-8 rounded-[8px] border border-[#056233]/40 bg-white text-sm text-[#242628] placeholder:text-[#495057]/75 focus:outline-2 focus:outline-[#02754b]"
              />
              {queryText && (
                <button
                  type="button"
                  onClick={() => updateUrlParam({ q: null })}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#495057] hover:text-[#0d4026] cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Select */}
          <div className="md:col-span-3 space-y-1.5">
            <label
              htmlFor="session-status-filter"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0d4026]"
            >
              <Filter className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
              <span>Workflow status</span>
            </label>
            <select
              id="session-status-filter"
              value={statusFilter}
              onChange={(e) => updateUrlParam({ status: e.target.value })}
              className="w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm font-medium text-[#242628] focus:outline-2 focus:outline-[#02754b]"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Encounter Date Filter Select */}
          <div className="md:col-span-2 space-y-1.5">
            <label
              htmlFor="session-date-filter"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0d4026]"
            >
              <Calendar className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
              <span>Encounter date</span>
            </label>
            <select
              id="session-date-filter"
              value={encounterDate}
              onChange={(e) => updateUrlParam({ date: e.target.value })}
              className="w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm font-medium text-[#242628] focus:outline-2 focus:outline-[#02754b]"
            >
              {ENCOUNTER_DATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Select */}
          <div className="md:col-span-3 space-y-1.5">
            <label
              htmlFor="session-sort-select"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0d4026]"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
              <span>Sort by</span>
            </label>
            <select
              id="session-sort-select"
              value={sortBy}
              onChange={(e) => updateUrlParam({ sort: e.target.value })}
              className="w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm font-medium text-[#242628] focus:outline-2 focus:outline-[#02754b]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Status Filter Pills + Active Result Count */}
        <div className="pt-3 border-t border-[#e4ece7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Quick status filters"
            className="flex flex-wrap items-center gap-1.5"
          >
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'attention', label: 'Needs attention' },
                { value: 'clarification_needed', label: 'Clarification needed' },
                { value: 'needs_review', label: 'Needs review' },
                { value: 'processing', label: 'Processing' },
                { value: 'processing_interrupted', label: 'Interrupted' },
                { value: 'released', label: 'Released' },
              ] as const
            ).map((pill) => {
              const active = statusFilter === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateUrlParam({ status: pill.value })}
                  className={[
                    'px-2.5 py-1 rounded-[7px] text-xs font-bold transition-colors cursor-pointer border',
                    active
                      ? 'bg-[#02754b] text-white border-[#02754b]'
                      : 'bg-[#edf5f0] text-[#0d4026] border-[#cde0d4] hover:bg-[#dfeee5]',
                  ].join(' ')}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[#495057] shrink-0">
            <span role="status" aria-live="polite" className="font-semibold text-[#0d4026]">
              Showing {sortedSessions.length} of {totalCount} sessions
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 font-bold text-[#9a4406] hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear filters</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card padding="lg" role="status" aria-live="polite" className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#00783c]">
            <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Loading clinical sessions directory…</span>
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
                Unable to load clinical sessions
              </h2>
              <p className="text-xs sm:text-sm text-[#242628] mt-1">
                {error instanceof Error
                  ? error.message
                  : 'An unexpected error occurred while fetching sessions.'}
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && sortedSessions.length === 0 && (
        <Card padding="lg" className="text-center space-y-3 py-10">
          <h2 className="text-lg font-bold text-[#0d4026] font-display">
            No clinical sessions match your search or filters
          </h2>
          <p className="text-xs sm:text-sm text-[#495057] max-w-md mx-auto">
            Try clearing the search query{' '}
            {queryText ? (
              <strong className="text-[#0d4026]">&ldquo;{queryText}&rdquo;</strong>
            ) : null}{' '}
            or selecting &ldquo;All statuses&rdquo; and &ldquo;All encounter dates&rdquo; to view
            the full clinical directory.
          </p>
          <div className="pt-1">
            <Button
              variant="primary"
              size="sm"
              iconLeft={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={resetAllFilters}
            >
              Reset search &amp; filters
            </Button>
          </div>
        </Card>
      )}

      {/* Sessions Table */}
      {!isLoading && !isError && sortedSessions.length > 0 && (
        <div className="bg-white border border-[#056233]/30 rounded-[14px] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Clinical sessions directory">
              <thead>
                <tr className="bg-[#edf5f0] border-b border-[#cde0d4] text-[11px] font-bold uppercase tracking-wider text-[#0d4026]">
                  <th className="py-3 px-4 hidden sm:table-cell">Session &amp; Date</th>
                  <th className="py-3 px-3 sm:px-4">Patient &amp; Visit Type</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Department &amp; Symptom</th>
                  <th className="py-3 px-4 hidden md:table-cell">Audio Capture</th>
                  <th className="py-3 px-3 sm:px-4">Lifecycle Status</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4ece7] text-sm">
                {sortedSessions.map((session) => {
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
                          state={{ fromSessionsSearch: location.search }}
                          className="font-mono text-xs font-bold text-[#00783c] hover:underline bg-[#edf5f0] border border-[#cde0d4] px-2 py-0.5 rounded inline-block"
                        >
                          {session.id}
                        </Link>
                        <div className="text-[11px] text-[#495057] mt-0.5 tabular-nums">
                          {session.encounterDate} · {formatTimeShort(session.updatedAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            to={`/clinician/sessions/${session.id}`}
                            state={{ fromSessionsSearch: location.search }}
                            className="sm:hidden font-mono text-[10.5px] font-bold text-[#00783c] bg-[#edf5f0] border border-[#cde0d4] px-1.5 py-0.2 rounded"
                          >
                            {session.id}
                          </Link>
                          <Link
                            to={`/clinician/sessions/${session.id}`}
                            state={{ fromSessionsSearch: location.search }}
                            className="font-bold text-[#0d4026] hover:text-[#00783c] hover:underline text-sm sm:text-[15px]"
                          >
                            {session.patientName}
                          </Link>
                        </div>
                        <div className="text-xs text-[#495057]">
                          {session.visitType}
                          <span className="sm:hidden">
                            {' '}
                            · {formatEncounterDateDisplay(session.encounterDate)}
                          </span>
                        </div>
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
                        <StatusBadge tone={derived.badgeTone}>{derived.badgeLabel}</StatusBadge>
                        {session.review.unresolvedClarificationCount > 0 && (
                          <div className="text-[11px] font-semibold text-[#9a4406] mt-1">
                            {session.review.unresolvedClarificationCount} open prompts
                          </div>
                        )}
                        {session.processing.status === 'failed_retryable' && (
                          <div className="text-[11px] font-semibold text-[var(--color-danger)] mt-1">
                            Stage: {session.processing.failedStage?.replace(/_/g, ' ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 align-middle text-right whitespace-nowrap">
                        <Link
                          to={`/clinician/sessions/${session.id}`}
                          state={{ fromSessionsSearch: location.search }}
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
    </div>
  );
}
