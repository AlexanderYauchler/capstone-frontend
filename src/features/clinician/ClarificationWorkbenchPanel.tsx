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
  const [editingResolvedIds, setEditingResolvedIds] = useState<ReadonlySet<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Readonly<Record<string, string>>>({});
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
    const validAnswers: Array<{ questionId: string; responseText: string }> = [];

    for (const q of openQuestions) {
      const trimmed = (draftAnswers[q.id] ?? '').trim();
      if (trimmed.length === 0) {
        nextErrors[q.id] = 'Please enter a clinical clarification response before saving.';
      } else if (trimmed.length < MIN_CLARIFICATION_LENGTH) {
        nextErrors[q.id] = `Please provide a complete clinical clarification (at least ${MIN_CLARIFICATION_LENGTH} characters).`;
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
          err instanceof Error ? err.message : 'Unable to reopen clarification question.',
      });
    }
  };

  const openQuestionsCount = clarifications.filter(
    (q) => q.status === 'unresolved' || editingResolvedIds.has(q.id),
  ).length;

  return (
    <Card
      tone={unresolvedCount > 0 ? 'peach' : 'mint'}
      padding="md"
      className={
        unresolvedCount > 0
          ? 'space-y-4 border-[#f26b21]/50'
          : 'space-y-4 border-[#00783c]/40'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#056233]/20 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MessageSquareWarning
              className={`w-5 h-5 ${unresolvedCount > 0 ? 'text-[#f26b21]' : 'text-[#00783c]'}`}
              aria-hidden="true"
            />
            <h2 className="text-lg font-bold text-[#0d4026] font-display">
              Clinical Clarification Questions ({clarifications.length})
            </h2>
          </div>
          <p className="text-xs text-[#495057]">
            {unresolvedCount > 0
              ? 'Resolve ambiguous clinical details below. Typing an answer does not resolve a blocker until you explicitly save the response.'
              : 'All flagged clinical clarification questions have been answered and recorded in the current draft revision.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            >
              Save All Responses ({openQuestionsCount})
            </Button>
          )}
        </div>
      </div>

      {actionFeedback && (
        <div
          role={actionFeedback.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-[10px] px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 border ${
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

      <div className="space-y-3.5">
        {clarifications.map((item) => {
          const isEditingResolved = editingResolvedIds.has(item.id);
          const isUnresolved = item.status === 'unresolved';
          const showEditor = canEdit && (isUnresolved || isEditingResolved);
          const draftValue = draftAnswers[item.id] ?? '';
          const hasDraftText = draftValue.trim().length > 0;
          const isLinkedSegmentSelected = activeSegmentId === item.sourceSegmentId;
          const fieldError = validationErrors[item.id];
          const textareaId = `clarification-input-${item.id}`;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-[12px] p-4 border transition-colors space-y-3 ${
                isLinkedSegmentSelected
                  ? 'border-[#00783c] ring-2 ring-[#00783c]/25'
                  : isUnresolved
                    ? 'border-[#f26b21]/50'
                    : 'border-[#056233]/25'
              }`}
            >
              {/* Top Metadata & Source Timestamp Link */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9a4406]">
                    Question {item.orderIndex}
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspectSegment(item.sourceSegmentId)}
                    aria-pressed={isLinkedSegmentSelected}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                      isLinkedSegmentSelected
                        ? 'bg-[#00783c] text-white border-[#00783c]'
                        : 'bg-[#edf5f0] text-[#00783c] border-[#cde0d4] hover:bg-[#dcebe2]'
                    }`}
                  >
                    <CornerDownRight className="w-3 h-3" aria-hidden="true" />
                    <span>Inspect transcript at {item.sourceTimestamp}</span>
                  </button>
                </div>

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

              {/* Question Prompt & Verbatim Quote */}
              <div className="space-y-1.5">
                <h3 className="text-sm sm:text-base font-bold text-[#0d4026]">{item.prompt}</h3>
                <blockquote className="text-xs italic text-[#495057] bg-[#f7f8f8] px-3 py-2 rounded border-l-3 border-l-[#00783c]">
                  &ldquo;{item.sourceQuote}&rdquo;
                </blockquote>
                <p className="text-xs text-[#242628]">
                  <strong>Clinical rationale:</strong> {item.clinicalRationale}
                </p>
              </div>

              {/* Interactive Response Editor OR Saved Response Display */}
              {showEditor ? (
                <div className="space-y-2.5 pt-2 border-t border-[#e4ece7]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor={textareaId}
                      className="text-xs font-bold text-[#0d4026]"
                    >
                      Clinician clarification response (Question {item.orderIndex})
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
                      className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#00783c] hover:text-[#0d4026] underline underline-offset-2 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      <span>Use chart-verified note</span>
                    </button>
                  </div>

                  <textarea
                    id={textareaId}
                    rows={2}
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
                    aria-describedby={fieldError ? `${textareaId}-error` : undefined}
                    className="w-full rounded-[10px] border border-[#b5c7be] bg-white px-3 py-2 text-sm text-[#242628] focus:border-[#00783c] focus:outline-none focus:ring-2 focus:ring-[#00783c]/20"
                  />

                  {fieldError && (
                    <p
                      id={`${textareaId}-error`}
                      role="alert"
                      className="text-xs font-semibold text-[var(--color-danger)] flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{fieldError}</span>
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-[#495057]">
                      {isEditingResolved
                        ? 'Saving will record a new report revision with your updated clarification.'
                        : 'Response remains a local draft until you click Save Clarification Response.'}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {isEditingResolved && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => toggleEditResolved(item, false)}
                        >
                          Cancel Edit
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => void handleSaveSingle(item)}
                      >
                        {isEditingResolved
                          ? 'Update Clarification Response'
                          : 'Save Clarification Response'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : item.status === 'resolved' && item.response ? (
                <div className="rounded-[10px] bg-[#edf5f0] border border-[#cde0d4] p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00783c]">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        Clinician Response · {item.response.respondedByDisplayName} (
                        {formatTimeShort(item.response.respondedAt)})
                      </span>
                    </span>

                    {canEdit && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => toggleEditResolved(item, true)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#00783c] hover:text-[#0d4026] underline underline-offset-2 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" aria-hidden="true" />
                          <span>Edit Response</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void handleReopen(item)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#9a4406] hover:text-[#7a3404] underline underline-offset-2 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          <span>Reopen Question</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#0d4026] whitespace-pre-wrap">
                    {item.response.responseText}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
