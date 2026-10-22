import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  AuditEvent,
  ClinicalReport,
  ClinicalSession,
  User,
} from '../../domain/models';
import {
  canApproveAndFinalizeReport,
  canReleaseReportToPatient,
  type DerivedSessionDisplay,
} from '../../domain/state-machines';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { Dialog } from '../../design-system/components/Dialog';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import {
  formatEncounterDateDisplay,
  formatTimeShort,
} from './session-formatters';

export interface ClinicalSignOffAndReleasePanelProps {
  readonly currentUser: User;
  readonly session: ClinicalSession;
  readonly report: ClinicalReport;
  readonly derived: DerivedSessionDisplay;
  readonly hasUnsavedChanges: boolean;
  readonly hasUnsavedSoapChanges: boolean;
  readonly hasUnsavedClarificationDrafts: boolean;
  readonly isMutating: boolean;
  readonly sessionAuditEvents: readonly AuditEvent[];
  readonly openApprovalOnMount?: boolean;
  readonly onApproveAndFinalize: () => Promise<void>;
  readonly onReleaseToPatient: () => Promise<void>;
}

const AUDIT_ACTION_BADGE: Record<
  AuditEvent['action'],
  { readonly label: string; readonly tone: 'neutral' | 'info' | 'warning' | 'danger' | 'success' }
> = {
  CONSENT_CONFIRMED: { label: 'Consent Confirmed', tone: 'neutral' },
  RECORDING_STARTED: { label: 'Recording Started', tone: 'info' },
  RECORDING_FINISHED: { label: 'Recording Finished', tone: 'info' },
  RECORDING_DISCARDED: { label: 'Recording Discarded', tone: 'warning' },
  AUDIO_UPLOADED: { label: 'Audio Uploaded', tone: 'info' },
  DRAFT_GENERATED: { label: 'AI Draft Generated', tone: 'info' },
  CLARIFICATIONS_RESOLVED: { label: 'Clarifications Resolved', tone: 'success' },
  DRAFT_EDITED: { label: 'Draft Revised', tone: 'info' },
  DRAFT_SAVED: { label: 'Draft Saved', tone: 'neutral' },
  DRAFT_REJECTED_REGENERATING: { label: 'Draft Rejected', tone: 'warning' },
  DRAFT_REGENERATED: { label: 'Draft Regenerated', tone: 'info' },
  REPORT_APPROVED_FINALIZED: { label: 'Approved & Finalized', tone: 'success' },
  REPORT_RELEASED_TO_PATIENT: { label: 'Released to Patient', tone: 'success' },
  PRIVACY_VERIFICATION_COMPLETED: { label: 'Privacy Verified', tone: 'success' },
  PREFERENCES_UPDATED: { label: 'Preferences Updated', tone: 'neutral' },
};

export function ClinicalSignOffAndReleasePanel({
  currentUser,
  session,
  report,
  derived,
  hasUnsavedChanges,
  hasUnsavedSoapChanges,
  hasUnsavedClarificationDrafts,
  isMutating,
  sessionAuditEvents,
  openApprovalOnMount = false,
  onApproveAndFinalize,
  onReleaseToPatient,
}: ClinicalSignOffAndReleasePanelProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(openApprovalOnMount);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    readonly tone: 'success' | 'error';
    readonly message: string;
  } | null>(null);

  const isFinalized = session.review.status === 'approved_finalized';
  const isReleased = session.release.status === 'released';

  const reportMatchesEncounter = report.sessionId === session.id;
  const unresolvedCount =
    session.review.unresolvedClarificationCount ||
    report.clarifications.filter((q) => q.status === 'unresolved').length;
  const allClarificationsResolved = unresolvedCount === 0;
  const domainCanApprove = canApproveAndFinalizeReport(currentUser, session, report);
  const readyForApproval =
    domainCanApprove && reportMatchesEncounter && !hasUnsavedChanges;

  const canRelease = canReleaseReportToPatient(currentUser, session) && !hasUnsavedChanges;

  const blockingReasons: string[] = [];
  if (!isFinalized) {
    if (!reportMatchesEncounter) {
      blockingReasons.push('Report identity does not match the active encounter.');
    }
    if (!allClarificationsResolved) {
      blockingReasons.push(
        `Resolve ${unresolvedCount} open clinical clarification question${
          unresolvedCount === 1 ? '' : 's'
        } before approving.`,
      );
    }
    if (hasUnsavedSoapChanges) {
      blockingReasons.push(
        `Save or discard your unsaved SOAP section edits before approving Revision v${report.currentRevision}.`,
      );
    }
    if (hasUnsavedClarificationDrafts) {
      blockingReasons.push(
        'Submit or clear your unsubmitted clarification answer drafts before approving.',
      );
    }
  }

  const handleConfirmApproval = async () => {
    setActionFeedback(null);
    try {
      await onApproveAndFinalize();
      setApproveDialogOpen(false);
      setActionFeedback({
        tone: 'success',
        message: `Report Revision v${report.currentRevision} has been approved and finalized (Simulated Demo Co-Signature). You may now release the finalized summary to ${session.patientName} when ready.`,
      });
    } catch (err) {
      setApproveDialogOpen(false);
      setActionFeedback({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to approve and finalize report. Please verify all preconditions and retry.',
      });
    }
  };

  const handleConfirmRelease = async () => {
    setActionFeedback(null);
    try {
      await onReleaseToPatient();
      setReleaseDialogOpen(false);
      setActionFeedback({
        tone: 'success',
        message: `Finalized report Revision v${
          session.review.approvedRevision ?? report.currentRevision
        } has been released to ${session.patientName}’s Patient Portal.`,
      });
    } catch (err) {
      setReleaseDialogOpen(false);
      setActionFeedback({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to release finalized report to the patient portal.',
      });
    }
  };

  return (
    <Card
      padding="md"
      aria-label="Clinical sign-off, finalization, and patient release"
      className="space-y-4 border-2 border-[#00783c]/30 bg-white"
    >
      {/* Approval & Finalization Confirmation Dialog */}
      <Dialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        title={`Approve & Finalize Clinical Report (Revision v${report.currentRevision})`}
        description={`Confirm clinician co-signature and finalization for encounter ${session.id} (${session.patientName}).`}
      >
        <div className="space-y-4 text-sm text-[#242628]">
          <div className="rounded-[10px] bg-[#edf5f0] border border-[#cde0d4] p-3.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-[#0d4026] text-sm">
                Encounter {session.id} · {session.visitType}
              </strong>
              <span className="font-mono font-bold text-[#00783c] bg-white px-2 py-0.5 rounded border border-[#cde0d4]">
                Approving Revision v{report.currentRevision}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#242628] pt-1 border-t border-[#cde0d4]">
              <span>
                <strong>Patient:</strong> {session.patientName}
              </span>
              <span>
                <strong>Encounter Date:</strong>{' '}
                {formatEncounterDateDisplay(session.encounterDate)}
              </span>
              <span>
                <strong>Approving Clinician:</strong> {currentUser.displayName}
              </span>
              <span>
                <strong>Clarifications:</strong> {report.clarifications.length} resolved (0 open)
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs leading-relaxed text-[#242628]">
            <p>
              <strong>Finalization &amp; Documentation Lock:</strong> Approving marks{' '}
              <strong>Revision v{report.currentRevision}</strong> as the finalized clinical record
              for this encounter and locks the SOAP documentation against silent overwriting. Prior
              draft revisions (v1–v{report.currentRevision}) remain preserved in the audit history.
            </p>
            <p>
              <strong>Patient Release Is Separate:</strong> Finalizing this report does{' '}
              <strong>not</strong> automatically release it to the patient portal. You will have a
              separate action to release the finalized summary to {session.patientName}.
            </p>
          </div>

          <div className="rounded-[10px] bg-[#feede0] border border-[#f26b21]/50 p-3 text-xs text-[#242628] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#9a4406] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="text-[#9a4406] block">
                Simulated Electronic Co-Signature (Demo Mode)
              </strong>
              <span>
                This electronic approval is a simulated demonstration sign-off by{' '}
                <strong>{currentUser.displayName}</strong> on synthetic clinical data and does not
                represent a legally validated digital signature.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#e4ece7]">
            <Button
              variant="secondary"
              size="sm"
              disabled={isMutating}
              onClick={() => setApproveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isMutating}
              iconLeft={<ClipboardCheck className="w-4 h-4" aria-hidden="true" />}
              onClick={() => void handleConfirmApproval()}
            >
              {isMutating
                ? 'Finalizing…'
                : `Confirm Approval & Finalize v${report.currentRevision}`}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Patient Portal Release Confirmation Dialog */}
      <Dialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        title={`Release Finalized Report to ${session.patientName}`}
        description={`Confirm explicit patient portal release for encounter ${session.id} (Revision v${
          session.review.approvedRevision ?? report.currentRevision
        }).`}
      >
        <div className="space-y-4 text-sm text-[#242628]">
          <div className="rounded-[10px] bg-[#edf5f0] border border-[#cde0d4] p-3.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-[#0d4026] text-sm">
                Recipient: {session.patientName} ({session.patientId})
              </strong>
              <span className="font-mono font-bold text-[#00783c] bg-white px-2 py-0.5 rounded border border-[#cde0d4]">
                Finalized Revision v{session.review.approvedRevision ?? report.currentRevision}
              </span>
            </div>
            <p className="text-[#495057]">
              Encounter {session.id} · {session.visitType} ·{' '}
              {formatEncounterDateDisplay(session.encounterDate)} · Approved by{' '}
              {session.review.approvedByDisplayName ?? currentUser.displayName}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-[10px] bg-[#f7f8f8] border border-[#cde0d4] p-3 space-y-1.5">
              <strong className="text-[#00783c] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Shared in Patient Portal</span>
              </strong>
              <ul className="list-disc list-inside space-y-1 text-[#242628]">
                <li>Encounter date, visit type &amp; clinician name</li>
                <li>Finalized clinical visit summary (v{session.review.approvedRevision ?? report.currentRevision})</li>
                <li>Medication, lab, follow-up &amp; contact instructions</li>
              </ul>
            </div>

            <div className="rounded-[10px] bg-[#f7f8f8] border border-[#d5e0db] p-3 space-y-1.5">
              <strong className="text-[#0d4026] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#9a4406] shrink-0" aria-hidden="true" />
                <span>Withheld (Clinician-Only)</span>
              </strong>
              <ul className="list-disc list-inside space-y-1 text-[#495057]">
                <li>Raw visit audio recordings</li>
                <li>Internal verbatim transcript segments</li>
                <li>Intermediate draft history &amp; clarification notes</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#e4ece7]">
            <Button
              variant="secondary"
              size="sm"
              disabled={isMutating}
              onClick={() => setReleaseDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isMutating}
              iconLeft={<Send className="w-4 h-4" aria-hidden="true" />}
              onClick={() => void handleConfirmRelease()}
            >
              {isMutating
                ? 'Releasing…'
                : `Confirm Release to ${session.patientName}`}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Panel Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e4ece7] pb-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#00783c]" aria-hidden="true" />
            <h2 className="text-lg sm:text-xl font-bold text-[#0d4026] font-display">
              Clinical Co-Signature, Finalization &amp; Patient Release
            </h2>
            <StatusBadge tone={derived.badgeTone}>{derived.badgeLabel}</StatusBadge>
          </div>
          <p className="text-xs text-[#495057]">
            Simulated Demo Mode electronic sign-off workflow. Approval finalizes a specific report
            revision; patient release is a separate step after finalization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#0d4026] bg-[#edf5f0] px-2.5 py-1 rounded border border-[#cde0d4]">
            {isFinalized
              ? `Finalized Revision v${session.review.approvedRevision ?? report.currentRevision}`
              : `Target Revision v${report.currentRevision}`}
          </span>
        </div>
      </div>

      {/* Action Feedback Alert */}
      {actionFeedback && (
        <div
          role={actionFeedback.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-[10px] px-3.5 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 border ${
            actionFeedback.tone === 'error'
              ? 'bg-[var(--color-danger-soft)] border-[var(--color-danger-border)] text-[var(--color-danger)]'
              : 'bg-[#e8f4ed] border-[#00783c]/40 text-[#0d4026]'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {actionFeedback.tone === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00783c]" aria-hidden="true" />
            )}
            <span>{actionFeedback.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-[11px] underline hover:no-underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stage 1: Draft Review & Approval Readiness (when not yet finalized) */}
      {!isFinalized && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div
              className={`rounded-[10px] p-3 border flex items-start gap-2 ${
                reportMatchesEncounter
                  ? 'bg-[#edf5f0]/70 border-[#cde0d4] text-[#0d4026]'
                  : 'bg-[#feede0] border-[#f26b21]/50 text-[#9a4406]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-[#00783c] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="block">1. Encounter Report Linked</strong>
                <span className="text-[11px] text-[#495057]">
                  {report.id} · Revision v{report.currentRevision} ({session.patientName})
                </span>
              </div>
            </div>

            <div
              className={`rounded-[10px] p-3 border flex items-start gap-2 ${
                allClarificationsResolved
                  ? 'bg-[#edf5f0]/70 border-[#cde0d4] text-[#0d4026]'
                  : 'bg-[#feede0] border-[#f26b21]/50 text-[#9a4406]'
              }`}
            >
              {allClarificationsResolved ? (
                <CheckCircle2
                  className="w-4 h-4 text-[#00783c] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="w-4 h-4 text-[#9a4406] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              )}
              <div>
                <strong className="block">2. Clarifications Resolved</strong>
                <span className="text-[11px] text-[#495057]">
                  {allClarificationsResolved
                    ? `${report.clarifications.length} of ${report.clarifications.length} questions resolved`
                    : `${unresolvedCount} blocking question${
                        unresolvedCount === 1 ? '' : 's'
                      } unresolved`}
                </span>
              </div>
            </div>

            <div
              className={`rounded-[10px] p-3 border flex items-start gap-2 ${
                !hasUnsavedChanges
                  ? 'bg-[#edf5f0]/70 border-[#cde0d4] text-[#0d4026]'
                  : 'bg-[#feede0] border-[#f26b21]/50 text-[#9a4406]'
              }`}
            >
              {!hasUnsavedChanges ? (
                <CheckCircle2
                  className="w-4 h-4 text-[#00783c] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="w-4 h-4 text-[#9a4406] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              )}
              <div>
                <strong className="block">3. Workbench Changes Saved</strong>
                <span className="text-[11px] text-[#495057]">
                  {!hasUnsavedChanges
                    ? `All edits saved at Revision v${report.currentRevision}`
                    : 'Unsaved SOAP edits or clarification drafts present'}
                </span>
              </div>
            </div>
          </div>

          {blockingReasons.length > 0 && (
            <div
              role="status"
              className="rounded-[10px] bg-[#feede0]/80 border border-[#f26b21]/50 px-3.5 py-2.5 text-xs text-[#242628] space-y-1"
            >
              <strong className="text-[#9a4406] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Approval &amp; Finalization Currently Blocked</span>
              </strong>
              <ul className="list-disc list-inside space-y-0.5 text-[#242628]">
                {blockingReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#495057]">
              Patient release remains unavailable until the report is approved and finalized.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="sm"
                disabled={!readyForApproval || isMutating}
                iconLeft={<ClipboardCheck className="w-4 h-4" aria-hidden="true" />}
                onClick={() => setApproveDialogOpen(true)}
              >
                Approve &amp; Finalize Report (v{report.currentRevision})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2 & 3: Finalized Record + Patient Portal Release Controls */}
      {isFinalized && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Finalization Metadata Box */}
            <div className="rounded-[10px] bg-[#edf5f0] border border-[#00783c]/35 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-[#0d4026] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
                  <span>Finalized Clinical Documentation</span>
                </strong>
                <StatusBadge tone="success">
                  Revision v{session.review.approvedRevision ?? report.currentRevision} Locked
                </StatusBadge>
              </div>
              <p className="text-[#242628]">
                Co-signed by{' '}
                <strong>{session.review.approvedByDisplayName ?? currentUser.displayName}</strong>{' '}
                at <strong>{formatTimeShort(session.review.approvedAt)}</strong> on{' '}
                {formatEncounterDateDisplay(session.encounterDate)}.
              </p>
              <p className="text-[11px] text-[#495057]">
                Simulated Demo Co-Signature · Finalized reports cannot be silently overwritten.
                Post-finalization addenda/amendments are deferred.
              </p>
            </div>

            {/* Patient Portal Release Box */}
            <div
              className={`rounded-[10px] p-3.5 border space-y-2 flex flex-col justify-between ${
                isReleased
                  ? 'bg-[#edf5f0] border-[#00783c]/35'
                  : 'bg-[#feede0]/60 border-[#f26b21]/50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-[#0d4026] flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />
                    <span>Patient Portal Release Status</span>
                  </strong>
                  <StatusBadge tone={isReleased ? 'success' : 'warning'}>
                    {isReleased ? 'Released to Patient' : 'Not Yet Released'}
                  </StatusBadge>
                </div>

                {isReleased ? (
                  <p className="text-[#242628]">
                    Revision v
                    {session.release.releasedRevision ??
                      session.review.approvedRevision ??
                      report.currentRevision}{' '}
                    released to <strong>{session.patientName}</strong> by{' '}
                    <strong>
                      {session.release.releasedByDisplayName ?? currentUser.displayName}
                    </strong>{' '}
                    at <strong>{formatTimeShort(session.release.releasedAt)}</strong>.
                  </p>
                ) : (
                  <p className="text-[#242628]">
                    This finalized report is currently withheld from{' '}
                    <strong>{session.patientName}</strong>’s Patient Portal until you explicitly
                    confirm release.
                  </p>
                )}
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-end gap-2">
                {!isReleased ? (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!canRelease || isMutating}
                    iconLeft={<Send className="w-3.5 h-3.5" aria-hidden="true" />}
                    onClick={() => setReleaseDialogOpen(true)}
                  >
                    Release Report to Patient Portal
                  </Button>
                ) : (
                  <span className="text-[11px] font-bold text-[#00783c]">
                    Visible in Patient Portal ({report.id})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encounter Audit Trail */}
      {sessionAuditEvents.length > 0 && (
        <div className="pt-3 border-t border-[#e4ece7] space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#00783c]">
              Encounter Audit Trail ({sessionAuditEvents.length})
            </h3>
            <span className="text-[11px] text-[#495057]">
              Simulated Demo Audit Log · {session.id}
            </span>
          </div>
          <ul className="space-y-1.5" aria-label="Encounter audit events">
            {sessionAuditEvents.slice(0, 5).map((evt) => {
              const badge = AUDIT_ACTION_BADGE[evt.action] ?? {
                label: evt.action,
                tone: 'neutral' as const,
              };
              return (
                <li
                  key={evt.id}
                  className="rounded-[8px] bg-[#f7f8f8] border border-[#e4ece7] px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    <span className="text-[#242628] font-medium">{evt.summary}</span>
                  </div>
                  <span className="text-[11px] text-[#495057] tabular-nums">
                    {evt.actorDisplayName} · {evt.timeLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
