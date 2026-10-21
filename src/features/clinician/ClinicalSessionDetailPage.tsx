import { useEffect, useState } from 'react';
import { Link, useBlocker, useLocation, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  History,
  Info,
  Mic,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useServices } from '../../app/providers/ServiceProvider';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { Dialog } from '../../design-system/components/Dialog';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { StepProgress } from '../../design-system/components/StepProgress';
import { ROLE_WORKSPACE_LABELS } from '../../design-system/layouts/Sidebar';
import type { SoapSectionKey, SoapSections } from '../../domain/models';
import {
  canSaveOrEditDraft,
  deriveSessionDisplayState,
} from '../../domain/state-machines';
import { ClarificationWorkbenchPanel } from './ClarificationWorkbenchPanel';
import { ClinicalSignOffAndReleasePanel } from './ClinicalSignOffAndReleasePanel';
import { SoapReportEditorPanel } from './SoapReportEditorPanel';
import { TranscriptEvidencePanel } from './TranscriptEvidencePanel';
import {
  CAPTURE_ORIGIN_LABELS,
  DEPARTMENT_LABELS,
  DIAGNOSIS_LABELS,
  formatDurationMmSs,
  formatEncounterDateDisplay,
  formatTimeShort,
} from './session-formatters';

interface LocationStateWithSearch {
  readonly fromSessionsSearch?: string;
}

type MobileWorkbenchTab = 'report' | 'transcript' | 'lifecycle';

export function ClinicalSessionDetailPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const services = useServices();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navState = location.state as LocationStateWithSearch | null;
  const backToSessionsHref = `/clinician/sessions${navState?.fromSessionsSearch ?? ''}`;

  const [draftSoapOverrides, setDraftSoapOverrides] = useState<Partial<SoapSections>>({});
  const [draftClarificationAnswers, setDraftClarificationAnswers] = useState<
    Record<string, string>
  >({});
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileWorkbenchTab>('report');
  const [isMutating, setIsMutating] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    readonly tone: 'success' | 'error';
    readonly message: string;
  } | null>(null);

  const {
    data: bundle,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['session-review-bundle', sessionId],
    queryFn: () => services.sessions.getSessionReviewBundle(sessionId),
    enabled: sessionId.trim().length > 0,
  });

  const { data: allAuditEvents } = useQuery({
    queryKey: ['audit-events'],
    queryFn: () => services.admin.listAuditEvents(),
  });

  const session = bundle?.session;
  const transcript = bundle?.transcript;
  const report = bundle?.report;
  const sessionAuditEvents = (allAuditEvents ?? []).filter((evt) => evt.sessionId === sessionId);

  const effectiveSoap: SoapSections | null = report
    ? {
        ...report.soap,
        ...draftSoapOverrides,
      }
    : null;

  const hasUnsavedSoapChanges = Boolean(
    report &&
      effectiveSoap &&
      (effectiveSoap.subjective !== report.soap.subjective ||
        effectiveSoap.objective !== report.soap.objective ||
        effectiveSoap.assessment !== report.soap.assessment ||
        effectiveSoap.plan !== report.soap.plan),
  );

  const hasUnsavedClarificationDrafts = Object.values(draftClarificationAnswers).some(
    (val) => val.trim().length > 0,
  );

  const hasUnsavedChanges = hasUnsavedSoapChanges || hasUnsavedClarificationDrafts;

  // Block in-app route transitions when unsaved clinical edits exist
  const blocker = useBlocker(hasUnsavedChanges);

  // Warn before browser tab reload / close when unsaved clinical edits exist
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <Card padding="lg" role="status" aria-live="polite" className="text-center space-y-2 my-6">
        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#00783c]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>Loading clinical session {sessionId}…</span>
        </div>
      </Card>
    );
  }

  if (isError || !bundle || !session) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-4">
        <Card
          tone="peach"
          padding="lg"
          role="alert"
          className="border-l-4 border-l-[var(--color-danger)] space-y-4"
        >
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9a4406]">
              Clinical Session Lookup Error
            </p>
            <h1 className="text-2xl font-bold text-[#0d4026] font-display">
              Session {sessionId || 'Unknown'} could not be found
            </h1>
            <p className="text-sm text-[#242628]">
              {error instanceof Error
                ? error.message
                : 'The requested clinical encounter ID is not present in the active demonstration store.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refetch()}
            >
              Retry Loading Session
            </Button>
            <ButtonLink
              to={backToSessionsHref}
              variant="primary"
              size="sm"
              iconLeft={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
            >
              Back to Clinical sessions
            </ButtonLink>
            <ButtonLink to="/clinician/dashboard" variant="secondary" size="sm">
              Return to Clinician Dashboard
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  const derived = deriveSessionDisplayState(session);
  const canEdit = canSaveOrEditDraft(currentUser, session);

  const handleSoapChange = (section: SoapSectionKey, value: string) => {
    setSaveFeedback(null);
    setDraftSoapOverrides((prev) => ({
      ...prev,
      [section]: value,
    }));
  };

  const handleResetSection = (section: SoapSectionKey) => {
    setSaveFeedback(null);
    setDraftSoapOverrides((prev) => {
      const next = { ...prev };
      delete next[section];
      return next;
    });
  };

  const handleDiscardAllUnsaved = () => {
    setDraftSoapOverrides({});
    setDraftClarificationAnswers({});
    setConfirmDiscardOpen(false);
    setSaveFeedback({
      tone: 'success',
      message: 'Discarded unsaved edits and restored the last saved report revision.',
    });
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  const handleInspectSegment = (segmentId: string | null) => {
    setActiveSegmentId((prev) => (prev === segmentId ? null : segmentId));
    if (segmentId) {
      setMobileTab('transcript');
      if (typeof document !== 'undefined') {
        const el = document.getElementById(`transcript-segment-${segmentId}`);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  };

  const handleSaveDraft = async () => {
    if (!report || !effectiveSoap) return;
    setIsMutating(true);
    setSaveFeedback(null);

    try {
      if (hasUnsavedSoapChanges) {
        const modifiedLabels = (
          ['subjective', 'objective', 'assessment', 'plan'] as const
        )
          .filter((k) => effectiveSoap[k] !== report.soap[k])
          .map((k) => k.charAt(0).toUpperCase() + k.slice(1));

        const updatedBundle = await services.review.editReport({
          sessionId: session.id,
          expectedRevision: report.currentRevision,
          soapUpdates: effectiveSoap,
          changeSummary: `Clinician edited ${modifiedLabels.join(', ')} section${modifiedLabels.length === 1 ? '' : 's'} and saved draft.`,
        });

        queryClient.setQueryData(['session-review-bundle', session.id], updatedBundle);
        setDraftSoapOverrides({});
        await queryClient.invalidateQueries({ queryKey: ['sessions'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        await queryClient.invalidateQueries({ queryKey: ['audit-events'] });

        setSaveFeedback({
          tone: 'success',
          message: `Draft saved as Revision v${updatedBundle.report?.currentRevision ?? report.currentRevision + 1} (${formatTimeShort(updatedBundle.session.review.lastSavedAt)}).`,
        });
      } else {
        const updatedSession = await services.review.saveDraft({
          sessionId: session.id,
          expectedRevision: report.currentRevision,
        });

        queryClient.setQueryData(['session-review-bundle', session.id], {
          ...bundle,
          session: updatedSession,
        });
        await queryClient.invalidateQueries({ queryKey: ['sessions'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        await queryClient.invalidateQueries({ queryKey: ['audit-events'] });

        setSaveFeedback({
          tone: 'success',
          message: `Draft Revision v${report.currentRevision} marked as saved (${formatTimeShort(updatedSession.review.lastSavedAt)}).`,
        });
      }
    } catch (err) {
      setSaveFeedback({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to save clinical report draft. Please verify your edits and retry.',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveClarificationAnswers = async (
    answers: ReadonlyArray<{ questionId: string; responseText: string }>,
  ) => {
    if (!report) return;
    setIsMutating(true);
    setSaveFeedback(null);
    try {
      const updatedBundle = await services.review.resolveClarifications({
        sessionId: session.id,
        expectedRevision: report.currentRevision,
        answers,
      });
      queryClient.setQueryData(['session-review-bundle', session.id], updatedBundle);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      await queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    } finally {
      setIsMutating(false);
    }
  };

  const handleReopenClarification = async (questionId: string) => {
    if (!report) return;
    setIsMutating(true);
    setSaveFeedback(null);
    try {
      const updatedBundle = await services.review.reopenClarification({
        sessionId: session.id,
        expectedRevision: report.currentRevision,
        questionId,
      });
      queryClient.setQueryData(['session-review-bundle', session.id], updatedBundle);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      await queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    } finally {
      setIsMutating(false);
    }
  };

  const handleApproveAndFinalize = async () => {
    if (!report) return;
    setIsMutating(true);
    setSaveFeedback(null);
    try {
      const updatedBundle = await services.review.approveAndFinalize({
        sessionId: session.id,
        expectedRevision: report.currentRevision,
      });
      queryClient.setQueryData(['session-review-bundle', session.id], updatedBundle);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      await queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    } finally {
      setIsMutating(false);
    }
  };

  const handleReleaseToPatient = async () => {
    if (!report) return;
    setIsMutating(true);
    setSaveFeedback(null);
    try {
      const updatedBundle = await services.review.releaseToPatient({
        sessionId: session.id,
        expectedRevision: report.currentRevision,
      });
      queryClient.setQueryData(['session-review-bundle', session.id], updatedBundle);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      await queryClient.invalidateQueries({ queryKey: ['audit-events'] });
      await queryClient.invalidateQueries({ queryKey: ['patient-released-reports'] });
    } finally {
      setIsMutating(false);
    }
  };

  const isDiscardDialogOpen = confirmDiscardOpen || blocker.state === 'blocked';

  return (
    <div className="space-y-5">
      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog
        open={isDiscardDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDiscardOpen(false);
            if (blocker.state === 'blocked') {
              blocker.reset();
            }
          }
        }}
        title="Discard unsaved clinical review changes?"
        description="You have unsaved SOAP report edits or unsubmitted clarification responses in this encounter."
      >
        <div className="space-y-4">
          <p className="text-sm text-[#242628] leading-relaxed">
            If you discard your changes or leave this page without saving, your local modifications
            will be lost and the workbench will revert to{' '}
            <strong>Revision v{report?.currentRevision ?? 1}</strong>.
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#e4ece7]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setConfirmDiscardOpen(false);
                if (blocker.state === 'blocked') {
                  blocker.reset();
                }
              }}
            >
              Keep Reviewing
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDiscardAllUnsaved}
            >
              Discard Unsaved Changes
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Breadcrumb & Back Navigation Row */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[13px]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/clinician/dashboard" className="text-[#00783c] hover:underline font-semibold">
            {ROLE_WORKSPACE_LABELS[currentUser.role]}
          </Link>
          <span aria-hidden="true" className="text-[#495057]">
            ›
          </span>
          <Link to={backToSessionsHref} className="text-[#00783c] hover:underline font-semibold">
            Clinical sessions
          </Link>
          <span aria-hidden="true" className="text-[#495057]">
            ›
          </span>
          <span className="font-bold text-[#242628]">
            {session.id} ({session.patientName})
          </span>
        </div>

        <Link
          to={backToSessionsHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00783c] hover:text-[#0d4026] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Clinical sessions</span>
        </Link>
      </nav>

      {/* Compact Parkview Emerald Encounter Header */}
      <section className="rounded-[18px] overflow-hidden bg-[#00783c] text-white px-5 py-5 sm:px-7 sm:py-6 shadow-2xs relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-36px] bottom-[-88px] w-56 h-56 rounded-full bg-[#f26b21]"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#c8f59b]">
              <span className="px-2 py-0.5 rounded bg-[#0d4026]/80 font-mono text-white">
                {session.id}
              </span>
              <span>·</span>
              <span>{DEPARTMENT_LABELS[session.department]}</span>
              <span>·</span>
              <span>{formatEncounterDateDisplay(session.encounterDate)}</span>
              <span>·</span>
              <span>{formatDurationMmSs(session.capture.durationSeconds)} Audio</span>
              <span>·</span>
              <span>Synthetic Demo Record</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight font-display">
              {session.patientName} — {session.visitType}
            </h1>

            <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
              Assigned Clinician: <strong>{session.assignedClinicianName}</strong> · Primary
              Symptom: <strong>{session.primarySymptom}</strong> · Category:{' '}
              <strong>{DIAGNOSIS_LABELS[session.diagnosisCategory]}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ButtonLink
              to={`/clinician/sessions/${session.id}/summary`}
              variant="heroDark"
              size="sm"
              iconLeft={<FileText className="w-4 h-4 text-[#7dc242]" aria-hidden="true" />}
            >
              Collected data summary
            </ButtonLink>
            <ButtonLink
              to={`/clinician/sessions/${session.id}/history`}
              variant="secondary"
              size="sm"
              iconLeft={<History className="w-4 h-4 text-[#00783c]" aria-hidden="true" />}
            >
              Report history
            </ButtonLink>
            <ButtonLink
              to={`/clinician/sessions/${session.id}/privacy`}
              variant="secondary"
              size="sm"
              iconLeft={<ShieldCheck className="w-4 h-4 text-[#00783c]" aria-hidden="true" />}
            >
              Analytics privacy status
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Persistent Workbench Action Bar & Review Status Banner */}
      <Card
        tone={derived.needsClinicianAttention || hasUnsavedChanges ? 'peach' : 'mint'}
        padding="md"
        className={
          derived.needsClinicianAttention || hasUnsavedChanges
            ? 'border-l-4 border-l-[#f26b21]'
            : 'border-l-4 border-l-[#00783c]'
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={derived.badgeTone}>{derived.badgeLabel}</StatusBadge>
              {report && (
                <span className="text-xs font-bold text-[#0d4026] bg-white/90 px-2.5 py-0.5 rounded-full border border-[#056233]/25">
                  Revision v{report.currentRevision}
                </span>
              )}
              {hasUnsavedChanges ? (
                <StatusBadge tone="warning">Unsaved Workbench Changes</StatusBadge>
              ) : session.review.isDraftSaved && session.review.status !== 'approved_finalized' ? (
                <StatusBadge tone="success">
                  Saved Draft
                  {session.review.lastSavedAt
                    ? ` · ${formatTimeShort(session.review.lastSavedAt)}`
                    : ''}
                </StatusBadge>
              ) : null}
            </div>

            <p className="text-xs sm:text-sm text-[#242628] leading-relaxed">
              {derived.code === 'CLARIFICATION_NEEDED' ||
              derived.code === 'DRAFT_SAVED_NEEDS_CLARIFICATION' ? (
                <>
                  This visit has{' '}
                  <strong>
                    {session.review.unresolvedClarificationCount} unresolved clinical clarification
                    question{session.review.unresolvedClarificationCount === 1 ? '' : 's'}
                  </strong>{' '}
                  that block report approval. Answer the open prompts and review the SOAP draft
                  below.
                </>
              ) : derived.code === 'NEEDS_REVIEW' || derived.code === 'DRAFT_SAVED_READY' ? (
                <>
                  The structured SOAP draft (Revision v{session.review.currentRevision}) has{' '}
                  <strong>0 open clarification blockers</strong>. Review the SOAP sections below,
                  save any edits, and confirm <strong>Approve &amp; Finalize Report</strong> when
                  ready.
                </>
              ) : derived.code === 'APPROVED_NOT_RELEASED' ? (
                <>
                  Revision v{session.review.approvedRevision ?? session.review.currentRevision} was{' '}
                  <strong>approved and finalized</strong> by{' '}
                  {session.review.approvedByDisplayName ?? currentUser.displayName} at{' '}
                  <strong>{formatTimeShort(session.review.approvedAt)}</strong>. It has not yet been
                  released to {session.patientName}’s Patient Portal.
                </>
              ) : derived.code === 'PROCESSING_INTERRUPTED' ? (
                <>
                  Pipeline processing was interrupted during{' '}
                  <strong>{session.processing.failedStage?.replace(/_/g, ' ')}</strong> (Retry{' '}
                  {session.processing.retryCount} of {session.processing.maxRetries}).
                </>
              ) : derived.code === 'PROCESSING' || derived.code === 'REGENERATING_DRAFT' ? (
                <>
                  Audio capture is complete and the AI processing pipeline is currently running{' '}
                  <strong>speech transcription</strong>.
                </>
              ) : (
                <>
                  This clinical report was approved on{' '}
                  <strong>{formatTimeShort(session.review.approvedAt)}</strong> and released to the
                  patient portal on <strong>{formatTimeShort(session.release.releasedAt)}</strong>.
                </>
              )}
            </p>
          </div>

          {/* Persistent Save Draft Controls + Sequence 3B Boundary Notice */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {canEdit && report ? (
              <>
                {hasUnsavedChanges && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isMutating}
                    iconLeft={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                    onClick={() => setConfirmDiscardOpen(true)}
                  >
                    Discard Changes
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isMutating}
                  iconLeft={<Save className="w-4 h-4" aria-hidden="true" />}
                  onClick={() => void handleSaveDraft()}
                >
                  {isMutating ? 'Saving…' : 'Save Draft'}
                </Button>
              </>
            ) : (
              <div className="bg-white/90 rounded-[10px] px-3 py-2 border border-[#056233]/25 text-xs text-[#0d4026]">
                <span className="inline-flex items-center gap-1.5 font-bold text-[#00783c]">
                  <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {session.review.status === 'approved_finalized'
                      ? 'Finalized Report · Read-Only'
                      : 'Draft Not Yet Ready for Editing'}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Mobile / Tablet Workbench Mode Switcher (< 1024px) */}
      <div
        role="tablist"
        aria-label="Clinical review workbench panels"
        className="flex lg:hidden rounded-[12px] bg-[#edf5f0] p-1 border border-[#cde0d4] gap-1"
      >
        {(
          [
            {
              id: 'report',
              label: `Report & Clarifications${
                session.review.unresolvedClarificationCount > 0
                  ? ` (${session.review.unresolvedClarificationCount})`
                  : ''
              }`,
            },
            {
              id: 'transcript',
              label: `Transcript (${transcript?.segments.length ?? 0})`,
            },
            {
              id: 'lifecycle',
              label: 'Pipeline & Status',
            },
          ] as const
        ).map((tab) => {
          const isSelected = mobileTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 py-2 px-2.5 rounded-[9px] text-xs font-bold transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#00783c] text-white shadow-2xs'
                  : 'text-[#0d4026] hover:bg-white/60'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Clinical Review Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Primary Column: Clarifications + Editable SOAP Report + Revision History */}
        <div
          className={`min-w-0 lg:col-span-7 space-y-6 ${
            mobileTab === 'report' ? 'block' : 'hidden lg:block'
          }`}
        >
          {report && report.clarifications.length > 0 && (
            <ClarificationWorkbenchPanel
              clarifications={report.clarifications}
              unresolvedCount={session.review.unresolvedClarificationCount}
              canEdit={canEdit}
              isSubmitting={isMutating}
              activeSegmentId={activeSegmentId}
              draftAnswers={draftClarificationAnswers}
              onDraftAnswerChange={(questionId, value) =>
                setDraftClarificationAnswers((prev) => ({
                  ...prev,
                  [questionId]: value,
                }))
              }
              onInspectSegment={(segId) => handleInspectSegment(segId)}
              onSaveAnswers={handleSaveClarificationAnswers}
              onReopenQuestion={handleReopenClarification}
            />
          )}

          {report && effectiveSoap ? (
            <>
              <SoapReportEditorPanel
                session={session}
                report={report}
                derived={derived}
                canEdit={canEdit}
                draftSoap={effectiveSoap}
                hasUnsavedSoapChanges={hasUnsavedSoapChanges}
                isSaving={isMutating}
                saveFeedback={saveFeedback}
                activeSegmentId={activeSegmentId}
                onSoapChange={handleSoapChange}
                onResetSection={handleResetSection}
                onSaveDraft={handleSaveDraft}
                onRequestDiscardAll={() => setConfirmDiscardOpen(true)}
                onSelectEvidenceSegment={(segId) => handleInspectSegment(segId)}
                onClearFeedback={() => setSaveFeedback(null)}
              />

              <ClinicalSignOffAndReleasePanel
                currentUser={currentUser}
                session={session}
                report={report}
                derived={derived}
                hasUnsavedChanges={hasUnsavedChanges}
                hasUnsavedSoapChanges={hasUnsavedSoapChanges}
                hasUnsavedClarificationDrafts={hasUnsavedClarificationDrafts}
                isMutating={isMutating}
                sessionAuditEvents={sessionAuditEvents}
                onApproveAndFinalize={handleApproveAndFinalize}
                onReleaseToPatient={handleReleaseToPatient}
              />
            </>
          ) : (
            <Card padding="md" className="space-y-3">
              <div className="flex items-center gap-2 text-[#0d4026]">
                <AlertTriangle className="w-5 h-5 text-[#f26b21]" aria-hidden="true" />
                <h2 className="text-lg font-bold font-display">
                  Clinical report draft not yet generated
                </h2>
              </div>
              <p className="text-sm text-[#495057] leading-relaxed">
                Session <strong>{session.id}</strong> ({session.patientName} · {session.visitType})
                has not completed the structured report generation stage yet. Inspect the pipeline
                stages on the right to see current progress.
              </p>
            </Card>
          )}
        </div>

        {/* Right Secondary Column: Interactive Transcript & Pipeline Status */}
        <div
          className={`min-w-0 lg:col-span-5 space-y-6 lg:sticky lg:top-4 ${
            mobileTab === 'transcript' || mobileTab === 'lifecycle' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Transcript & Evidence Panel */}
          <div className={mobileTab === 'lifecycle' ? 'hidden lg:block' : 'block'}>
            <TranscriptEvidencePanel
              session={session}
              transcript={transcript}
              report={report}
              activeSegmentId={activeSegmentId}
              onSelectSegment={(segId) => setActiveSegmentId(segId)}
            />
          </div>

          {/* Processing Pipeline Stages */}
          <div className={mobileTab === 'transcript' ? 'hidden lg:block' : 'block'}>
            <Card padding="md" className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#e4ece7] pb-3">
                <div>
                  <h2 className="text-lg font-bold text-[#0d4026] font-display">
                    Processing Pipeline Stages
                  </h2>
                  <p className="text-xs text-[#495057]">
                    5-stage audio validation, transcription, and drafting status for {session.id}.
                  </p>
                </div>
                <Stethoscope className="w-5 h-5 text-[#00783c]" aria-hidden="true" />
              </div>

              {session.processing.stages.length > 0 ? (
                <StepProgress stages={session.processing.stages} />
              ) : (
                <p className="text-xs text-[#495057]">
                  Pipeline stages have not started for this session.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* 5 Orthogonal Lifecycle Tracks Summary Footer */}
      <section
        aria-label="Session lifecycle tracks"
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 ${
          mobileTab === 'lifecycle' ? 'grid' : 'hidden lg:grid'
        }`}
      >
        <Card padding="sm" className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#00783c]">
            <span>1. Capture</span>
            <Mic className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-[#0d4026] capitalize">
            {session.capture.status.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-[#495057]">
            {CAPTURE_ORIGIN_LABELS[session.capture.origin]} ·{' '}
            {formatDurationMmSs(session.capture.durationSeconds)}
          </p>
          <p className="text-[11px] text-[#00783c] font-semibold">
            {session.capture.consentConfirmed ? 'Patient consent confirmed' : 'Consent pending'}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#00783c]">
            <span>2. Pipeline</span>
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-[#0d4026] capitalize">
            {session.processing.status.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-[#495057]">
            Retries: {session.processing.retryCount} / {session.processing.maxRetries}
          </p>
          <p className="text-[11px] text-[#495057]">
            {session.processing.completedAt
              ? `Completed at ${formatTimeShort(session.processing.completedAt)}`
              : session.processing.failedStage
                ? `Failed: ${session.processing.failedStage.replace(/_/g, ' ')}`
                : 'In progress'}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#00783c]">
            <span>3. Review</span>
            <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-[#0d4026] capitalize">
            {session.review.status.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-[#495057]">
            Revision:{' '}
            {session.review.currentRevision > 0
              ? `v${session.review.currentRevision}`
              : 'Not generated'}
          </p>
          <p className="text-[11px] font-semibold text-[#9a4406]">
            {session.review.unresolvedClarificationCount > 0
              ? `${session.review.unresolvedClarificationCount} open clarifications`
              : '0 open clarifications'}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#00783c]">
            <span>4. Patient Release</span>
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-[#0d4026] capitalize">
            {session.release.status.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-[#495057]">
            {session.release.releasedAt
              ? `Released ${formatTimeShort(session.release.releasedAt)}`
              : 'Not yet shared'}
          </p>
          <p className="text-[11px] text-[#495057]">
            {session.release.releasedByDisplayName ?? 'Scheduled for Sequence 3C'}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#00783c]">
            <span>5. Analytics Track</span>
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-[#0d4026] capitalize">
            {session.privacy.status.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-[#495057]">
            De-ID passes: {session.privacy.independentPassesCompleted} / 2
          </p>
          <p className="text-[11px] text-[#495057]">
            {session.privacy.safeHarborChecked
              ? 'Eligible for cohort view'
              : 'Excluded until verified'}
          </p>
        </Card>
      </section>
    </div>
  );
}
