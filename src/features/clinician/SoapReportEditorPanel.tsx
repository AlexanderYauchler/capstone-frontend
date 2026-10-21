import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CornerDownRight,
  Eye,
  FileCheck2,
  History,
  Link2Off,
  Lock,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';
import type {
  ClinicalReport,
  ClinicalSession,
  ProvenanceFinding,
  ReportRevision,
  SoapSectionKey,
  SoapSections,
} from '../../domain/models';
import type { DerivedSessionDisplay } from '../../domain/state-machines';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { formatTimeShort } from './session-formatters';

export interface SoapReportEditorPanelProps {
  readonly session: ClinicalSession;
  readonly report: ClinicalReport;
  readonly derived: DerivedSessionDisplay;
  readonly canEdit: boolean;
  readonly draftSoap: SoapSections;
  readonly hasUnsavedSoapChanges: boolean;
  readonly isSaving: boolean;
  readonly saveFeedback: {
    readonly tone: 'success' | 'error';
    readonly message: string;
  } | null;
  readonly activeSegmentId: string | null;
  readonly onSoapChange: (section: SoapSectionKey, value: string) => void;
  readonly onResetSection: (section: SoapSectionKey) => void;
  readonly onSaveDraft: () => Promise<void>;
  readonly onRequestDiscardAll: () => void;
  readonly onSelectEvidenceSegment: (segmentId: string) => void;
  readonly onClearFeedback: () => void;
}

const SOAP_SECTION_META: ReadonlyArray<{
  readonly key: SoapSectionKey;
  readonly label: string;
  readonly description: string;
}> = [
  {
    key: 'subjective',
    label: 'Subjective',
    description: 'Patient-reported symptoms, interval history, and home monitoring logs.',
  },
  {
    key: 'objective',
    label: 'Objective',
    description: 'Documented observations, reviewed logs, and measured examination findings.',
  },
  {
    key: 'assessment',
    label: 'Assessment',
    description: 'Clinical synthesis, differential considerations, and problem status.',
  },
  {
    key: 'plan',
    label: 'Plan',
    description: 'Medications, diagnostic orders, patient education, and follow-up timeline.',
  },
];

const REVISION_ORIGIN_LABELS: Record<ReportRevision['origin'], string> = {
  ai_initial_draft: 'AI Initial Draft',
  clinician_clarification: 'Clinician Clarification',
  clinician_edit: 'Clinician Edit',
  ai_regenerated_draft: 'AI Regenerated Draft',
};

function inferFindingSection(finding: ProvenanceFinding): SoapSectionKey {
  if (finding.soapSection) return finding.soapSection;
  const lower = `${finding.label} ${finding.summary}`.toLowerCase();
  if (lower.includes('symptom') || lower.includes('adherence') || lower.includes('headache')) {
    return 'subjective';
  }
  if (lower.includes('glucose') || lower.includes('bp') || lower.includes('vital')) {
    return 'objective';
  }
  return 'plan';
}

export function SoapReportEditorPanel({
  session,
  report,
  derived,
  canEdit,
  draftSoap,
  hasUnsavedSoapChanges,
  isSaving,
  saveFeedback,
  activeSegmentId,
  onSoapChange,
  onResetSection,
  onSaveDraft,
  onRequestDiscardAll,
  onSelectEvidenceSegment,
  onClearFeedback,
}: SoapReportEditorPanelProps) {
  const [showOriginalAiComparison, setShowOriginalAiComparison] = useState(false);
  const [inspectedRevisionNumber, setInspectedRevisionNumber] = useState<number | null>(null);
  const [sectionValidationError, setSectionValidationError] = useState<string | null>(null);

  const initialAiRevision =
    report.revisions.find((r) => r.origin === 'ai_initial_draft') ?? report.revisions[0];
  const initialAiSoap: SoapSections = initialAiRevision?.soap ?? report.soap;

  const isFinalized = session.review.status === 'approved_finalized';

  const handleValidateAndSave = async () => {
    onClearFeedback();
    const emptySections = SOAP_SECTION_META.filter(
      (sec) => draftSoap[sec.key].trim().length === 0,
    ).map((sec) => sec.label);

    if (emptySections.length > 0) {
      setSectionValidationError(
        `All four SOAP sections must contain clinical documentation before saving. Missing: ${emptySections.join(', ')}.`,
      );
      return;
    }

    setSectionValidationError(null);
    await onSaveDraft();
  };

  const inspectedRevision =
    inspectedRevisionNumber !== null
      ? report.revisions.find((r) => r.revisionNumber === inspectedRevisionNumber) ?? null
      : null;

  return (
    <div className="space-y-6">
      <Card padding="md" className="space-y-5">
        {/* Card Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e4ece7] pb-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#0d4026] font-display">
                Structured Clinical Report (Revision v{report.currentRevision})
              </h2>
              <StatusBadge tone={derived.badgeTone}>{derived.badgeLabel}</StatusBadge>
              {hasUnsavedSoapChanges && (
                <StatusBadge tone="warning">Unsaved SOAP Edits</StatusBadge>
              )}
              {!hasUnsavedSoapChanges && session.review.isDraftSaved && !isFinalized && (
                <StatusBadge tone="success">
                  Draft Saved
                  {session.review.lastSavedAt
                    ? ` · ${formatTimeShort(session.review.lastSavedAt)}`
                    : ''}
                </StatusBadge>
              )}
            </div>
            <p className="text-xs text-[#495057]">
              Template:{' '}
              <strong>
                {report.templateId === 'soap_standard'
                  ? 'Standard SOAP Note'
                  : 'Narrative Visit Summary'}
              </strong>{' '}
              ·{' '}
              {isFinalized
                ? `Approved by ${session.review.approvedByDisplayName ?? report.clinicianName}`
                : 'AI-Generated Draft — Requires Clinician Verification Before Final Sign-Off'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {initialAiRevision && (
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Eye className="w-3.5 h-3.5 text-[#00783c]" aria-hidden="true" />}
                onClick={() => setShowOriginalAiComparison((prev) => !prev)}
              >
                {showOriginalAiComparison
                  ? 'Hide Original AI Draft (v1)'
                  : 'Compare Original AI Draft (v1)'}
              </Button>
            )}
          </div>
        </div>

        {/* Clinical Safety & Provenance Notice Banner */}
        {!isFinalized ? (
          <div className="rounded-[10px] bg-[#edf5f0] border border-[#cde0d4] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#0d4026]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00783c] shrink-0" aria-hidden="true" />
              <span>
                <strong>Draft Review Mode:</strong> Edit any SOAP section below and save your draft.
                Source chips highlight supporting transcript evidence only where genuine mappings
                exist.
              </span>
            </div>
            {session.review.unresolvedClarificationCount > 0 && (
              <span className="font-bold text-[#9a4406]">
                {session.review.unresolvedClarificationCount} open clarification
                {session.review.unresolvedClarificationCount === 1 ? '' : 's'} remain
              </span>
            )}
          </div>
        ) : (
          <div className="rounded-[10px] bg-[#f7f8f8] border border-[#d5e0db] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#495057]">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#00783c] shrink-0" aria-hidden="true" />
              <span>
                <strong>Finalized Clinical Record:</strong> This report was approved at{' '}
                {formatTimeShort(session.review.approvedAt)} and is locked against further draft
                modifications.
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#0d4026]">
              {report.isSimulatedAiOutput
                ? 'Provenance: Simulated AI Draft (v1) · Clinician Approved'
                : 'Provenance: AI Draft (v1) · Clinician Approved'}
            </span>
          </div>
        )}

        {/* Validation & Save Feedback Alerts */}
        {sectionValidationError && (
          <div
            role="alert"
            className="rounded-[10px] bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-danger)] flex items-center justify-between gap-2"
          >
            <span className="inline-flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{sectionValidationError}</span>
            </span>
            <button
              type="button"
              onClick={() => setSectionValidationError(null)}
              className="underline hover:no-underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {saveFeedback && (
          <div
            role={saveFeedback.tone === 'error' ? 'alert' : 'status'}
            className={`rounded-[10px] px-3.5 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 border ${
              saveFeedback.tone === 'error'
                ? 'bg-[var(--color-danger-soft)] border-[var(--color-danger-border)] text-[var(--color-danger)]'
                : 'bg-[#e8f4ed] border-[#00783c]/40 text-[#0d4026]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {saveFeedback.tone === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00783c]" aria-hidden="true" />
              )}
              <span>{saveFeedback.message}</span>
            </span>
            <div className="flex items-center gap-2">
              {saveFeedback.tone === 'error' && canEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => void handleValidateAndSave()}
                >
                  Retry Save
                </Button>
              )}
              <button
                type="button"
                onClick={onClearFeedback}
                className="text-[11px] underline hover:no-underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Four Editable SOAP Sections */}
        <div className="space-y-4">
          {SOAP_SECTION_META.map((sec) => {
            const currentVal = draftSoap[sec.key];
            const savedVal = report.soap[sec.key];
            const initialAiVal = initialAiSoap[sec.key];
            const isDirty = currentVal !== savedVal;
            const isClinicianModifiedFromAi = savedVal !== initialAiVal;

            const sectionFindings = report.provenanceFindings.filter(
              (f) => inferFindingSection(f) === sec.key,
            );
            const hasActiveLinkedEvidence = sectionFindings.some(
              (f) => f.sourceSegmentId && f.sourceSegmentId === activeSegmentId,
            );
            const inputId = `soap-editor-${sec.key}`;

            return (
              <div
                key={sec.key}
                className={`rounded-[12px] p-4 border transition-colors space-y-2.5 ${
                  hasActiveLinkedEvidence
                    ? 'bg-[#edf5f0]/75 border-[#00783c] ring-2 ring-[#00783c]/25'
                    : isDirty
                      ? 'bg-[#feede0]/35 border-[#f26b21]/60'
                      : 'bg-[#f7f8f8] border-[#d5e0db]'
                }`}
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label
                      htmlFor={canEdit ? inputId : undefined}
                      className="text-xs font-bold uppercase tracking-wider text-[#00783c] block"
                    >
                      {sec.label}
                    </label>
                    <p className="text-[11.5px] text-[#495057]">{sec.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isDirty ? (
                      <StatusBadge tone="warning">Unsaved Edit</StatusBadge>
                    ) : (
                      <>
                        {isFinalized && <StatusBadge tone="success">Finalized</StatusBadge>}
                        {isClinicianModifiedFromAi ? (
                          <StatusBadge tone="info">
                            Clinician Revised (v{report.currentRevision})
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">AI-Generated Draft (v1)</StatusBadge>
                        )}
                      </>
                    )}

                    {canEdit && isDirty && (
                      <button
                        type="button"
                        onClick={() => onResetSection(sec.key)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#9a4406] hover:text-[#7a3404] underline underline-offset-2 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        <span>Reset {sec.label}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Source Evidence & Provenance Chips for this SOAP Section */}
                <div
                  aria-label={`${sec.label} source provenance`}
                  className="flex flex-wrap items-center gap-1.5 pt-0.5"
                >
                  {sectionFindings.length > 0 ? (
                    sectionFindings.map((finding) => {
                      if (finding.sourceSegmentId && finding.sourceTimestamp) {
                        const isSelected = activeSegmentId === finding.sourceSegmentId;
                        return (
                          <button
                            key={finding.id}
                            type="button"
                            onClick={() => onSelectEvidenceSegment(finding.sourceSegmentId!)}
                            aria-pressed={isSelected}
                            className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#00783c] text-white border-[#00783c]'
                                : finding.requiresClarification
                                  ? 'bg-[#feede0] text-[#9a4406] border-[#f26b21]/50 hover:bg-[#fbdcc4]'
                                  : 'bg-white text-[#0d4026] border-[#cde0d4] hover:bg-[#edf5f0]'
                            }`}
                          >
                            <CornerDownRight className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span>
                              {finding.label} · {finding.sourceTimestamp}
                              {finding.requiresClarification ? ' (Clarification needed)' : ''}
                            </span>
                          </button>
                        );
                      }

                      // Genuine honesty when a finding has NO linked transcript segment
                      return (
                        <span
                          key={finding.id}
                          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full bg-white/80 text-[#495057] border border-[#d5e0db]"
                        >
                          <Link2Off className="w-3 h-3 text-[#9a4406] shrink-0" aria-hidden="true" />
                          <span>
                            {finding.label} ({finding.summary}) — No direct transcript segment
                            linked
                          </span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full bg-white/80 text-[#495057] border border-[#d5e0db]">
                      <Link2Off className="w-3 h-3 text-[#495057] shrink-0" aria-hidden="true" />
                      <span>
                        No direct transcript source linked to {sec.label} (clinical synthesis)
                      </span>
                    </span>
                  )}
                </div>

                {/* Editable Textarea OR Read-Only Clinical Text */}
                {canEdit ? (
                  <textarea
                    id={inputId}
                    rows={3}
                    value={currentVal}
                    onChange={(e) => {
                      if (sectionValidationError) {
                        setSectionValidationError(null);
                      }
                      onSoapChange(sec.key, e.target.value);
                    }}
                    className="w-full rounded-[10px] border border-[#b5c7be] bg-white px-3.5 py-2.5 text-sm text-[#242628] leading-relaxed focus:border-[#00783c] focus:outline-none focus:ring-2 focus:ring-[#00783c]/20"
                  />
                ) : (
                  <p className="text-sm text-[#242628] leading-relaxed whitespace-pre-wrap bg-white rounded-[8px] px-3.5 py-2.5 border border-[#e4ece7]">
                    {currentVal}
                  </p>
                )}

                {/* Original AI Draft (v1) Comparison Box */}
                {showOriginalAiComparison && (
                  <div className="rounded-[8px] bg-white border border-[#cde0d4] px-3 py-2 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#00783c]">
                      <span>Original AI-Generated Draft (Revision v1)</span>
                      <span>
                        {currentVal === initialAiVal
                          ? 'Unchanged from v1 AI draft'
                          : 'Modified by clinician'}
                      </span>
                    </div>
                    <p className="text-[#495057] whitespace-pre-wrap leading-relaxed">
                      {initialAiVal}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Draft & Discard Footer Action Bar */}
        {canEdit && (
          <div className="pt-3 border-t border-[#e4ece7] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#495057]">
              {hasUnsavedSoapChanges ? (
                <span className="font-bold text-[#9a4406]">
                  Unsaved SOAP edits detected. Save your draft to create Revision v
                  {report.currentRevision + 1}.
                </span>
              ) : session.review.isDraftSaved ? (
                <span className="font-semibold text-[#00783c]">
                  Draft Revision v{report.currentRevision} saved
                  {session.review.lastSavedAt
                    ? ` at ${formatTimeShort(session.review.lastSavedAt)}`
                    : ''}
                  .
                </span>
              ) : (
                <span>
                  Save progress as a draft at any time. Saving a draft never finalizes or releases
                  the report.
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {hasUnsavedSoapChanges && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isSaving}
                  iconLeft={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                  onClick={onRequestDiscardAll}
                >
                  Discard Unsaved Edits
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={isSaving}
                iconLeft={<Save className="w-4 h-4" aria-hidden="true" />}
                onClick={() => void handleValidateAndSave()}
              >
                {isSaving ? 'Saving Draft…' : 'Save Draft'}
              </Button>
            </div>
          </div>
        )}

        {/* Patient-Facing Care Instructions Preview */}
        <div className="pt-3 border-t border-[#e4ece7] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#0d4026] font-display flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-[#00783c]" aria-hidden="true" />
              <span>Patient-Facing Care Instructions Preview</span>
            </h3>
            <span className="text-[11px] font-semibold text-[#9a4406]">
              {session.release.status === 'released'
                ? 'Released to Patient Portal'
                : session.review.status === 'approved_finalized'
                  ? 'Finalized · Pending explicit release to Patient Portal'
                  : 'Withheld from Patient Portal until clinician approval & release'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-[#edf5f0] rounded-[8px] p-3 border border-[#cde0d4]">
              <strong className="block text-[#0d4026] mb-0.5">Medications</strong>
              <span className="text-[#242628]">{report.patientNextSteps.medicationSummary}</span>
            </div>
            <div className="bg-[#edf5f0] rounded-[8px] p-3 border border-[#cde0d4]">
              <strong className="block text-[#0d4026] mb-0.5">Tests Ordered</strong>
              <span className="text-[#242628]">{report.patientNextSteps.testsOrdered}</span>
            </div>
            <div className="bg-[#edf5f0] rounded-[8px] p-3 border border-[#cde0d4]">
              <strong className="block text-[#0d4026] mb-0.5">Follow-Up</strong>
              <span className="text-[#242628]">{report.patientNextSteps.followUpInstructions}</span>
            </div>
            <div className="bg-[#edf5f0] rounded-[8px] p-3 border border-[#cde0d4]">
              <strong className="block text-[#0d4026] mb-0.5">Care Team Contact</strong>
              <span className="text-[#242628]">{report.patientNextSteps.contactGuidance}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Revision History & Change Awareness Card */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4ece7] pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#00783c]" aria-hidden="true" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0d4026] font-display">
                Draft Revision History &amp; Audit Metadata ({report.revisions.length})
              </h2>
              <p className="text-xs text-[#495057]">
                Traceable record of initial AI generation, clarification resolutions, and clinician
                revisions.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#00783c] bg-[#edf5f0] px-2.5 py-1 rounded border border-[#cde0d4]">
            Active: v{report.currentRevision}
          </span>
        </div>

        {report.revisions.length > 0 ? (
          <ol className="space-y-2.5" aria-label="Report revision history">
            {[...report.revisions].reverse().map((rev) => {
              const isCurrent = rev.revisionNumber === report.currentRevision;
              const isInspected = inspectedRevisionNumber === rev.revisionNumber;
              return (
                <li
                  key={rev.revisionNumber}
                  className={`rounded-[10px] p-3 border text-xs space-y-2 ${
                    isCurrent
                      ? 'bg-[#edf5f0]/70 border-[#00783c]/40'
                      : 'bg-[#f7f8f8] border-[#d5e0db]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-[#0d4026] bg-white px-2 py-0.5 rounded border border-[#cde0d4]">
                        v{rev.revisionNumber}
                      </span>
                      <StatusBadge
                        tone={
                          rev.origin === 'clinician_edit' ||
                          rev.origin === 'clinician_clarification'
                            ? 'success'
                            : 'info'
                        }
                      >
                        {REVISION_ORIGIN_LABELS[rev.origin]}
                      </StatusBadge>
                      <span className="font-semibold text-[#0d4026]">{rev.authorDisplayName}</span>
                      <span className="text-[#495057]">· {formatTimeShort(rev.createdAt)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setInspectedRevisionNumber(isInspected ? null : rev.revisionNumber)
                      }
                      className="text-xs font-bold text-[#00783c] hover:text-[#0d4026] underline underline-offset-2 cursor-pointer"
                    >
                      {isInspected ? `Hide v${rev.revisionNumber} snapshot` : `Inspect v${rev.revisionNumber}`}
                    </button>
                  </div>

                  <p className="text-[#242628]">{rev.changeSummary}</p>

                  {isInspected && inspectedRevision && (
                    <div className="mt-2 pt-2 border-t border-[#cde0d4] bg-white rounded-[8px] p-3 space-y-2">
                      <p className="font-bold text-[#0d4026]">
                        Revision v{inspectedRevision.revisionNumber} Snapshot
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                        <div>
                          <strong className="text-[#00783c] block">Subjective</strong>
                          <p className="text-[#242628] whitespace-pre-wrap">
                            {inspectedRevision.soap.subjective}
                          </p>
                        </div>
                        <div>
                          <strong className="text-[#00783c] block">Objective</strong>
                          <p className="text-[#242628] whitespace-pre-wrap">
                            {inspectedRevision.soap.objective}
                          </p>
                        </div>
                        <div>
                          <strong className="text-[#00783c] block">Assessment</strong>
                          <p className="text-[#242628] whitespace-pre-wrap">
                            {inspectedRevision.soap.assessment}
                          </p>
                        </div>
                        <div>
                          <strong className="text-[#00783c] block">Plan</strong>
                          <p className="text-[#242628] whitespace-pre-wrap">
                            {inspectedRevision.soap.plan}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-xs text-[#495057]">
            No revision history entries recorded for this archived fixture.
          </p>
        )}
      </Card>
    </div>
  );
}
