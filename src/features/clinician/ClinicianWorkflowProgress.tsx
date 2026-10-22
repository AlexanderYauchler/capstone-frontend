import { Check, LockKeyhole } from 'lucide-react';

const WORKFLOW_STAGES = [
  { number: 1, label: 'Patient & Consent' },
  { number: 2, label: 'Record Consultation' },
  { number: 3, label: 'Review Report' },
  { number: 4, label: 'Approve & Finalize' },
] as const;

interface ClinicianWorkflowProgressProps {
  readonly currentStage: 1 | 2 | 3 | 4;
  readonly completedThrough?: 0 | 1 | 2 | 3 | 4;
}

export function ClinicianWorkflowProgress({
  currentStage,
  completedThrough = (currentStage - 1) as 0 | 1 | 2 | 3,
}: ClinicianWorkflowProgressProps) {
  return (
    <nav aria-label="Clinical visit workflow" className="rounded-2xl border border-[#cde0d4] bg-white px-4 py-3 shadow-2xs sm:px-6">
      <ol className="grid grid-cols-4 gap-2">
        {WORKFLOW_STAGES.map((stage) => {
          const isCurrent = stage.number === currentStage;
          const isComplete = stage.number <= completedThrough;
          const isLocked = stage.number > currentStage && !isComplete;

          return (
            <li
              key={stage.number}
              aria-current={isCurrent ? 'step' : undefined}
              className="relative min-w-0 text-center"
            >
              {stage.number < 4 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] top-4 h-0.5 ${
                    stage.number < currentStage ? 'bg-[#7dc242]' : 'bg-[#d5e0db]'
                  }`}
                />
              )}
              <span
                className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  isCurrent
                    ? 'border-[#00783c] bg-[#00783c] text-white ring-4 ring-[#edf5f0]'
                    : isComplete
                      ? 'border-[#7dc242] bg-[#e8f4ed] text-[#0d4026]'
                      : 'border-[#c8d5cf] bg-[#f7f8f8] text-[#68726d]'
                }`}
              >
                {isComplete && !isCurrent ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : isLocked ? (
                  <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  stage.number
                )}
              </span>
              <span
                className={`mt-2 block text-[10px] font-bold leading-tight sm:text-xs ${
                  isCurrent ? 'text-[#0d4026]' : 'text-[#5b6761]'
                }`}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
