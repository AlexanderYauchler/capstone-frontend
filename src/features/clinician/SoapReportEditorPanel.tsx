import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CornerDownRight,
  Eye,
  FileCheck2,
  History,
  Link2,
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
  readonly letter: string;
  readonly description: string;
  readonly minHeightClass: string;
}> = [
  {
    key: 'subjective',
    label: 'Subjective',
    letter: 'S',
    description:
      'Symptoms, interval history, and information reported by the patient.',
    minHeightClass: 'min-h-36',
  },
  {
    key: 'objective',
    label: 'Objective',
    letter: 'O',
    description:
      'Observed findings, reviewed logs, measurements, and examination details.',
    minHeightClass: 'min-h-32',
  },
  {
    key: 'assessment',
    label: 'Assessment',
    letter: 'A',
    description:
      'Clinical synthesis, differential considerations, and problem status.',
    minHeightClass: 'min-h-32',
  },
  {
    key: 'plan',
    label: 'Plan',
    letter: 'P',
    description: 'Medications, orders, education, and follow-up instructions.',
    minHeightClass: 'min-h-36',
  },
];

const REVISION_ORIGIN_LABELS: Record<ReportRevision['origin'], string> = {
  ai_initial_draft: 'AI draft',
  clinician_clarification: 'Clarification',
  clinician_edit: 'Clinician edit',
  ai_regenerated_draft: 'Revised AI draft',
};

function inferFindingSection(finding: ProvenanceFinding): SoapSectionKey {
  if (finding.soapSection) return finding.soapSection;
  const lower = `${finding.label} ${finding.summary}`.toLowerCase();
  if (
    lower.includes('symptom') ||
    lower.includes('adherence') ||
    lower.includes('headache')
  ) {
    return 'subjective';
  }
  if (
    lower.includes('glucose') ||
    lower.includes('bp') ||
    lower.includes('vital')
  ) {
    return 'objective';
  }
  return 'plan';
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
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
  const [showOriginalAiComparison, setShowOriginalAiComparison] =
    useState(false);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [inspectedRevisionNumber, setInspectedRevisionNumber] = useState<
    number | null
  >(null);
  const [sectionValidationError, setSectionValidationError] = useState<
    string | null
  >(null);

  const initialAiRevision =
    report.revisions.find(
      (revision) => revision.origin === 'ai_initial_draft',
    ) ?? report.revisions[0];
  const initialAiSoap: SoapSections = initialAiRevision?.soap ?? report.soap;
  const isFinalized = session.review.status === 'approved_finalized';

  const handleValidateAndSave = async () => {
    onClearFeedback();
    const emptySections = SOAP_SECTION_META.filter(
      (section) => draftSoap[section.key].trim().length === 0,
    ).map((section) => section.label);
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
      ? (report.revisions.find(
          (revision) => revision.revisionNumber === inspectedRevisionNumber,
        ) ?? null)
      : null;

  return (
    <div className="space-y-5">
      <Card padding="none" tone="elevated" className="overflow-hidden">
        <header className="border-b border-[#dce6e1] bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold leading-tight text-[#0d4026] font-display sm:text-2xl">
                  SOAP Note
                  <span className="sr-only">
                    {' '}
                    — Structured Clinical Report (Revision v
                    {report.currentRevision})
                  </span>
                </h2>
                <span className="rounded-md border border-[#cde0d4] bg-[#f7f8f8] px-2 py-1 font-mono text-[11px] font-bold text-[#0d4026]">
                  v{report.currentRevision}
                </span>
                <StatusBadge tone={derived.badgeTone} showIcon={false}>
                  {derived.badgeLabel}
                </StatusBadge>
                {hasUnsavedSoapChanges ? (
                  <StatusBadge tone="warning">Unsaved SOAP Edits</StatusBadge>
                ) : session.review.isDraftSaved && !isFinalized ? (
                  <StatusBadge tone="success">
                    Saved
                    {session.review.lastSavedAt
                      ? ` · ${formatTimeShort(session.review.lastSavedAt)}`
                      : ''}
                  </StatusBadge>
                ) : null}
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-[#495057]">
                {isFinalized
                  ? `Approved by ${session.review.approvedByDisplayName ?? report.clinicianName}. This note is locked.`
                  : 'Review each section, verify linked transcript evidence, and save your edits before final sign-off.'}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#495057]">
                <span>
                  <strong className="text-[#0d4026]">Template:</strong>{' '}
                  {report.templateId === 'soap_standard'
                    ? 'Standard SOAP'
                    : 'Narrative visit summary'}
                </span>
                <span
                  aria-hidden="true"
                  className="hidden text-[#9fb3a8] sm:inline"
                >
                  •
                </span>
                <span>
                  {report.isSimulatedAiOutput
                    ? 'Simulated AI draft'
                    : 'AI draft'}{' '}
                  · Clinician review required
                </span>
              </div>
            </div>
            {initialAiRevision && (
              <Button
                variant={showOriginalAiComparison ? 'soft' : 'secondary'}
                size="sm"
                className="self-start"
                iconLeft={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                aria-pressed={showOriginalAiComparison}
                onClick={() =>
                  setShowOriginalAiComparison((current) => !current)
                }
              >
                {showOriginalAiComparison
                  ? 'Hide Original AI Draft (v1)'
                  : 'Compare Original AI Draft (v1)'}
              </Button>
            )}
          </div>

          <nav
            aria-label="Jump to SOAP section"
            className="mt-4 grid grid-cols-4 gap-1 rounded-[10px] border border-[#cde0d4] bg-[#edf5f0] p-1 sm:flex sm:w-fit"
          >
            {SOAP_SECTION_META.map((section) => (
              <a
                key={section.key}
                href={`#soap-section-${section.key}`}
                className="rounded-[7px] px-2 py-1.5 text-center text-xs font-bold text-[#0d4026] transition-colors hover:bg-white hover:text-[#00783c] sm:min-w-24"
              >
                <span className="sm:hidden">{section.letter}</span>
                <span className="hidden sm:inline">{section.label}</span>
              </a>
            ))}
          </nav>
        </header>

        <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
          {!isFinalized ? (
            <div className="flex flex-col gap-2 rounded-[10px] border border-[#cde0d4] bg-[#edf5f0] px-3.5 py-3 text-xs text-[#0d4026] sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-start gap-2 leading-relaxed sm:items-center">
                <Sparkles
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#00783c] sm:mt-0"
                  aria-hidden="true"
                />
                <span>
                  <strong>Draft for review.</strong> Linked sources support
                  verification; they do not replace clinician judgment.
                </span>
              </span>
              {session.review.unresolvedClarificationCount > 0 && (
                <span className="shrink-0 font-bold text-[#9a4406]">
                  {session.review.unresolvedClarificationCount} clarification
                  {session.review.unresolvedClarificationCount === 1
                    ? ''
                    : 's'}{' '}
                  open
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-[10px] border border-[#d5e0db] bg-[#f7f8f8] px-3.5 py-3 text-xs text-[#495057] sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2">
                <Lock
                  className="h-4 w-4 shrink-0 text-[#00783c]"
                  aria-hidden="true"
                />
                <span>
                  <strong className="text-[#0d4026]">
                    Final clinical record.
                  </strong>{' '}
                  Approved at {formatTimeShort(session.review.approvedAt)} and
                  locked from further editing.
                </span>
              </span>
              <span className="shrink-0 font-semibold text-[#0d4026]">
                {report.isSimulatedAiOutput ? 'Simulated AI draft' : 'AI draft'}{' '}
                · Clinician approved
              </span>
            </div>
          )}

          {sectionValidationError && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-[10px] border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-3.5 py-3 text-xs font-semibold text-[var(--color-danger)] sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="inline-flex items-start gap-1.5">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{sectionValidationError}</span>
              </span>
              <button
                type="button"
                onClick={() => setSectionValidationError(null)}
                className="self-start font-bold underline hover:no-underline sm:self-auto"
              >
                Dismiss
              </button>
            </div>
          )}

          {saveFeedback && (
            <div
              role={saveFeedback.tone === 'error' ? 'alert' : 'status'}
              className={`flex flex-col gap-2 rounded-[10px] border px-3.5 py-3 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between ${saveFeedback.tone === 'error' ? 'border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]' : 'border-[#00783c]/40 bg-[#e8f4ed] text-[#0d4026]'}`}
            >
              <span className="inline-flex items-start gap-1.5 sm:items-center">
                {saveFeedback.tone === 'error' ? (
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#00783c] sm:mt-0"
                    aria-hidden="true"
                  />
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
                  className="text-[11px] font-bold underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {SOAP_SECTION_META.map((section) => {
              const currentValue = draftSoap[section.key];
              const savedValue = report.soap[section.key];
              const initialAiValue = initialAiSoap[section.key];
              const isDirty = currentValue !== savedValue;
              const isClinicianEdited = savedValue !== initialAiValue;
              const sectionFindings = report.provenanceFindings.filter(
                (finding) => inferFindingSection(finding) === section.key,
              );
              const linkedFindingCount = sectionFindings.filter(
                (finding) => finding.sourceSegmentId && finding.sourceTimestamp,
              ).length;
              const hasActiveLinkedEvidence = sectionFindings.some(
                (finding) => finding.sourceSegmentId === activeSegmentId,
              );
              const inputId = `soap-editor-${section.key}`;
              const descriptionId = `${inputId}-description`;
              const evidenceId = `${inputId}-evidence`;
              const isEmptyAfterValidation = Boolean(
                sectionValidationError && currentValue.trim().length === 0,
              );

              return (
                <section
                  key={section.key}
                  id={`soap-section-${section.key}`}
                  className={`scroll-mt-24 overflow-hidden rounded-[14px] border bg-white transition-colors ${
                    hasActiveLinkedEvidence
                      ? 'border-[#00783c] ring-2 ring-[#00783c]/20'
                      : isDirty
                        ? 'border-[#f26b21]/70'
                        : 'border-[#d5e0db]'
                  }`}
                >
                  <div
                    className={`flex flex-col gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between ${
                      hasActiveLinkedEvidence
                        ? 'border-[#00783c]/30 bg-[#edf5f0]'
                        : isDirty
                          ? 'border-[#f26b21]/30 bg-[#fff9f4]'
                          : 'border-[#e4ece7] bg-[#f7f8f8]/80'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00783c] text-sm font-bold text-white"
                      >
                        {section.letter}
                      </span>
                      <div className="min-w-0">
                        <h3
                          id={`${inputId}-heading`}
                          className="text-base font-bold leading-tight text-[#0d4026] font-display"
                        >
                          <label htmlFor={canEdit ? inputId : undefined}>
                            {section.label}
                          </label>
                        </h3>
                        <p
                          id={descriptionId}
                          className="mt-0.5 text-xs leading-relaxed text-[#495057]"
                        >
                          {section.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-11 sm:justify-end sm:pl-0">
                      {isDirty ? (
                        <StatusBadge tone="warning" showIcon={false}>
                          Unsaved
                        </StatusBadge>
                      ) : isFinalized ? (
                        <StatusBadge tone="success" showIcon={false}>
                          Final
                        </StatusBadge>
                      ) : isClinicianEdited ? (
                        <StatusBadge tone="info" showIcon={false}>
                          Clinician edit
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral" showIcon={false}>
                          AI draft
                        </StatusBadge>
                      )}
                      {canEdit && isDirty && (
                        <button
                          type="button"
                          onClick={() => onResetSection(section.key)}
                          className="inline-flex items-center gap-1 rounded px-1 py-1 text-xs font-bold text-[#9a4406] underline underline-offset-2 hover:text-[#7a3404]"
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden="true" />
                          <span>Reset</span>
                          <span className="sr-only"> {section.label}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    {canEdit ? (
                      <div>
                        <textarea
                          id={inputId}
                          rows={5}
                          value={currentValue}
                          aria-describedby={`${descriptionId} ${evidenceId}`}
                          aria-invalid={isEmptyAfterValidation || undefined}
                          onChange={(event) => {
                            if (sectionValidationError)
                              setSectionValidationError(null);
                            onSoapChange(section.key, event.target.value);
                          }}
                          className={`w-full resize-y rounded-[10px] border bg-white px-3.5 py-3 text-[15px] leading-7 text-[#242628] shadow-[inset_0_1px_2px_rgba(13,64,38,0.04)] focus:border-[#00783c] focus:outline-none focus:ring-2 focus:ring-[#00783c]/20 ${section.minHeightClass} ${isEmptyAfterValidation ? 'border-[var(--color-danger)]' : 'border-[#b5c7be]'}`}
                        />
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[#6a746f]">
                          <span>
                            Resize the field by dragging its lower edge.
                          </span>
                          <span className="tabular-nums">
                            {countWords(currentValue)} words
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap rounded-[10px] border border-[#e4ece7] bg-[#fcfdfc] px-3.5 py-3 text-[15px] leading-7 text-[#242628]">
                        {currentValue}
                      </p>
                    )}

                    <div
                      id={evidenceId}
                      aria-label={`${section.label} source provenance`}
                      className="rounded-[10px] border border-[#dce6e1] bg-[#f7f8f8] p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0d4026]">
                          <Link2
                            className="h-3.5 w-3.5 text-[#00783c]"
                            aria-hidden="true"
                          />
                          Transcript evidence
                        </span>
                        <span className="text-[11px] font-semibold text-[#495057]">
                          {linkedFindingCount > 0
                            ? `${linkedFindingCount} linked source${linkedFindingCount === 1 ? '' : 's'}`
                            : 'No direct source'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {sectionFindings.length > 0 ? (
                          sectionFindings.map((finding) => {
                            if (
                              finding.sourceSegmentId &&
                              finding.sourceTimestamp
                            ) {
                              const isSelected =
                                activeSegmentId === finding.sourceSegmentId;
                              return (
                                <button
                                  key={finding.id}
                                  type="button"
                                  onClick={() =>
                                    onSelectEvidenceSegment(
                                      finding.sourceSegmentId!,
                                    )
                                  }
                                  aria-pressed={isSelected}
                                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-[11.5px] font-semibold transition-colors ${
                                    isSelected
                                      ? 'border-[#00783c] bg-[#00783c] text-white'
                                      : finding.requiresClarification
                                        ? 'border-[#f26b21]/50 bg-[#feede0] text-[#9a4406] hover:bg-[#fbdcc4]'
                                        : 'border-[#cde0d4] bg-white text-[#0d4026] hover:border-[#00783c] hover:bg-[#edf5f0]'
                                  }`}
                                >
                                  <CornerDownRight
                                    className="h-3 w-3 shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>
                                    {finding.label} · {finding.sourceTimestamp}
                                    {finding.requiresClarification
                                      ? ' · Clarify'
                                      : ''}
                                  </span>
                                </button>
                              );
                            }
                            return (
                              <span
                                key={finding.id}
                                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#d5e0db] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#495057]"
                              >
                                <Link2Off
                                  className="h-3 w-3 shrink-0 text-[#9a4406]"
                                  aria-hidden="true"
                                />
                                <span>
                                  {finding.label} ({finding.summary}) — No
                                  direct transcript segment linked
                                </span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#d5e0db] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#495057]">
                            <Link2Off
                              className="h-3 w-3 shrink-0"
                              aria-hidden="true"
                            />
                            <span>
                              No direct transcript source linked to{' '}
                              {section.label} (clinical synthesis)
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {showOriginalAiComparison && (
                      <div className="rounded-[10px] border border-[#cde0d4] bg-[#edf5f0]/60 p-3 text-xs">
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold text-[#00783c]">
                          <span>Original AI-Generated Draft (Revision v1)</span>
                          <span className="text-[#495057]">
                            {currentValue === initialAiValue
                              ? 'No changes'
                              : 'Clinician modified'}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-[#495057]">
                          {initialAiValue}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          {canEdit && (
            <div className="sticky bottom-3 z-10 rounded-[12px] border border-[#b8dcc7] bg-white/95 p-3 shadow-[0_12px_30px_-12px_rgba(13,64,38,0.32)] backdrop-blur sm:p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-xs leading-relaxed text-[#495057]">
                  {hasUnsavedSoapChanges ? (
                    <span className="inline-flex items-start gap-1.5 font-semibold text-[#9a4406] sm:items-center">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f26b21] sm:mt-0"
                        aria-hidden="true"
                      />
                      Unsaved changes will create Revision v
                      {report.currentRevision + 1}.
                    </span>
                  ) : session.review.isDraftSaved ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#00783c]">
                      <CheckCircle2
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      Revision v{report.currentRevision} saved
                      {session.review.lastSavedAt
                        ? ` at ${formatTimeShort(session.review.lastSavedAt)}`
                        : ''}
                      .
                    </span>
                  ) : (
                    <span>
                      Saving preserves a draft; it does not finalize or release
                      the report.
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
                  {hasUnsavedSoapChanges && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isSaving}
                      iconLeft={
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      }
                      onClick={onRequestDiscardAll}
                      className="w-full sm:w-auto"
                    >
                      Discard Changes
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSaving}
                    iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => void handleValidateAndSave()}
                    className="w-full sm:w-auto"
                  >
                    {isSaving ? 'Saving…' : 'Save Draft'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-[#e4ece7] pt-4">
            <details className="group rounded-[10px] border border-[#d5e0db] bg-[#f7f8f8]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-sm font-bold text-[#0d4026] marker:content-none">
                <span className="inline-flex items-center gap-2">
                  <FileCheck2
                    className="h-4 w-4 text-[#00783c]"
                    aria-hidden="true"
                  />
                  Patient care instructions preview
                </span>
                <ChevronDown
                  className="h-4 w-4 text-[#00783c] transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-t border-[#d5e0db] p-3.5">
                <p className="mb-3 text-[11px] font-semibold text-[#9a4406]">
                  {session.release.status === 'released'
                    ? 'Released to Patient Portal'
                    : session.review.status === 'approved_finalized'
                      ? 'Finalized · Pending explicit release to Patient Portal'
                      : 'Withheld until clinician approval and release'}
                </p>
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  {[
                    ['Medications', report.patientNextSteps.medicationSummary],
                    ['Tests ordered', report.patientNextSteps.testsOrdered],
                    ['Follow-up', report.patientNextSteps.followUpInstructions],
                    [
                      'Care team contact',
                      report.patientNextSteps.contactGuidance,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[8px] border border-[#cde0d4] bg-white p-3"
                    >
                      <strong className="mb-0.5 block text-[#0d4026]">
                        {label}
                      </strong>
                      <span className="leading-relaxed text-[#242628]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <button
          type="button"
          aria-expanded={showRevisionHistory}
          aria-controls="soap-revision-history"
          onClick={() => setShowRevisionHistory((current) => !current)}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-[#f7f8f8] sm:px-6"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf5f0] text-[#00783c]">
              <History className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[#0d4026] sm:text-base font-display">
                Revision history
              </span>
              <span className="block text-xs leading-relaxed text-[#495057]">
                {report.revisions.length} revision
                {report.revisions.length === 1 ? '' : 's'} · Active v
                {report.currentRevision} · Original AI draft preserved
              </span>
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-[#00783c] transition-transform ${showRevisionHistory ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {showRevisionHistory && (
          <div
            id="soap-revision-history"
            className="border-t border-[#e4ece7] px-4 py-4 sm:px-6"
          >
            {report.revisions.length > 0 ? (
              <ol className="space-y-2" aria-label="Report revision history">
                {[...report.revisions].reverse().map((revision) => {
                  const isCurrent =
                    revision.revisionNumber === report.currentRevision;
                  const isInspected =
                    inspectedRevisionNumber === revision.revisionNumber;
                  return (
                    <li
                      key={revision.revisionNumber}
                      className={`rounded-[10px] border p-3 text-xs ${isCurrent ? 'border-[#00783c]/40 bg-[#edf5f0]/70' : 'border-[#d5e0db] bg-[#f7f8f8]'}`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded border border-[#cde0d4] bg-white px-2 py-0.5 font-mono font-bold text-[#0d4026]">
                              v{revision.revisionNumber}
                            </span>
                            <StatusBadge
                              tone={
                                revision.origin === 'clinician_edit' ||
                                revision.origin === 'clinician_clarification'
                                  ? 'success'
                                  : 'info'
                              }
                              showIcon={false}
                            >
                              {REVISION_ORIGIN_LABELS[revision.origin]}
                            </StatusBadge>
                            {isCurrent && (
                              <span className="font-bold text-[#00783c]">
                                Current
                              </span>
                            )}
                            <span className="text-[#495057]">
                              {revision.authorDisplayName} ·{' '}
                              {formatTimeShort(revision.createdAt)}
                            </span>
                          </div>
                          <p className="leading-relaxed text-[#242628]">
                            {revision.changeSummary}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-expanded={isInspected}
                          onClick={() =>
                            setInspectedRevisionNumber(
                              isInspected ? null : revision.revisionNumber,
                            )
                          }
                          className="shrink-0 self-start rounded px-1 py-1 text-xs font-bold text-[#00783c] underline underline-offset-2 hover:text-[#0d4026] sm:self-auto"
                        >
                          {isInspected ? 'Hide snapshot' : 'View snapshot'}
                          <span className="sr-only">
                            {' '}
                            for revision v{revision.revisionNumber}
                          </span>
                        </button>
                      </div>

                      {isInspected && inspectedRevision && (
                        <div className="mt-3 rounded-[8px] border border-[#cde0d4] bg-white p-3">
                          <p className="mb-2 font-bold text-[#0d4026]">
                            Revision v{inspectedRevision.revisionNumber}{' '}
                            snapshot
                          </p>
                          <div className="grid grid-cols-1 gap-3 text-[11.5px] sm:grid-cols-2">
                            {SOAP_SECTION_META.map((section) => (
                              <div key={section.key}>
                                <strong className="mb-0.5 block text-[#00783c]">
                                  {section.label}
                                </strong>
                                <p className="whitespace-pre-wrap leading-relaxed text-[#242628]">
                                  {inspectedRevision.soap[section.key]}
                                </p>
                              </div>
                            ))}
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
          </div>
        )}
      </Card>
    </div>
  );
}
