import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Mic, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useServices } from '../../app/providers/ServiceProvider';
import { invalidateWorkspaceQueries } from '../../app/query-keys';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { StepProgress } from '../../design-system/components/StepProgress';
import type { PipelineStageState, RecordingMetadata } from '../../domain/models';
import type { DerivedSessionDisplay } from '../../domain/state-machines';
import type { ClinicalSession } from '../../domain/models';
import type { SessionReviewBundle } from '../../services/contracts';

// ============================================================================
// Processing / next-step panel for visits that do not have a reviewable draft yet.
// Processing is simulated in demo mode: stages advance on a timer and then the
// demo service attaches a clearly labeled simulated draft.
// ============================================================================

const SIMULATED_STAGE_MS = 1100;

const DEFAULT_STAGE_LABELS: ReadonlyArray<Pick<PipelineStageState, 'key' | 'label'>> = [
  { key: 'audio_validation', label: 'Check audio' },
  { key: 'speech_transcription', label: 'Transcribe conversation (simulated)' },
  { key: 'speaker_attribution', label: 'Identify speakers (simulated)' },
  { key: 'structured_report', label: 'Draft SOAP report (simulated)' },
  { key: 'clinician_review', label: 'Ready for your review' },
];

function buildAnimatedStages(tick: number): PipelineStageState[] {
  return DEFAULT_STAGE_LABELS.map((stage, index) => ({
    ...stage,
    status: index < tick ? 'complete' : index === tick ? 'in_progress' : 'waiting',
    detailMessage:
      index < tick ? 'Done' : index === tick ? 'Working on this step…' : 'Waiting for the previous step',
  }));
}

export interface ProcessingStatusPanelProps {
  readonly session: ClinicalSession;
  readonly recording?: RecordingMetadata;
  readonly derived: DerivedSessionDisplay;
  readonly onBundleUpdated: (bundle: SessionReviewBundle) => void;
}

export function ProcessingStatusPanel({
  session,
  recording,
  derived,
  onBundleUpdated,
}: ProcessingStatusPanelProps) {
  const services = useServices();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completionStartedRef = useRef(false);

  const isRunning = derived.code === 'PROCESSING' || derived.code === 'REGENERATING_DRAFT';
  const isRegeneration = derived.code === 'REGENERATING_DRAFT';

  // Simulated pipeline: advance one stage per interval, then complete via the demo service.
  useEffect(() => {
    if (!isRunning) return undefined;
    completionStartedRef.current = false;
    const intervalId = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, SIMULATED_STAGE_MS);
    return () => window.clearInterval(intervalId);
  }, [isRunning, session.id]);

  useEffect(() => {
    if (!isRunning || tick < DEFAULT_STAGE_LABELS.length || completionStartedRef.current) return;
    completionStartedRef.current = true;
    const complete = isRegeneration
      ? services.review.completeRegeneration(session.id)
      : services.processing.completeProcessingPipelineDemo(session.id);
    complete
      .then(async (bundle) => {
        onBundleUpdated(bundle);
        await invalidateWorkspaceQueries(queryClient);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Simulated processing could not finish.');
      });
  }, [isRegeneration, isRunning, onBundleUpdated, queryClient, services, session.id, tick]);

  const runAction = async (action: () => Promise<unknown>) => {
    setIsWorking(true);
    setError(null);
    try {
      await action();
      setTick(0);
      await invalidateWorkspaceQueries(queryClient);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action could not be completed.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleGenerateDraft = () =>
    runAction(async () => {
      const recordingId = recording?.id ?? session.capture.recordingId;
      if (!recordingId) throw new Error('No saved recording was found for this visit.');
      const origin =
        recording?.origin ??
        (session.capture.origin === 'unselected' ? 'simulated_demo_audio' : session.capture.origin);
      await services.processing.startProcessingPipeline({
        sessionId: session.id,
        recordingId,
        origin,
        templateId: session.templateId,
      });
    });

  const handleRetry = () => runAction(() => services.processing.retryProcessingPipeline(session.id));

  const handleDiscardAndRecordAgain = async () => {
    await runAction(() => services.capture.discardRecording(session.id));
    void navigate(`/clinician/sessions/${session.id}/record`);
  };

  const retryLimitReached = session.processing.retryCount >= session.processing.maxRetries;

  return (
    <Card padding="md" className="space-y-4" aria-labelledby={`processing-heading-${session.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e4ece7] pb-3">
        <div>
          <h2
            id={`processing-heading-${session.id}`}
            className="text-lg font-bold text-[#0d4026] font-display"
          >
            {isRunning
              ? isRegeneration
                ? 'Preparing a revised draft'
                : 'Preparing the draft report'
              : derived.code === 'PROCESSING_INTERRUPTED'
                ? 'Processing stopped'
                : derived.code === 'RECORDING_READY'
                  ? 'Recording saved · draft not generated yet'
                  : 'This visit has not been recorded yet'}
          </h2>
          <p className="text-xs sm:text-sm text-[#495057] mt-0.5">
            {isRunning
              ? 'Simulated processing for the demo. No real transcription or AI service is called.'
              : derived.code === 'PROCESSING_INTERRUPTED'
                ? `The demo pipeline stopped at “${session.processing.failedStage?.replace(/_/g, ' ') ?? 'a step'}”. Attempt ${session.processing.retryCount} of ${session.processing.maxRetries}.`
                : derived.code === 'RECORDING_READY'
                  ? 'Generate the draft to start review. The draft will be a labeled simulated example.'
                  : 'Confirm consent and record the visit to create a draft.'}
          </p>
        </div>
        {isRunning && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00783c]">
            <RefreshCw className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
            Working…
          </span>
        )}
      </div>

      {isRunning && (
        <div role="status" aria-live="polite">
          <StepProgress stages={buildAnimatedStages(tick)} />
        </div>
      )}

      {derived.code === 'PROCESSING_INTERRUPTED' && session.processing.stages.length > 0 && (
        <StepProgress stages={session.processing.stages} />
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-[var(--color-danger)] flex gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {derived.code === 'RECORDING_READY' && (
          <Button
            variant="primary"
            disabled={isWorking}
            iconLeft={<Sparkles className="w-4 h-4" aria-hidden="true" />}
            onClick={() => void handleGenerateDraft()}
          >
            {isWorking ? 'Starting…' : 'Generate draft'}
          </Button>
        )}

        {derived.code === 'PROCESSING_INTERRUPTED' && !retryLimitReached && (
          <Button
            variant="primary"
            disabled={isWorking}
            iconLeft={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
            onClick={() => void handleRetry()}
          >
            Retry processing
          </Button>
        )}

        {derived.code === 'PROCESSING_INTERRUPTED' && retryLimitReached && (
          <>
            <p className="w-full text-sm text-[#9a4406] font-semibold">
              The retry limit has been reached. Discard this recording and record the visit again.
            </p>
            <Button
              variant="danger"
              disabled={isWorking}
              iconLeft={<Trash2 className="w-4 h-4" aria-hidden="true" />}
              onClick={() => void handleDiscardAndRecordAgain()}
            >
              Discard recording and record again
            </Button>
          </>
        )}

        {(derived.code === 'CONSENT_NEEDED' ||
          derived.code === 'READY_TO_CAPTURE' ||
          derived.code === 'RECORDING_ERROR' ||
          derived.code === 'UPLOAD_INTERRUPTED') && (
          <ButtonLink
            to={`/clinician/sessions/${session.id}/record`}
            variant="primary"
            iconLeft={<Mic className="w-4 h-4" aria-hidden="true" />}
            iconRight={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
          >
            Record this visit
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}
