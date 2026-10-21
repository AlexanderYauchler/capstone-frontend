import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, FileText, History, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useServices } from '../../app/providers/ServiceProvider';
import { invalidateWorkspaceQueries } from '../../app/query-keys';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { PageHeader } from '../../design-system/components/PageHeader';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { Timeline } from '../../design-system/components/Timeline';
import type { RevisionOrigin } from '../../domain/models';
import { deriveSessionDisplayState } from '../../domain/state-machines';
import type { SessionReviewBundle } from '../../services/contracts';
import {
  CAPTURE_ORIGIN_LABELS,
  DEPARTMENT_LABELS,
  DIAGNOSIS_LABELS,
  formatEncounterDateDisplay,
  formatTimeShort,
} from './session-formatters';

const REVISION_ORIGIN_LABELS: Record<RevisionOrigin, string> = {
  ai_initial_draft: 'AI draft (simulated)',
  clinician_clarification: 'Clinician answered clarifications',
  clinician_edit: 'Clinician edit',
  ai_regenerated_draft: 'Revised AI draft (simulated)',
};

type SubpageKind = 'summary' | 'history' | 'privacy';

const SUBPAGE_META: Record<SubpageKind, { title: string; description: string; icon: ReactNode }> = {
  summary: {
    title: 'Visit summary',
    description: 'Everything collected for this visit on one page. It stays a draft until a clinician approves it.',
    icon: <FileText className="w-4 h-4" aria-hidden="true" />,
  },
  history: {
    title: 'Report history',
    description: 'Every draft, edit, approval, and release for this visit, in order.',
    icon: <History className="w-4 h-4" aria-hidden="true" />,
  },
  privacy: {
    title: 'Analytics privacy check',
    description: 'Before a visit can appear in analytics, identifying details are removed and checked twice.',
    icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" />,
  },
};

function useSessionBundle(sessionId: string) {
  const services = useServices();
  return useQuery({
    queryKey: ['session-review-bundle', sessionId],
    queryFn: () => services.sessions.getSessionReviewBundle(sessionId),
    enabled: sessionId.length > 0,
  });
}

function SubpageShell({
  kind,
  sessionId,
  bundle,
  children,
}: {
  readonly kind: SubpageKind;
  readonly sessionId: string;
  readonly bundle: SessionReviewBundle;
  readonly children: ReactNode;
}) {
  const meta = SUBPAGE_META[kind];
  const { session } = bundle;
  const tabs: ReadonlyArray<{ kind: SubpageKind | 'review'; label: string; to: string }> = [
    { kind: 'review', label: 'Review', to: `/clinician/sessions/${sessionId}` },
    { kind: 'summary', label: 'Summary', to: `/clinician/sessions/${sessionId}/summary` },
    { kind: 'history', label: 'History', to: `/clinician/sessions/${sessionId}/history` },
    { kind: 'privacy', label: 'Privacy check', to: `/clinician/sessions/${sessionId}/privacy` },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Clinician Workspace', to: '/clinician/dashboard' },
          { label: 'Clinical sessions', to: '/clinician/sessions' },
          { label: `${session.id} (${session.patientName})`, to: `/clinician/sessions/${session.id}` },
          { label: meta.title },
        ]}
        eyebrow={`${session.id} · ${session.patientName} · ${formatEncounterDateDisplay(session.encounterDate)}`}
        title={meta.title}
        description={meta.description}
        actions={
          <ButtonLink
            to={`/clinician/sessions/${session.id}`}
            variant="heroDark"
            size="sm"
            iconLeft={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
          >
            Back to review
          </ButtonLink>
        }
      />
      <nav aria-label="Visit pages" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <ButtonLink
            key={t.kind}
            to={t.to}
            size="sm"
            variant={t.kind === kind ? 'navActive' : 'soft'}
            aria-current={t.kind === kind ? 'page' : undefined}
          >
            {t.label}
          </ButtonLink>
        ))}
      </nav>
      {children}
    </div>
  );
}

function SubpageLoader({ kind }: { readonly kind: SubpageKind }) {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const { data, isLoading, isError, error } = useSessionBundle(sessionId);
  if (isLoading) {
    return (
      <Card padding="lg" role="status" className="text-center text-sm font-bold text-[#00783c]">
        Loading visit {sessionId}…
      </Card>
    );
  }
  if (isError || !data) {
    return (
      <Card tone="peach" padding="lg" role="alert" className="space-y-3 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-[#0d4026]">Visit {sessionId} could not be found</h1>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown visit.'}</p>
        <ButtonLink to="/clinician/sessions" size="sm">
          Back to clinical sessions
        </ButtonLink>
      </Card>
    );
  }
  return (
    <SubpageShell kind={kind} sessionId={sessionId} bundle={data}>
      {kind === 'summary' && <SummaryBody bundle={data} />}
      {kind === 'history' && <HistoryBody bundle={data} />}
      {kind === 'privacy' && <PrivacyBody bundle={data} />}
    </SubpageShell>
  );
}

function DetailRow({ label, value }: { readonly label: string; readonly value: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 py-2 text-sm">
      <dt className="text-[#495057]">{label}</dt>
      <dd className="font-semibold text-[#0d4026] text-right">{value}</dd>
    </div>
  );
}

function SummaryBody({ bundle }: { readonly bundle: SessionReviewBundle }) {
  const { session, report, recording } = bundle;
  const derived = deriveSessionDisplayState(session);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <Card padding="md" className="lg:col-span-4 space-y-2">
        <h2 className="text-lg font-bold text-[#0d4026]">Visit details</h2>
        <dl className="divide-y divide-[#e4ece7]">
          <DetailRow label="Status" value={<StatusBadge tone={derived.badgeTone}>{derived.badgeLabel}</StatusBadge>} />
          <DetailRow label="Patient" value={session.patientName} />
          <DetailRow label="Visit type" value={session.visitType} />
          <DetailRow label="Department" value={DEPARTMENT_LABELS[session.department]} />
          <DetailRow label="Category" value={DIAGNOSIS_LABELS[session.diagnosisCategory]} />
          <DetailRow label="Primary symptom" value={session.primarySymptom} />
          <DetailRow label="Clinician" value={session.assignedClinicianName} />
          <DetailRow label="Consent" value={session.capture.consentConfirmed ? 'Confirmed' : 'Not confirmed'} />
          <DetailRow
            label="Recording"
            value={recording ? `${CAPTURE_ORIGIN_LABELS[recording.origin]} · ${recording.durationLabel}` : 'None saved'}
          />
        </dl>
      </Card>
      <div className="lg:col-span-8 space-y-6">
        {report ? (
          <>
            <Card padding="md" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-[#0d4026]">SOAP report · Revision v{report.currentRevision}</h2>
                {report.isSimulatedAiOutput && <StatusBadge tone="teal">AI draft · simulated</StatusBadge>}
              </div>
              <dl className="space-y-3">
                {(['subjective', 'objective', 'assessment', 'plan'] as const).map((key) => (
                  <div key={key}>
                    <dt className="text-xs font-bold uppercase tracking-wider text-[#00783c]">{key}</dt>
                    <dd className="text-sm text-[#242628] whitespace-pre-wrap mt-0.5">{report.soap[key]}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card padding="md" className="space-y-3">
              <h2 className="text-lg font-bold text-[#0d4026]">Collected findings</h2>
              <ul className="divide-y divide-[#e4ece7]">
                {report.provenanceFindings.map((f) => (
                  <li key={f.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      <strong className="text-[#0d4026]">{f.label}:</strong> {f.summary}
                    </span>
                    {f.requiresClarification ? (
                      <StatusBadge tone="warning">Needs confirmation</StatusBadge>
                    ) : (
                      <StatusBadge tone="success">Supported</StatusBadge>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
            {report.clarifications.length > 0 && (
              <Card padding="md" className="space-y-3">
                <h2 className="text-lg font-bold text-[#0d4026]">Clarification questions</h2>
                <ul className="space-y-2">
                  {report.clarifications.map((c) => (
                    <li key={c.id} className="text-sm border border-[#e4ece7] rounded-[10px] p-3">
                      <p className="font-semibold text-[#0d4026]">{c.prompt}</p>
                      <p className="text-[#495057] mt-1">
                        {c.response ? `Answer: ${c.response.responseText}` : 'Not answered yet'}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        ) : (
          <Card padding="md">
            <p className="text-sm text-[#495057]">
              No draft report exists yet. Open the review page to record the visit or generate a draft.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function HistoryBody({ bundle }: { readonly bundle: SessionReviewBundle }) {
  const services = useServices();
  const { session, report } = bundle;
  const { data: auditEvents } = useQuery({
    queryKey: ['audit-events'],
    queryFn: () => services.admin.listAuditEvents(),
  });
  const sessionEvents = (auditEvents ?? []).filter((e) => e.sessionId === session.id);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card padding="md" className="space-y-3">
        <h2 className="text-lg font-bold text-[#0d4026]">Report revisions</h2>
        {report && report.revisions.length > 0 ? (
          <ol className="space-y-3">
            {[...report.revisions].reverse().map((rev) => (
              <li key={rev.revisionNumber} className="border border-[#e4ece7] rounded-[10px] p-3 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-[#0d4026]">Revision v{rev.revisionNumber}</strong>
                  <span className="text-xs text-[#495057]">{formatTimeShort(rev.createdAt)}</span>
                </div>
                <p className="text-xs font-semibold text-[#00783c]">
                  {REVISION_ORIGIN_LABELS[rev.origin]} · {rev.authorDisplayName}
                </p>
                <p className="text-sm text-[#242628]">{rev.changeSummary}</p>
                {rev.rejectionReason && (
                  <p className="text-sm text-[#9a4406]">Changes requested: “{rev.rejectionReason}”</p>
                )}
                {session.review.approvedRevision === rev.revisionNumber && (
                  <StatusBadge tone="success">Approved version</StatusBadge>
                )}
                {session.release.releasedRevision === rev.revisionNumber && (
                  <StatusBadge tone="success" className="ml-1">
                    Released to patient
                  </StatusBadge>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-[#495057]">No report revisions yet.</p>
        )}
      </Card>
      <Card padding="md" className="space-y-3">
        <h2 className="text-lg font-bold text-[#0d4026]">Activity log</h2>
        {sessionEvents.length > 0 ? (
          <Timeline
            items={sessionEvents.map((e) => ({
              id: e.id,
              title: e.summary,
              timeLabel: e.timeLabel,
              description: `${e.actorDisplayName}${e.actorType === 'ai_agent' ? ' (simulated AI)' : ''}`,
            }))}
          />
        ) : (
          <p className="text-sm text-[#495057]">No recorded activity for this visit yet.</p>
        )}
      </Card>
    </div>
  );
}

function PrivacyBody({ bundle }: { readonly bundle: SessionReviewBundle }) {
  const services = useServices();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { session } = bundle;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isFinalized = session.review.status === 'approved_finalized';
  const status = session.privacy.status;

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await invalidateWorkspaceQueries(queryClient);
      setMessage(success);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'The privacy check could not run.');
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    { label: 'Report approved by clinician', done: isFinalized },
    { label: 'Names, IDs, and dates removed or generalized', done: status !== 'not_started' },
    { label: 'First independent check', done: session.privacy.independentPassesCompleted >= 1 },
    { label: 'Second independent check', done: session.privacy.independentPassesCompleted >= 2 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <Card padding="md" className="lg:col-span-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#0d4026]">Status</h2>
          <StatusBadge
            tone={status === 'verified_eligible' ? 'success' : status === 'verification_retry_required' ? 'warning' : 'neutral'}
          >
            {status === 'verified_eligible'
              ? 'Verified · included in analytics'
              : status === 'verification_retry_required'
                ? 'Needs another pass'
                : status === 'deidentifying'
                  ? 'In progress'
                  : 'Not started'}
          </StatusBadge>
        </div>
        <ol className="space-y-2">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              {s.done ? (
                <CheckCircle2 className="w-4 h-4 text-[#00783c]" aria-hidden="true" />
              ) : (
                <span className="w-4 h-4 rounded-full border-2 border-[#9fb3a8]" aria-hidden="true" />
              )}
              <span className={s.done ? 'text-[#0d4026] font-semibold' : 'text-[#495057]'}>
                {s.label}
                <span className="sr-only">{s.done ? ' (done)' : ' (not done)'}</span>
              </span>
            </li>
          ))}
        </ol>
        {session.privacy.retryReason && status === 'verification_retry_required' && (
          <p className="text-sm text-[#9a4406]">{session.privacy.retryReason}</p>
        )}
        {!isFinalized ? (
          <p className="text-sm text-[#495057]">
            The privacy check becomes available after the report is approved.
          </p>
        ) : (
          currentUser.role === 'clinician' &&
          status !== 'verified_eligible' && (
            <div className="flex flex-wrap gap-2.5">
              <Button
                disabled={busy}
                iconLeft={<ShieldCheck className="w-4 h-4" aria-hidden="true" />}
                onClick={() =>
                  void run(
                    () => services.privacy.completePrivacyVerification(session.id),
                    'Privacy check passed (simulated). This visit can now be counted in analytics.',
                  )
                }
              >
                Run privacy check (simulated)
              </Button>
              {status === 'not_started' && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  iconLeft={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
                  onClick={() =>
                    void run(
                      () => services.privacy.triggerVerificationRetryDemo(session.id),
                      'Demo: the second check found a remaining identifier. Run the check again.',
                    )
                  }
                >
                  Show a failed check (demo)
                </Button>
              )}
            </div>
          )
        )}
        {message && (
          <p role="status" className="text-sm font-semibold text-[#0d4026]">
            {message}
          </p>
        )}
      </Card>
      <Card tone="mint" padding="md" className="lg:col-span-5 space-y-2 text-sm text-[#242628]">
        <h2 className="text-base font-bold text-[#0d4026]">How this protects patients</h2>
        <p>The approved clinical report is never changed. Analytics receives a separate, de-identified copy.</p>
        <p>Groups with fewer than 5 patients are hidden in analytics so no one can be singled out.</p>
        <p className="text-xs text-[#495057]">
          In this demo the checks are simulated. The real de-identification service is part of the
          backend team’s work.
        </p>
      </Card>
    </div>
  );
}

export function ClinicalSessionSummaryPage() {
  return <SubpageLoader kind="summary" />;
}

export function ClinicalSessionHistoryPage() {
  return <SubpageLoader kind="history" />;
}

export function ClinicalSessionPrivacyPage() {
  return <SubpageLoader kind="privacy" />;
}
