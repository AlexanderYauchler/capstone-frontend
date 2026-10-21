import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Lock,
  PhoneCall,
  Pill,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  TestTube2,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useServices } from '../../app/providers/ServiceProvider';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { ParkviewSubNav, ROLE_WORKSPACE_LABELS } from '../../design-system/layouts/Sidebar';
import {
  DEPARTMENT_LABELS,
  formatEncounterDateDisplay,
  formatTimeShort,
} from '../clinician/session-formatters';

export function PatientReportDetailPage() {
  const { reportId = '' } = useParams<{ reportId: string }>();
  const services = useServices();
  const { currentUser } = useAuth();
  const patientId = currentUser.linkedPatientId ?? 'pat-alex-morgan';

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['patient-released-report-detail', patientId, reportId],
    queryFn: () => services.patientPortal.getReleasedReportDetail(patientId, reportId),
    enabled: reportId.trim().length > 0,
    retry: false,
  });

  if (isLoading) {
    return (
      <Card padding="lg" role="status" aria-live="polite" className="text-center space-y-2 my-6">
        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#00783c]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>Loading released visit report {reportId}…</span>
        </div>
      </Card>
    );
  }

  if (isError || !detail) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'The requested clinical report is either still under clinician review, belongs to another patient, or does not exist.';

    return (
      <div className="max-w-2xl mx-auto py-8 space-y-4">
        <Card
          tone="peach"
          padding="lg"
          role="alert"
          className="border-l-4 border-l-[var(--color-danger)] space-y-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#9a4406] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9a4406]">
                Patient Portal Access &amp; Release Guard
              </p>
              <h1 className="text-2xl font-bold text-[#0d4026] font-display">
                Report {reportId || 'Requested'} is not available in your portal
              </h1>
              <p className="text-sm text-[#242628] leading-relaxed">{errorMessage}</p>
              <p className="text-xs text-[#495057] leading-relaxed">
                For your clinical safety and privacy, unapproved AI drafts, clarification-blocked
                encounters, and records belonging to other patients are never accessible in the
                Patient Portal.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#e4ece7]">
            <ButtonLink
              to="/patient/reports"
              variant="primary"
              size="sm"
              iconLeft={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
            >
              Back to My medical reports
            </ButtonLink>
            <ButtonLink to="/patient" variant="secondary" size="sm">
              Patient Portal Home
            </ButtonLink>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Retry Check
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { session, report } = detail;
  const releasedRevision = session.release.releasedRevision ?? report.currentRevision;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Back Navigation Row */}
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
          <Link to="/patient/reports" className="text-[#00783c] hover:underline font-semibold">
            My medical reports
          </Link>
          <span aria-hidden="true" className="text-[#495057]">
            ›
          </span>
          <span className="font-bold text-[#242628]">
            {session.visitType} ({formatEncounterDateDisplay(session.encounterDate)})
          </span>
        </div>

        <Link
          to="/patient/reports"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00783c] hover:text-[#0d4026] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to My medical reports</span>
        </Link>
      </nav>

      {/* Parkview Emerald Released Report Header */}
      <section className="rounded-[18px] overflow-hidden bg-[#00783c] text-white px-5 py-6 sm:px-8 sm:py-7 shadow-2xs relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-36px] bottom-[-88px] w-56 h-56 rounded-full bg-[#f26b21]"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#c8f59b]">
              <span className="px-2 py-0.5 rounded bg-[#0d4026]/80 font-mono text-white">
                {report.id} ({session.id})
              </span>
              <span>·</span>
              <span>{DEPARTMENT_LABELS[session.department]}</span>
              <span>·</span>
              <span>{formatEncounterDateDisplay(session.encounterDate)}</span>
              <span>·</span>
              <span>Finalized Revision v{releasedRevision}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-white leading-tight font-display">
              {session.visitType} — Visit Summary &amp; Care Plan
            </h1>

            <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
              Patient: <strong>{report.patientName}</strong> · Reviewed, Finalized &amp; Released by{' '}
              <strong>{report.clinicianName}</strong>
              {session.release.releasedAt
                ? ` at ${formatTimeShort(session.release.releasedAt)}`
                : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <ButtonLink
              to="/patient/reports"
              variant="heroDark"
              size="sm"
              iconLeft={<ArrowLeft className="w-4 h-4 text-[#7dc242]" aria-hidden="true" />}
            >
              All released reports
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="hidden lg:block lg:col-span-3 min-w-0">
          <ParkviewSubNav />
        </div>

        <div className="min-w-0 lg:col-span-9 space-y-6">
          {/* Release Metadata Banner */}
          <Card
            tone="mint"
            padding="md"
            className="border-l-4 border-l-[#00783c] flex flex-wrap items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="success">Released to Patient Portal</StatusBadge>
                <span className="text-xs font-bold text-[#0d4026]">
                  Finalized Revision v{releasedRevision}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#242628]">
                Approved and released by{' '}
                <strong>
                  {session.release.releasedByDisplayName ?? report.clinicianName}
                </strong>{' '}
                for <strong>{report.patientName}</strong>.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00783c] bg-white px-3 py-1.5 rounded-full border border-[#cde0d4]">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>Physician Verified Summary</span>
            </div>
          </Card>

          {/* 1. Patient Care Instructions & Next Steps */}
          <Card padding="md" className="space-y-4 border-[#056233]/30">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4ece7] pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#00783c]" aria-hidden="true" />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#0d4026] font-display">
                    Your Care Instructions &amp; Next Steps
                  </h2>
                  <p className="text-xs text-[#495057]">
                    Actionable medication, laboratory, and follow-up guidance from{' '}
                    {report.clinicianName}.
                  </p>
                </div>
              </div>
              <StatusBadge tone="info">Patient Care Plan</StatusBadge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-[12px] bg-[#edf5f0] border border-[#cde0d4] p-4 space-y-1.5">
                <strong className="text-[#0d4026] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Pill className="w-4 h-4 text-[#00783c]" aria-hidden="true" />
                  <span>Medications</span>
                </strong>
                <p className="text-[#242628] leading-relaxed">
                  {report.patientNextSteps.medicationSummary}
                </p>
              </div>

              <div className="rounded-[12px] bg-[#edf5f0] border border-[#cde0d4] p-4 space-y-1.5">
                <strong className="text-[#0d4026] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <TestTube2 className="w-4 h-4 text-[#00783c]" aria-hidden="true" />
                  <span>Tests &amp; Lab Orders</span>
                </strong>
                <p className="text-[#242628] leading-relaxed">
                  {report.patientNextSteps.testsOrdered}
                </p>
              </div>

              <div className="rounded-[12px] bg-[#edf5f0] border border-[#cde0d4] p-4 space-y-1.5">
                <strong className="text-[#0d4026] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-[#00783c]" aria-hidden="true" />
                  <span>Follow-Up Schedule</span>
                </strong>
                <p className="text-[#242628] leading-relaxed">
                  {report.patientNextSteps.followUpInstructions}
                </p>
              </div>

              <div className="rounded-[12px] bg-[#feede0]/60 border border-[#f26b21]/45 p-4 space-y-1.5">
                <strong className="text-[#9a4406] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <PhoneCall className="w-4 h-4 text-[#9a4406]" aria-hidden="true" />
                  <span>When to Contact Your Care Team</span>
                </strong>
                <p className="text-[#242628] leading-relaxed">
                  {report.patientNextSteps.contactGuidance}
                </p>
              </div>
            </div>
          </Card>

          {/* 2. Finalized Clinical Visit Summary */}
          <Card padding="md" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4ece7] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#00783c]" aria-hidden="true" />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#0d4026] font-display">
                    Finalized Clinical Visit Documentation
                  </h2>
                  <p className="text-xs text-[#495057]">
                    Encounter Date: {formatEncounterDateDisplay(session.encounterDate)} · Clinician:{' '}
                    {report.clinicianName}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#00783c] bg-[#edf5f0] px-2.5 py-1 rounded border border-[#cde0d4]">
                Finalized v{releasedRevision}
              </span>
            </div>

            {report.narrativeSummary && (
              <div className="rounded-[10px] bg-[#edf5f0]/70 border border-[#cde0d4] p-4 space-y-1">
                <strong className="text-xs font-bold uppercase tracking-wider text-[#00783c] block">
                  Visit Overview
                </strong>
                <p className="text-sm text-[#242628] leading-relaxed">
                  {report.narrativeSummary}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3.5">
              {(
                [
                  {
                    key: 'subjective',
                    label: 'Symptoms & History Discussed (Subjective)',
                    value: report.soap.subjective,
                  },
                  {
                    key: 'objective',
                    label: 'Observations & Reviewed Logs (Objective)',
                    value: report.soap.objective,
                  },
                  {
                    key: 'assessment',
                    label: 'Clinical Assessment',
                    value: report.soap.assessment,
                  },
                  {
                    key: 'plan',
                    label: 'Treatment & Management Plan',
                    value: report.soap.plan,
                  },
                ] as const
              ).map((sec) => (
                <div
                  key={sec.key}
                  className="rounded-[10px] bg-[#f7f8f8] border border-[#d5e0db] p-4 space-y-1.5"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#00783c]">
                    {sec.label}
                  </h3>
                  <p className="text-sm text-[#242628] leading-relaxed whitespace-pre-wrap">
                    {sec.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* 3. Patient Privacy & Scope Notice */}
          <Card tone="mint" padding="md" className="space-y-2">
            <div className="flex items-start gap-2.5 text-xs text-[#242628]">
              <ShieldCheck className="w-4 h-4 text-[#00783c] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <strong className="text-[#0d4026] block">
                  About Your Released Visit Summary (Synthetic Demo Data)
                </strong>
                <p className="text-[#495057] leading-relaxed">
                  This page displays only the finalized clinical report approved and released by{' '}
                  <strong>{report.clinicianName}</strong>. Raw visit audio, internal conversation
                  transcripts, intermediate draft revisions, and internal clinical clarification
                  prompts are clinician-only records and are never included in your patient portal.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-[#cde0d4] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#0d4026]">
                <Stethoscope className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
                <span>Northfield Primary Care · Attending Physician: {report.clinicianName}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[#495057]">
                <Lock className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
                <span>Clinician-only transcripts &amp; drafts excluded</span>
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
