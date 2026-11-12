import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Mic,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Card } from "../../design-system/components/Card";
import { StepProgress } from "../../design-system/components/StepProgress";
import type { ClinicalSession } from "../../domain/models";
import {
  CAPTURE_ORIGIN_LABELS,
  formatDurationMmSs,
  formatTimeShort,
} from "./session-formatters";

export function SessionPipelineStages({
  session,
}: {
  readonly session: ClinicalSession;
}) {
  return (
    <Card padding="md" className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#e4ece7] pb-3">
        <div>
          <h2 className="text-lg font-bold text-[#0d4026] font-display">
            Processing Pipeline Stages
          </h2>
          <p className="text-xs text-[#495057]">
            5-stage audio validation, transcription, and drafting status for{" "}
            {session.id}.
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
  );
}

export function SessionLifecycleTracks({
  session,
}: {
  readonly session: ClinicalSession;
}) {
  return (
    <section aria-label="Session lifecycle tracks" className="hidden">
      <Card padding="sm" className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#00783c]">
          <span>1. Capture</span>
          <Mic className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <p className="text-sm font-bold text-[#0d4026] capitalize">
          {session.capture.status.replace(/_/g, " ")}
        </p>
        <p className="text-xs text-[#495057]">
          {CAPTURE_ORIGIN_LABELS[session.capture.origin]} ·{" "}
          {formatDurationMmSs(session.capture.durationSeconds)}
        </p>
        <p className="text-[11px] text-[#00783c] font-semibold">
          {session.capture.consentConfirmed
            ? "Patient consent confirmed"
            : "Consent pending"}
        </p>
      </Card>

      <Card padding="sm" className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#00783c]">
          <span>2. Pipeline</span>
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <p className="text-sm font-bold text-[#0d4026] capitalize">
          {session.processing.status.replace(/_/g, " ")}
        </p>
        <p className="text-xs text-[#495057]">
          Retries: {session.processing.retryCount} /{" "}
          {session.processing.maxRetries}
        </p>
        <p className="text-[11px] text-[#495057]">
          {session.processing.completedAt
            ? `Completed at ${formatTimeShort(session.processing.completedAt)}`
            : session.processing.failedStage
              ? `Failed: ${session.processing.failedStage.replace(/_/g, " ")}`
              : "In progress"}
        </p>
      </Card>

      <Card padding="sm" className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#00783c]">
          <span>3. Review</span>
          <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <p className="text-sm font-bold text-[#0d4026] capitalize">
          {session.review.status.replace(/_/g, " ")}
        </p>
        <p className="text-xs text-[#495057]">
          Revision:{" "}
          {session.review.currentRevision > 0
            ? `v${session.review.currentRevision}`
            : "Not generated"}
        </p>
        <p className="text-[11px] font-semibold text-[#9a4406]">
          {session.review.unresolvedClarificationCount > 0
            ? `${session.review.unresolvedClarificationCount} open clarifications`
            : "0 open clarifications"}
        </p>
      </Card>

      <Card padding="sm" className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#00783c]">
          <span>4. Patient Release</span>
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <p className="text-sm font-bold text-[#0d4026] capitalize">
          {session.release.status.replace(/_/g, " ")}
        </p>
        <p className="text-xs text-[#495057]">
          {session.release.releasedAt
            ? `Released ${formatTimeShort(session.release.releasedAt)}`
            : "Not yet shared"}
        </p>
        <p className="text-[11px] text-[#495057]">
          {session.release.releasedByDisplayName ?? "Released after approval"}
        </p>
      </Card>

      <Card padding="sm" className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#00783c]">
          <span>5. Analytics Track</span>
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <p className="text-sm font-bold text-[#0d4026] capitalize">
          {session.privacy.status.replace(/_/g, " ")}
        </p>
        <p className="text-xs text-[#495057]">
          De-ID passes: {session.privacy.independentPassesCompleted} / 2
        </p>
        <p className="text-[11px] text-[#495057]">
          {session.privacy.safeHarborChecked
            ? "Eligible for cohort view"
            : "Excluded until verified"}
        </p>
      </Card>
    </section>
  );
}
