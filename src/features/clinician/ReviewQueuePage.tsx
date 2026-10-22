import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, RefreshCw, Send } from 'lucide-react';
import { useServices } from '../../app/providers/ServiceProvider';
import { ButtonLink } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { PageHeader } from '../../design-system/components/PageHeader';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import type { ClinicalSession } from '../../domain/models';
import { deriveSessionDisplayState, type DerivedSessionDisplayCode } from '../../domain/state-machines';
import { formatEncounterDateDisplay } from './session-formatters';

interface QueueGroup {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: ReactNode;
  readonly codes: readonly DerivedSessionDisplayCode[];
  readonly emptyText: string;
}

const GROUPS: readonly QueueGroup[] = [
  {
    id: 'clarification',
    title: 'Needs your answers',
    description: 'The draft has questions only you can answer. Approval is blocked until they are answered.',
    icon: <AlertTriangle className="w-5 h-5 text-[#f26b21]" aria-hidden="true" />,
    codes: ['CLARIFICATION_NEEDED', 'DRAFT_SAVED_NEEDS_CLARIFICATION'],
    emptyText: 'No drafts are waiting on clarification answers.',
  },
  {
    id: 'ready',
    title: 'Ready to approve',
    description: 'All questions are answered. Read the draft, edit if needed, then approve.',
    icon: <ClipboardCheck className="w-5 h-5 text-[#00783c]" aria-hidden="true" />,
    codes: ['NEEDS_REVIEW', 'DRAFT_SAVED_READY'],
    emptyText: 'No drafts are ready for approval.',
  },
  {
    id: 'release',
    title: 'Approved, not yet shared',
    description: 'Approved reports that have not been released to the patient portal.',
    icon: <Send className="w-5 h-5 text-[#02754b]" aria-hidden="true" />,
    codes: ['APPROVED_NOT_RELEASED'],
    emptyText: 'Every approved report has been released.',
  },
  {
    id: 'pipeline',
    title: 'Needs action before review',
    description: 'Visits whose draft is still being prepared, or whose processing stopped.',
    icon: <RefreshCw className="w-5 h-5 text-[#9a4406]" aria-hidden="true" />,
    codes: ['PROCESSING', 'REGENERATING_DRAFT', 'PROCESSING_INTERRUPTED', 'RECORDING_READY'],
    emptyText: 'Nothing is waiting in processing.',
  },
  {
    id: 'released',
    title: 'Completed and released',
    description: 'Finalized reports the patient can see.',
    icon: <CheckCircle2 className="w-5 h-5 text-[#00783c]" aria-hidden="true" />,
    codes: ['RELEASED'],
    emptyText: 'No released reports yet.',
  },
];

function QueueRow({ session }: { readonly session: ClinicalSession }) {
  const derived = deriveSessionDisplayState(session);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <Link
          to={`/clinician/sessions/${session.id}`}
          className="font-bold text-[#0d4026] hover:text-[#00783c] hover:underline"
        >
          {session.patientName} · {session.visitType}
        </Link>
        <p className="text-xs text-[#495057]">
          {session.id} · {formatEncounterDateDisplay(session.encounterDate)}
          {session.review.currentRevision > 0 ? ` · Revision v${session.review.currentRevision}` : ''}
          {session.review.unresolvedClarificationCount > 0
            ? ` · ${session.review.unresolvedClarificationCount} open question${session.review.unresolvedClarificationCount === 1 ? '' : 's'}`
            : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge tone={derived.badgeTone}>{derived.badgeLabel}</StatusBadge>
        <ButtonLink
          to={`/clinician/sessions/${session.id}`}
          size="sm"
          variant="soft"
          iconRight={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
          aria-label={`${derived.nextStepLabel}: ${session.patientName} (${session.id})`}
        >
          {derived.nextStepLabel}
        </ButtonLink>
      </div>
    </li>
  );
}

export function ReviewQueuePage() {
  const services = useServices();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['review-queue-sessions'],
    queryFn: () => services.sessions.listSessions(),
  });

  const sessions = data ?? [];
  const actionable = sessions.filter((s) => deriveSessionDisplayState(s).needsClinicianAttention).length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Clinician Workspace', to: '/clinician/dashboard' }, { label: 'Reports & review' }]}
        eyebrow="Reports & review"
        title="Your review queue"
        description={
          isLoading
            ? 'Loading your reports…'
            : `${actionable} report${actionable === 1 ? '' : 's'} need${actionable === 1 ? 's' : ''} your attention. Work from the top group down.`
        }
      />

      {isError && (
        <Card tone="peach" padding="md" role="alert" className="space-y-2">
          <p className="font-bold">Reports could not be loaded</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unexpected error.'}</p>
          <button type="button" className="text-sm font-bold underline" onClick={() => void refetch()}>
            Try again
          </button>
        </Card>
      )}

      {!isLoading &&
        !isError &&
        GROUPS.map((group) => {
          const items = sessions.filter((s) => group.codes.includes(deriveSessionDisplayState(s).code));
          return (
            <Card key={group.id} padding="md" className="space-y-2" aria-labelledby={`queue-${group.id}`}>
              <div className="flex items-start gap-3">
                {group.icon}
                <div>
                  <h2 id={`queue-${group.id}`} className="text-lg font-bold text-[#0d4026]">
                    {group.title} <span className="text-[#495057] font-semibold">({items.length})</span>
                  </h2>
                  <p className="text-sm text-[#495057]">{group.description}</p>
                </div>
              </div>
              {items.length > 0 ? (
                <ul className="divide-y divide-[#e4ece7]">
                  {items.map((s) => (
                    <QueueRow key={s.id} session={s} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#495057] italic py-2">{group.emptyText}</p>
              )}
            </Card>
          );
        })}
    </div>
  );
}
