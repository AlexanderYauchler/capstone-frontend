import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Filter,
  Info,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useServices } from '../../app/providers/ServiceProvider';
import { defaultClinicClock } from '../../config/clock';
import { ANALYTICS_DIAGNOSIS_LABELS, formatMonthLabel } from '../../domain/analytics';
import type { AnalyticsFilterCriteria, AnalyticsSummaryResponse } from '../../domain/models';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { PageHeader } from '../../design-system/components/PageHeader';
import { StatCard, type StatComparison } from '../../design-system/components/StatCard';
import { BreakdownTable } from '../../design-system/components/charts/BreakdownTable';
import { ColumnChart } from '../../design-system/components/charts/ColumnChart';
import { LineChart } from '../../design-system/components/charts/LineChart';
import { ROLE_WORKSPACE_LABELS } from '../../design-system/layouts/Sidebar';
import {
  AGE_OPTIONS,
  DEPARTMENT_OPTIONS,
  DIAGNOSIS_OPTIONS,
  SEX_OPTIONS,
  STATUS_OPTIONS,
  criteriaFromSearchParams,
  criteriaToSearchParams,
} from './analytics-filters';

const REFERENCE_DATE = defaultClinicClock.referenceDate;

const FIELD_CLASS =
  'w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm text-[#242628]';
const LABEL_CLASS = 'block text-xs font-bold text-[#0d4026] mb-1';

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DATE_PRESETS: ReadonlyArray<{ id: string; label: string; from: () => string }> = [
  { id: '30', label: 'Last 30 days', from: () => addDays(REFERENCE_DATE, -29) },
  { id: '90', label: 'Last 3 months', from: () => `${addDays(REFERENCE_DATE, -95).slice(0, 7)}-01` },
  { id: 'ytd', label: 'Year to date', from: () => `${REFERENCE_DATE.slice(0, 4)}-01-01` },
];

function formatYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${formatMonthLabel(`${y}-${m}`).split(' ')[0]?.slice(0, 3)} ${Number(d)}, ${y}`;
}

// ----------------------------------------------------------------------------
// Filter panel (draft state; applies to the URL on submit)
// ----------------------------------------------------------------------------

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        className={FIELD_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

function AnalyticsFilterPanel({
  criteria,
  availableMonths,
  datasetRange,
  onApply,
  onReset,
}: {
  readonly criteria: AnalyticsFilterCriteria;
  readonly availableMonths: AnalyticsSummaryResponse['availableMonths'];
  readonly datasetRange: AnalyticsSummaryResponse['datasetDateRange'] | undefined;
  readonly onApply: (next: AnalyticsFilterCriteria) => void;
  readonly onReset: () => void;
}) {
  const [draft, setDraft] = useState<AnalyticsFilterCriteria>(criteria);
  const [error, setError] = useState<string | null>(null);
  const isMonthly = draft.view === 'monthly';
  const years = [...new Set(availableMonths.map((m) => m.monthKey.slice(0, 4)))];
  const draftYear = draft.monthKey.slice(0, 4);
  const monthsInYear = availableMonths.filter((m) => m.monthKey.startsWith(draftYear));

  const update = (patch: Partial<AnalyticsFilterCriteria>) => {
    setError(null);
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isMonthly && draft.dateFrom > draft.dateTo) {
      setError('The start date must be on or before the end date.');
      return;
    }
    onApply(draft);
  };

  const activePreset = DATE_PRESETS.find(
    (p) => p.from() === draft.dateFrom && draft.dateTo === REFERENCE_DATE,
  );

  // Less-used filters live in "More filters"; it opens by itself when one is applied.
  const moreFiltersApplied =
    (criteria.ageGroup !== 'all' ? 1 : 0) +
    (criteria.sex !== 'all' ? 1 : 0) +
    (criteria.view === 'monthly'
      ? criteria.reportStatus !== 'all'
        ? 1
        : 0
      : criteria.documentationStatus === 'all_statuses'
        ? 1
        : 0);

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Analytics filters"
      className="bg-white border border-[var(--color-border)] rounded-[14px] p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#0d4026] font-display">
          <Filter className="w-4 h-4 text-[#00783c]" aria-hidden="true" />
          Filters
        </h2>
        {!isMonthly && (
          <div role="group" aria-label="Quick date ranges" className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((p) => {
              const pressed = activePreset?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => update({ dateFrom: p.from(), dateTo: REFERENCE_DATE })}
                  className={[
                    'px-3 py-1.5 rounded-full text-sm font-semibold border cursor-pointer transition-colors',
                    pressed
                      ? 'bg-[#02754b] text-white border-[#02754b]'
                      : 'bg-white text-[#0d4026] border-[#cde0d4] hover:bg-[#edf5f0]',
                  ].join(' ')}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {isMonthly ? (
          <>
            <SelectField
              id="filter-year"
              label="Year"
              value={draftYear}
              onChange={(v) => {
                const firstInYear = availableMonths.find((m) => m.monthKey.startsWith(v));
                update({ monthKey: firstInYear?.monthKey ?? draft.monthKey });
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="filter-month"
              label="Month"
              value={draft.monthKey}
              onChange={(v) => update({ monthKey: v })}
            >
              {monthsInYear.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.label.split(' ')[0]}
                  {m.monthKey === REFERENCE_DATE.slice(0, 7) ? ' (in progress)' : ''}
                </option>
              ))}
            </SelectField>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="filter-from" className={LABEL_CLASS}>
                From
              </label>
              <input
                id="filter-from"
                type="date"
                className={FIELD_CLASS}
                min={datasetRange?.from}
                max={REFERENCE_DATE}
                value={draft.dateFrom}
                onChange={(e) => e.target.value && update({ dateFrom: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="filter-to" className={LABEL_CLASS}>
                To
              </label>
              <input
                id="filter-to"
                type="date"
                className={FIELD_CLASS}
                min={datasetRange?.from}
                max={REFERENCE_DATE}
                value={draft.dateTo}
                onChange={(e) => e.target.value && update({ dateTo: e.target.value })}
              />
            </div>
          </>
        )}

        <SelectField
          id="filter-diagnosis"
          label="Diagnosis category"
          value={draft.diagnosis}
          onChange={(v) => update({ diagnosis: v as AnalyticsFilterCriteria['diagnosis'] })}
        >
          <option value="all">All diagnoses</option>
          {DIAGNOSIS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="filter-department"
          label="Department"
          value={draft.department}
          onChange={(v) => update({ department: v as AnalyticsFilterCriteria['department'] })}
        >
          <option value="all">All departments</option>
          {DEPARTMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      </div>

      <details open={moreFiltersApplied > 0} className="group">
        <summary className="inline-flex items-center gap-1.5 cursor-pointer text-sm font-bold text-[#00783c] hover:text-[#0d4026] list-none">
          <ChevronRight
            className="w-4 h-4 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          More filters{moreFiltersApplied > 0 ? ` (${moreFiltersApplied} applied)` : ''}
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          <SelectField
            id="filter-age"
            label="Age group"
            value={draft.ageGroup}
            onChange={(v) => update({ ageGroup: v as AnalyticsFilterCriteria['ageGroup'] })}
          >
            <option value="all">All ages</option>
            {AGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="filter-sex"
            label="Sex"
            value={draft.sex}
            onChange={(v) => update({ sex: v as AnalyticsFilterCriteria['sex'] })}
          >
            <option value="all">All</option>
            {SEX_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>

          {isMonthly ? (
            <SelectField
              id="filter-status"
              label="Report status"
              value={draft.reportStatus}
              onChange={(v) => update({ reportStatus: v as AnalyticsFilterCriteria['reportStatus'] })}
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
          ) : (
            <div className="flex items-end sm:col-span-2">
              <label
                htmlFor="filter-docs"
                className="flex items-start gap-2 text-sm text-[#242628] cursor-pointer pb-1"
              >
                <input
                  id="filter-docs"
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 accent-[#00783c]"
                  checked={draft.documentationStatus === 'all_statuses'}
                  onChange={(e) =>
                    update({ documentationStatus: e.target.checked ? 'all_statuses' : 'verified_only' })
                  }
                />
                <span>Include visits still awaiting review (not yet privacy-verified)</span>
              </label>
            </div>
          )}
        </div>
      </details>

      {error && (
        <p role="alert" className="text-sm font-semibold text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2.5 border-t border-[#e4ece7] pt-4">
        <Button type="submit" variant="primary" size="sm">
          Apply filters
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconLeft={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
          onClick={onReset}
        >
          Reset
        </Button>
        <span className="text-sm text-[#495057]">
          Every chart and number below updates when you apply.
        </span>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export function AnalyticsPage() {
  const services = useServices();
  const { currentUser } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const criteria = criteriaFromSearchParams(searchParams, REFERENCE_DATE);
  const isMonthly = criteria.view === 'monthly';
  const basePath = location.pathname;

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['analytics-summary', criteria],
    queryFn: () => services.analytics.getAggregateSummary(criteria),
    placeholderData: keepPreviousData,
  });

  const applyCriteria = (next: AnalyticsFilterCriteria) => {
    setSearchParams(criteriaToSearchParams(next, REFERENCE_DATE));
  };
  const resetFilters = () => setSearchParams(new URLSearchParams({ view: criteria.view }));

  const activeChips: Array<{ label: string; clear: Partial<AnalyticsFilterCriteria> }> = [];
  if (criteria.diagnosis !== 'all')
    activeChips.push({ label: `Diagnosis: ${ANALYTICS_DIAGNOSIS_LABELS[criteria.diagnosis]}`, clear: { diagnosis: 'all' } });
  if (criteria.department !== 'all')
    activeChips.push({
      label: `Department: ${DEPARTMENT_OPTIONS.find((o) => o.value === criteria.department)?.label}`,
      clear: { department: 'all' },
    });
  if (criteria.ageGroup !== 'all')
    activeChips.push({ label: `Age: ${AGE_OPTIONS.find((o) => o.value === criteria.ageGroup)?.label}`, clear: { ageGroup: 'all' } });
  if (criteria.sex !== 'all')
    activeChips.push({ label: `Sex: ${SEX_OPTIONS.find((o) => o.value === criteria.sex)?.label}`, clear: { sex: 'all' } });
  if (isMonthly && criteria.reportStatus !== 'all')
    activeChips.push({
      label: `Status: ${STATUS_OPTIONS.find((o) => o.value === criteria.reportStatus)?.label}`,
      clear: { reportStatus: 'all' },
    });
  if (!isMonthly && criteria.documentationStatus === 'all_statuses')
    activeChips.push({ label: 'Including unverified visits', clear: { documentationStatus: 'verified_only' } });

  const monthIndex = data?.availableMonths.findIndex((m) => m.monthKey === criteria.monthKey) ?? -1;
  const goToMonth = (offset: number) => {
    const target = data?.availableMonths[monthIndex + offset];
    if (target) applyCriteria({ ...criteria, monthKey: target.monthKey });
  };

  const scopeSummary = isMonthly
    ? `${formatMonthLabel(criteria.monthKey)}${criteria.monthKey === REFERENCE_DATE.slice(0, 7) ? ` (through ${formatYmd(REFERENCE_DATE)})` : ''}`
    : `${formatYmd(criteria.dateFrom)} to ${formatYmd(criteria.dateTo)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: ROLE_WORKSPACE_LABELS[currentUser.role], to: currentUser.role === 'clinician' ? '/clinician/dashboard' : undefined },
          { label: 'Healthcare analytics' },
        ]}
        title={isMonthly ? 'Monthly documentation analytics' : 'Healthcare analytics'}
        description={
          isMonthly
            ? 'Operational view: how many visits were documented each month, how many reports are complete, and how long review takes.'
            : 'Population view: patterns across de-identified visits, such as common symptoms, diagnoses, and age groups.'
        }
      />

      {/* View switch */}
      <nav aria-label="Analytics views" className="flex flex-wrap items-center gap-2">
        {(
          [
            { view: 'cohort', label: 'Patient population overview', icon: <BarChart3 className="w-4 h-4" aria-hidden="true" /> },
            { view: 'monthly', label: 'Monthly operations', icon: <CalendarRange className="w-4 h-4" aria-hidden="true" /> },
          ] as const
        ).map((tab) => {
          const active = criteria.view === tab.view;
          const params = criteriaToSearchParams({ ...criteria, view: tab.view }, REFERENCE_DATE);
          return (
            <Link
              key={tab.view}
              to={`${basePath}?${params.toString()}`}
              aria-current={active ? 'page' : undefined}
              className={[
                'inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-bold border transition-colors',
                active
                  ? 'bg-[#02754b] text-white border-[#02754b]'
                  : 'bg-white text-[#0d4026] border-[#cde0d4] hover:bg-[#edf5f0]',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <AnalyticsFilterPanel
        key={searchParams.toString()}
        criteria={criteria}
        availableMonths={data?.availableMonths ?? []}
        datasetRange={data?.datasetDateRange}
        onApply={applyCriteria}
        onReset={resetFilters}
      />

      {/* Selected filter indicators */}
      <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
        <span className="font-bold text-[#0d4026]">Showing:</span>
        <span className="px-2.5 py-1 rounded-full bg-white border border-[#cde0d4] text-[#242628] font-semibold">
          {scopeSummary}
        </span>
        {activeChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => applyCriteria({ ...criteria, ...chip.clear })}
            aria-label={`Remove filter ${chip.label}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#02754b] text-white font-semibold hover:bg-[#056233] cursor-pointer"
          >
            {chip.label}
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        ))}
        {activeChips.length === 0 && <span className="text-[#495057]">No other filters</span>}
        {isFetching && !isLoading && (
          <span className="inline-flex items-center gap-1 text-[#00783c] font-semibold">
            <RefreshCw className="w-3 h-3 motion-safe:animate-spin" aria-hidden="true" /> Updating…
          </span>
        )}
      </div>

      {isLoading && (
        <Card padding="lg" role="status" className="text-center text-sm font-bold text-[#00783c]">
          Loading analytics…
        </Card>
      )}

      {isError && (
        <Card tone="peach" padding="md" role="alert" className="space-y-2">
          <p className="font-bold text-[#0d4026]">Analytics could not be loaded</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unexpected error.'}</p>
          <Button size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </Card>
      )}

      {data && (
        <div className={`space-y-6 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {isMonthly ? (
            <MonthlyView
              data={data}
              hasPrev={monthIndex > 0}
              hasNext={monthIndex >= 0 && monthIndex < data.availableMonths.length - 1}
              onPrev={() => goToMonth(-1)}
              onNext={() => goToMonth(1)}
              onReset={resetFilters}
            />
          ) : (
            <OverviewView data={data} onReset={resetFilters} />
          )}

          <Card tone="mint" padding="sm" className="text-xs text-[#242628] flex items-start gap-2">
            <Info className="w-4 h-4 text-[#00783c] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              All figures come from {data.datasetRecordCount.toLocaleString()} fictional, de-identified
              visit records ({formatYmd(data.datasetDateRange.from)} to{' '}
              {formatYmd(data.datasetDateRange.to)}) generated for this demonstration. They are not
              real patient data and do not support clinical conclusions. {data.suppressedRareCombinationsNote}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

/** Builds a plain-language month-over-month comparison; arrows and words carry the meaning, not colour alone. */
function compareCounts(
  current: number,
  previous: number,
  previousName: string,
  goodDirection: 'up' | 'down' | 'neither',
  upWord: string,
  downWord: string,
): StatComparison {
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return { direction: 'flat', text: `Same as ${previousName}`, tone: 'neutral' };
  const direction = diff > 0 ? 'up' : 'down';
  const tone = goodDirection === 'neither' ? 'neutral' : direction === goodDirection ? 'good' : 'bad';
  return { direction, text: `${Math.abs(diff)} ${diff > 0 ? upWord : downWord} than ${previousName}`, tone };
}

function EmptyState({ message, onReset }: { readonly message: string; readonly onReset: () => void }) {
  return (
    <Card padding="lg" className="text-center space-y-3">
      <p className="text-base font-bold text-[#0d4026]">No visits match these filters</p>
      <p className="text-sm text-[#495057]">{message}</p>
      <Button variant="secondary" size="sm" onClick={onReset}>
        Reset filters
      </Button>
    </Card>
  );
}

function OverviewView({ data, onReset }: { readonly data: AnalyticsSummaryResponse; readonly onReset: () => void }) {
  if (data.verifiedVisitsCount === 0) {
    return <EmptyState message="Try a wider date range or remove a filter." onReset={onReset} />;
  }
  if (data.isCohortSuppressed) {
    return (
      <EmptyState
        message="Fewer than 5 visits match, so results are hidden to protect patient privacy. Widen the filters to see results."
        onReset={onReset}
      />
    );
  }
  const granularity =
    data.weeklyVisitTrends.length > 20 ||
    data.weeklyVisitTrends.some((w) => /^[A-Z][a-z]{2}$/.test(w.weekLabel))
      ? 'month'
      : 'week';

  return (
    <>
      <section aria-label="Population summary" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Visits in this view"
          value={data.verifiedVisitsCount.toLocaleString()}
          subtitle={
            data.criteria.documentationStatus === 'verified_only'
              ? 'Completed, privacy-verified visits'
              : 'All visits, including those awaiting review'
          }
          icon={<Users className="w-4 h-4" aria-hidden="true" />}
        />
        <StatCard
          label="Follow-up documented"
          value={
            data.followUpDocumented.isSuppressed
              ? data.followUpDocumented.displayLabel
              : `${data.followUpDocumented.percentage ?? 0}%`
          }
          subtitle={
            data.followUpDocumented.isSuppressed
              ? 'Hidden for privacy'
              : `${data.followUpDocumented.count} of ${data.verifiedVisitsCount} visits`
          }
          icon={<ClipboardList className="w-4 h-4" aria-hidden="true" />}
          accent="deep"
        />
        <StatCard
          label="Most common symptom"
          value={data.topSymptom?.symptom ?? '—'}
          subtitle={
            data.topSymptom && !data.topSymptom.metric.isSuppressed
              ? `${data.topSymptom.metric.count} visits (${data.topSymptom.metric.percentage}%)`
              : 'Not enough data'
          }
          icon={<Stethoscope className="w-4 h-4" aria-hidden="true" />}
          accent="orange"
        />
      </section>

      <ColumnChart
        title="Visits over time"
        description={`Visits per ${granularity} in the selected dates. Periods with fewer than 5 visits are hidden to protect privacy.`}
        data={data.weeklyVisitTrends.map((w) => ({ label: w.weekLabel, value: w.metric.isSuppressed ? null : w.metric.count }))}
        yAxisLabel="Visits"
        xAxisLabel={granularity === 'month' ? 'Month' : 'Week starting'}
        unit="visits"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BreakdownTable
          title="Primary symptom"
          description="Share of visits by the main symptom recorded."
          rows={data.symptomDistribution.map((s) => ({ key: s.symptom, label: s.symptom, metric: s.metric }))}
          totalLabel="Visits (%)"
          sortByValue
        />
        <BreakdownTable
          title="Diagnosis category"
          description="Share of visits by diagnosis category."
          rows={data.diagnosisBreakdown}
          totalLabel="Visits (%)"
          sortByValue
        />
        <BreakdownTable
          title="Age group"
          description="Generalized age bands only (no birth dates are stored)."
          rows={data.ageGroupBreakdown}
          totalLabel="Visits (%)"
        />
        <BreakdownTable
          title="Sex"
          description="As recorded in the synthetic record."
          rows={data.sexBreakdown}
          totalLabel="Visits (%)"
        />
      </div>
    </>
  );
}

function MonthlyView({
  data,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onReset,
}: {
  readonly data: AnalyticsSummaryResponse;
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onReset: () => void;
}) {
  const k = data.monthlyKpis;
  const highlightIndex = data.monthlyTrend.findIndex((p) => p.monthKey === k.monthKey);
  const isCurrentMonth = k.monthKey === REFERENCE_DATE.slice(0, 7);

  // Compare with the month before, except for a month still in progress (it would look artificially low).
  const rowIndex = data.monthlyOperations.findIndex((r) => r.monthKey === k.monthKey);
  const prev = rowIndex > 0 ? data.monthlyOperations[rowIndex - 1] : undefined;
  const prevName = prev?.monthLabel.split(' ')[0] ?? '';
  const canCompare = !isCurrentMonth && prev !== undefined && prev.sessionsCreated > 0;
  const prevRate = prev && prev.sessionsCreated > 0 ? Math.round((prev.finalizedReports / prev.sessionsCreated) * 100) : null;
  const prevMedianSeconds = prev?.medianReviewDurationSeconds ?? null;
  const prevMedianMin = prevMedianSeconds === null ? null : Math.round(prevMedianSeconds / 6) / 10;
  const currMedianMin = k.medianReviewMinutes === null ? null : Math.round(k.medianReviewMinutes * 10) / 10;

  const sessionsCmp = canCompare && prev ? compareCounts(k.totalSessions, prev.sessionsCreated, prevName, 'neither', 'more', 'fewer') : undefined;
  const completedCmp = canCompare && prev ? compareCounts(k.completedReports, prev.finalizedReports, prevName, 'up', 'more', 'fewer') : undefined;
  const awaitingCmp = canCompare && prev ? compareCounts(k.awaitingReview, prev.pendingReviewsAtPeriodEnd, prevName, 'down', 'more', 'fewer') : undefined;
  const rateCmp =
    canCompare && k.completionRatePct !== null && prevRate !== null
      ? compareCounts(k.completionRatePct, prevRate, prevName, 'up', 'points higher', 'points lower')
      : undefined;
  const reviewCmp =
    canCompare && currMedianMin !== null && prevMedianMin !== null
      ? compareCounts(currMedianMin, prevMedianMin, prevName, 'down', 'min slower', 'min faster')
      : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[#0d4026] font-display">
          {k.monthLabel}
          {isCurrentMonth && <span className="text-sm font-semibold text-[#495057]"> · month in progress</span>}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={!hasPrev} onClick={onPrev} iconLeft={<ChevronLeft className="w-4 h-4" aria-hidden="true" />}>
            Previous month
          </Button>
          <Button variant="secondary" size="sm" disabled={!hasNext} onClick={onNext} iconRight={<ChevronRight className="w-4 h-4" aria-hidden="true" />}>
            Next month
          </Button>
        </div>
      </div>

      {k.totalSessions > 0 && (
        <p className="text-[15px] text-[#242628] leading-relaxed max-w-[68ch]">
          {k.totalSessions} {k.totalSessions === 1 ? 'session was' : 'sessions were'} recorded.{' '}
          {k.completedReports} {k.completedReports === 1 ? 'report has' : 'reports have'} been
          approved
          {k.completionRatePct !== null ? ` (${k.completionRatePct}%)` : ''} and {k.awaitingReview}{' '}
          {k.awaitingReview === 1 ? 'is' : 'are'} waiting for review.
          {isCurrentMonth
            ? ' This month is still in progress, so it is not compared with earlier months.'
            : prev
              ? ` Changes below are compared with ${prevName}.`
              : ''}
        </p>
      )}

      {k.totalSessions === 0 ? (
        <EmptyState message="No visits were recorded for this month with the current filters." onReset={onReset} />
      ) : (
        <section aria-label={`KPIs for ${k.monthLabel}`} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard label="Clinical sessions" value={k.totalSessions} subtitle="Visits recorded this month" icon={<Activity className="w-4 h-4" aria-hidden="true" />} comparison={sessionsCmp} />
          <StatCard label="Completed reports" value={k.completedReports} subtitle="Approved by a clinician" icon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />} accent="deep" comparison={completedCmp} />
          <StatCard label="Awaiting review" value={k.awaitingReview} subtitle="Draft not yet approved" icon={<ClipboardList className="w-4 h-4" aria-hidden="true" />} accent="orange" comparison={awaitingCmp} />
          <StatCard
            label="Completion rate"
            value={k.completionRatePct === null ? '—' : `${k.completionRatePct}%`}
            subtitle="Reports approved out of all sessions"
            icon={<ShieldCheck className="w-4 h-4" aria-hidden="true" />}
            comparison={rateCmp}
          />
          <StatCard
            label="Median review time"
            value={k.medianReviewMinutes === null ? '—' : `${k.medianReviewMinutes} min`}
            subtitle="Typical clinician time to approve"
            icon={<Clock className="w-4 h-4" aria-hidden="true" />}
            accent="deep"
            comparison={reviewCmp}
          />
        </section>
      )}

      <LineChart
        title="Month-by-month trend"
        description={`Sessions recorded each month, and how many reports are still waiting for review. The selected month is shaded. ${formatMonthLabel(REFERENCE_DATE.slice(0, 7)).split(' ')[0]} is in progress (through ${formatYmd(REFERENCE_DATE)}).`}
        categories={data.monthlyTrend.map((p) =>
          p.monthKey === REFERENCE_DATE.slice(0, 7) ? `${p.shortLabel} (to date)` : p.shortLabel,
        )}
        series={[
          { name: 'Clinical sessions', color: 'var(--chart-series-1)', values: data.monthlyTrend.map((p) => p.totalSessions) },
          { name: 'Awaiting review', color: 'var(--chart-series-2)', dashed: true, values: data.monthlyTrend.map((p) => p.awaitingReview) },
        ]}
        yAxisLabel="Count"
        xAxisLabel={`Month (${data.monthlyTrend[0]?.monthKey.slice(0, 4) ?? ''})`}
        unit="visits"
        highlightIndex={highlightIndex}
      />

      <ColumnChart
        title={`Sessions by diagnosis, ${k.monthLabel}`}
        description="How many sessions were recorded in the selected month for each diagnosis."
        data={data.monthlyDiagnosisCounts.map((d) => ({ label: d.label, value: d.count }))}
        yAxisLabel="Sessions"
        xAxisLabel="Diagnosis category"
        unit="sessions"
      />

      <Card padding="none" className="overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-lg font-bold text-[#0d4026] font-display">Month-by-month operations</h3>
          <p className="text-sm text-[#495057]">Counts of sessions and reports, not population statistics. The selected month is highlighted.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px] text-left border-collapse">
            <caption className="sr-only">Monthly operations table</caption>
            <thead>
              <tr className="bg-[#edf5f0] text-xs text-[#0d4026]">
                <th scope="col" className="py-2.5 px-4">Month</th>
                <th scope="col" className="py-2.5 px-4 text-right">Sessions</th>
                <th scope="col" className="py-2.5 px-4 text-right">Completed</th>
                <th scope="col" className="py-2.5 px-4 text-right">Awaiting review at month end</th>
                <th scope="col" className="py-2.5 px-4 text-right">Released to patients</th>
                <th scope="col" className="py-2.5 px-4 text-right">Median review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4ece7]">
              {data.monthlyOperations.map((row) => {
                const selected = row.monthKey === k.monthKey;
                return (
                  <tr key={row.monthKey} className={selected ? 'bg-[#edf5f0] font-bold' : ''} aria-current={selected ? 'true' : undefined}>
                    <th scope="row" className="py-2 px-4 text-left font-semibold">{row.monthLabel}</th>
                    <td className="py-2 px-4 text-right tabular-nums">{row.sessionsCreated}</td>
                    <td className="py-2 px-4 text-right tabular-nums">{row.finalizedReports}</td>
                    <td className="py-2 px-4 text-right tabular-nums">{row.pendingReviewsAtPeriodEnd}</td>
                    <td className="py-2 px-4 text-right tabular-nums">{row.releasedReports}</td>
                    <td className="py-2 px-4 text-right tabular-nums">
                      {row.medianReviewDurationSeconds === null ? '—' : `${Math.round(row.medianReviewDurationSeconds / 6) / 10} min`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
