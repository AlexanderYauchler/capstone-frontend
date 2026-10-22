import type { PipelineStageState } from '../../domain/models';
import { StatusBadge, type BadgeTone } from './StatusBadge';

export interface StepProgressProps {
  readonly stages: readonly PipelineStageState[];
}

function mapStageToBadge(status: PipelineStageState['status']): {
  tone: BadgeTone;
  label: string;
} {
  switch (status) {
    case 'complete':
      return { tone: 'success', label: 'Complete' };
    case 'in_progress':
      return { tone: 'teal', label: 'In progress' };
    case 'failed':
      return { tone: 'danger', label: 'Needs retry' };
    case 'waiting':
      return { tone: 'warning', label: 'Waiting' };
  }
}

export function StepProgress({ stages }: StepProgressProps) {
  return (
    <ol className="space-y-3" aria-label="Pipeline progress">
      {stages.map((stage) => {
        const badge = mapStageToBadge(stage.status);
        return (
          <li
            key={stage.key}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-border)]"
          >
            <div className="w-36 shrink-0">
              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">{stage.label}</p>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{stage.detailMessage}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
