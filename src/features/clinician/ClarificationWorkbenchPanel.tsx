import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CornerDownRight,
  Edit3,
  MessageSquareWarning,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { ClarificationQuestion } from '../../domain/models';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { formatTimeShort } from './session-formatters';

export interface ClarificationWorkbenchPanelProps {
  readonly clarifications: readonly ClarificationQuestion[];
  readonly unresolvedCount: number;
  readonly canEdit: boolean;
  readonly isSubmitting: boolean;
  readonly activeSegmentId: string | null;
  readonly draftAnswers: Readonly<Record<string, string>>;
  readonly onDraftAnswerChange: (questionId: string, value: string) => void;
  readonly onInspectSegment: (segmentId: string) => void;
  readonly onSaveAnswers: (
    answers: ReadonlyArray<{ questionId: string; responseText: string }>,
  ) => Promise<void>;
  readonly onReopenQuestion: (questionId: string) => Promise<void>;
}

const MIN_CLARIFICATION_LENGTH = 5;

export function ClarificationWorkbenchPanel({
  clarifications,
  unresolvedCount,
  canEdit,
  isSubmitting,
  activeSegmentId,
  draftAnswers,
  onDraftAnswerChange,
  onInspectSegment,
  onSaveAnswers,
  onReopenQuestion,
}: ClarificationWorkbenchPanelProps) {
  const [editingResolvedIds, setEditingResolvedIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const [validationErrors, setValidationErrors] = useState<
    Readonly<Record<string, string>>
  >({});
  const [actionFeedback, setActionFeedback] = useState<{
    readonly tone: 'success' | 'error';
    readonly message: string;
  } | null>(null);

  if (clarifications.length === 0) {
    return null;
  }

  const resolvedCount = clarifications.length - unresolvedCount;

  const toggleEditResolved = (q: ClarificationQuestion, open: boolean) => {
    setActionFeedback(null);
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[q.id];
      return next;
    });
    setEditingResolvedIds((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(q.id);
        if (draftAnswers[q.id] === undefined && q.response?.responseText) {
          onDraftAnswerChange(q.id, q.response.responseText);
        }
      } else {
        next.delete(q.id);
        onDraftAnswerChange(q.id, '');
      }
      return next;
    });
  };

  const handleSaveSingle = async (q: ClarificationQuestion) => {
    setActionFeedback(null);
    const rawValue = draftAnswers[q.id] ?? '';
    const trimmed = rawValue.trim();

    if (trimmed.length < MIN_CLARIFICATION_LENGTH) {
      setValidationErrors((prev) => ({
        ...prev,
        [q.id]:
          trimmed.length === 0
            ? 'Please enter a clinical clarification response before saving.'
            : `Please provide a complete clinical clarification (at least ${MIN_CLARIFICATION_LENGTH} characters).`,
      }));
      return;
    }

    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[q.id];
      return next;
    });

    try {
      await onSaveAnswers([{ questionId: q.id, responseText: trimmed }]);
      setEditingResolvedIds((prev) => {
        const next = new Set(prev);
        next.delete(q.id);
        return next;
      });
      onDraftAnswerChange(q.id, '');
      setActionFeedback({
        tone: 'success',
        message: `Clarification Question ${q.orderIndex} saved and applied to the clinical report draft.`,
      });
    } catch (err) {
      setActionFeedback({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to save clarification response. Please retry.',
      });
    }
  };

  const handleSaveAllOpen = async () => {
    setActionFeedback(null);
    const openQuestions = clarifications.filter(
      (q) => q.status === 'unresolved' || editingResolvedIds.has(q.id),
    );
    const nextErrors: Record<string, string> = {};
    const validAnswers: Array<{ questionId: string; responseText: string }> =
      [];

    for (const q of openQuestions) {
      const trimmed = (draftAnswers[q.id] ?? '').trim();
      if (trimmed.length === 0) {
        nextErrors[q.id] =
          'Please enter a clinical clarification response before saving.';
      } else if (trimmed.length < MIN_CLARIFICATION_LENGTH) {
        nextErrors[q.id] =
          `Please provide a complete clinical clarification (at least ${MIN_CLARIFICATION_LENGTH} characters).`;
      } else {
        validAnswers.push({ questionId: q.id, responseText: trimmed });
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors);
      return;
    }

    if (validAnswers.length === 0) return;

    setValidationErrors({});
    try {
      await onSaveAnswers(validAnswers);
      setEditingResolvedIds(new Set());
      for (const ans of validAnswers) {
        onDraftAnswerChange(ans.questionId, '');
      }
      setActionFeedback({
        tone: 'success',
        message: `Saved ${validAnswers.length} clarification response${validAnswers.length === 1 ? '' : 's'} and updated the report revision.`,
      });
    } catch (err) {
      setActionFeedback({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to save clarification responses. Please retry.',
      });
    }
  };

  const handleReopen = async (q: ClarificationQuestion) => {
    setActionFeedback(null);
    try {
      await onReopenQuestion(q.id);
      if (q.response?.responseText) {
        onDraftAnswerChange(q.id, q.response.responseText);
      }
      setActionFeedback({
        tone: 'success',
        message: `Question ${q.orderIndex} reopened for clinician verification. Report status returned to Clarification Needed.`,
      });
    } catch (err) {
      setActionFeedback({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to reopen clarification question.',
      });
    }
  };

  const openQuestionsCount = clarifications.filter(
    (q) => q.status === 'unresolved' || editingResolvedIds.has(q.id),
  ).length;
  const completionPercent = Math.round(
    (resolvedCount / clarifications.length) * 100,
  );

  return (
    <Card tone="elevated" padding="none" className="overflow-hidden">
      <div className="border-b border-[#dce6e1] bg-gradient-to-r from-white to-[#f4f9f6] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                unresolvedCount > 0
                  ? 'bg-[#fff1e8] text-[#b84e0b]'
                  : 'bg-[#e5f3eb] text-[#00783c]'
              }`}
            >
              <MessageSquareWarning className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#00783c]">
                Clinical review
              </p>
              <h2 className="font-display text-lg font-bold text-[#0d4026] sm:text-xl">
                Clinical Clarification Questions ({clarifications.length})
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#495057] sm:text-sm">
                {unresolvedCount > 0
                  ? 'Verify ambiguous details against the chart and transcript. A response remains a draft until it is explicitly saved.'
                  : 'All flagged details have a recorded clinician response in the current report revision.'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <StatusBadge tone={unresolvedCount > 0 ? 'warning' : 'success'}>
              {unresolvedCount > 0
                ? `${unresolvedCount} Unresolved · ${resolvedCount} Resolved`
                : `All ${clarifications.length} Resolved`}
            </StatusBadge>
            {canEdit && openQuestionsCount > 1 && (
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => void handleSaveAllOpen()}
                className="w-full sm:w-auto"
              >
                Save All Responses ({openQuestionsCount})
              </Button>
            )}
          </div>
        </div>

        <div
          className="mt-4 flex items-center gap-3"
          aria-label={`${completionPercent}% complete`}
        >
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#dce6e1]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={clarifications.length}
            aria-valuenow={resolvedCount}
            aria-label="Clarification questions resolved"
          >
            <div
              className="h-full rounded-full bg-[#00783c] transition-[width] duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-[#495057]">
            {resolvedCount} of {clarifications.length} complete
          </span>
        </div>
      </div>

      {actionFeedback && (
        <div
          role={actionFeedback.tone === 'error' ? 'alert' : 'status'}
          className={`mx-4 mt-4 flex items-start justify-between gap-3 rounded-[10px] border px-3.5 py-2.5 text-xs font-semibold sm:mx-6 ${
            actionFeedback.tone === 'error'
              ? 'bg-[var(--color-danger-soft)] border-[var(--color-danger-border)] text-[var(--color-danger)]'
              : 'bg-[#e8f4ed] border-[#00783c]/40 text-[#0d4026]'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {actionFeedback.tone === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2
                className="w-4 h-4 shrink-0 text-[#00783c]"
                aria-hidden="true"
              />
            )}
            <span>{actionFeedback.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="shrink-0 cursor-pointer rounded text-[11px] underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b]"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-4 p-4 sm:p-6">
        {clarifications.map((item) => {
          const isEditingResolved = editingResolvedIds.has(item.id);
          const isUnresolved = item.status === 'unresolved';
          const showEditor = canEdit && (isUnresolved || isEditingResolved);
          const draftValue = draftAnswers[item.id] ?? '';
          const hasDraftText = draftValue.trim().length > 0;
          const isLinkedSegmentSelected =
            activeSegmentId === item.sourceSegmentId;
          const fieldError = validationErrors[item.id];
          const textareaId = `clarification-input-${item.id}`;
          const helperId = `${textareaId}-helper`;
          const describedBy = fieldError
            ? `${helperId} ${textareaId}-error`
            : helperId;

          return (
            <section
              key={item.id}
              aria-labelledby={`clarification-title-${item.id}`}
              className={`overflow-hidden rounded-[14px] border bg-white transition-all ${
                isLinkedSegmentSelected
                  ? 'border-[#00783c] ring-2 ring-[#00783c]/20'
                  : isUnresolved
                    ? 'border-[#efb58f] shadow-[0_8px_24px_-18px_rgba(154,68,6,0.5)]'
                    : 'border-[#cde0d4]'
              }`}
            >
              <div
                className={`border-l-4 px-4 py-4 sm:px-5 ${
                  isUnresolved ? 'border-l-[#f26b21]' : 'border-l-[#00783c]'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isUnresolved
                          ? 'bg-[#fff1e8] text-[#9a4406]'
                          : 'bg-[#e5f3eb] text-[#00783c]'
                      }`}
                    >
                      {item.orderIndex}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#66726c]">
                        Clarification {item.orderIndex}
                      </p>
                      <h3
                        id={`clarification-title-${item.id}`}
                        className="mt-1 text-sm font-bold leading-snug text-[#0d4026] sm:text-base"
                      >
                        {item.prompt}
                      </h3>
                    </div>
                  </div>
                  <div className="shrink-0 self-start">
                    {isUnresolved ? (
                      <StatusBadge tone="warning">
                        {hasDraftText
                          ? 'Unsaved Response · Requires Save'
                          : 'Requires Physician Input'}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="success">Resolved</StatusBadge>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-[10px] border border-[#dce6e1] bg-[#f7faf8] p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#495057]">
                      Supporting transcript
                    </p>
                    <button
                      type="button"
                      onClick={() => onInspectSegment(item.sourceSegmentId)}
                      aria-pressed={isLinkedSegmentSelected}
                      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[8px] border px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b] sm:min-h-0 sm:justify-start sm:py-1.5 ${
                        isLinkedSegmentSelected
                          ? 'border-[#00783c] bg-[#00783c] text-white'
                          : 'cursor-pointer border-[#cde0d4] bg-white text-[#00783c] hover:bg-[#edf5f0]'
                      }`}
                    >
                      <CornerDownRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      <span>Inspect transcript at {item.sourceTimestamp}</span>
                    </button>
                  </div>
                  <blockquote className="mt-2 border-l-2 border-l-[#00783c] pl-3 text-xs italic leading-relaxed text-[#495057] sm:text-sm">
                    &ldquo;{item.sourceQuote}&rdquo;
                  </blockquote>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[#3f4844] sm:text-[13px]">
                  <strong className="text-[#0d4026]">
                    Why this needs review:
                  </strong>{' '}
                  {item.clinicalRationale}
                </p>
              </div>

              {showEditor ? (
                <div className="space-y-3 border-t border-[#e4ece7] bg-[#fbfcfb] px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor={textareaId}
                      className="text-xs font-bold text-[#0d4026]"
                    >
                      Clinician clarification response (Question{' '}
                      {item.orderIndex})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        onDraftAnswerChange(item.id, item.defaultDemoAnswer);
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        });
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded text-[11.5px] font-bold text-[#00783c] underline underline-offset-2 hover:text-[#0d4026] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b]"
                    >
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      <span>Use chart-verified note</span>
                    </button>
                  </div>

                  <textarea
                    id={textareaId}
                    rows={4}
                    value={draftValue}
                    onChange={(e) => {
                      onDraftAnswerChange(item.id, e.target.value);
                      if (validationErrors[item.id]) {
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        });
                      }
                    }}
                    placeholder={`Enter verified clinical response for Question ${item.orderIndex}…`}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={describedBy}
                    className="min-h-28 w-full resize-y rounded-[10px] border border-[#aebfb6] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#242628] shadow-inner focus:border-[#00783c] focus:outline-none focus:ring-2 focus:ring-[#00783c]/20"
                  />

                  {fieldError && (
                    <p
                      id={`${textareaId}-error`}
                      role="alert"
                      className="text-xs font-semibold text-[var(--color-danger)] flex items-center gap-1.5"
                    >
                      <AlertCircle
                        className="w-3.5 h-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{fieldError}</span>
                    </p>
                  )}

                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <span
                      id={helperId}
                      className="text-[11px] leading-relaxed text-[#495057]"
                    >
                      {isEditingResolved
                        ? 'Saving will record a new report revision with your updated clarification.'
                        : 'Response remains a local draft until you click Save Clarification Response.'}
                    </span>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                      {isEditingResolved && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => toggleEditResolved(item, false)}
                          className="w-full sm:w-auto"
                        >
                          Cancel Edit
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => void handleSaveSingle(item)}
                        className="w-full sm:w-auto"
                      >
                        {isEditingResolved
                          ? 'Update Clarification Response'
                          : 'Save Clarification Response'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : item.status === 'resolved' && item.response ? (
                <div className="space-y-3 border-t border-[#cde0d4] bg-[#f1f8f4] px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00783c]">
                      <CheckCircle2
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      />
                      <span>
                        Clinician Response ·{' '}
                        {item.response.respondedByDisplayName} (
                        {formatTimeShort(item.response.respondedAt)})
                      </span>
                    </span>

                    {canEdit && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => toggleEditResolved(item, true)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded text-xs font-bold text-[#00783c] underline underline-offset-2 hover:text-[#0d4026] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#02754b] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Edit3 className="w-3 h-3" aria-hidden="true" />
                          <span>Edit Response</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void handleReopen(item)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded text-xs font-bold text-[#9a4406] underline underline-offset-2 hover:text-[#7a3404] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a4406] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          <span>Reopen Question</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap rounded-[8px] border border-[#cde0d4] bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-[#0d4026]">
                    {item.response.responseText}
                  </p>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </Card>
  );
}
