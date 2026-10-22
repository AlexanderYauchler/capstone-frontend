import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Activity, ClipboardList, History, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useServices } from '../../app/providers/ServiceProvider';
import { Card } from '../../design-system/components/Card';
import { PageHeader } from '../../design-system/components/PageHeader';
import { StatCard } from '../../design-system/components/StatCard';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import type { AuditActionType, UserRole } from '../../domain/models';
import { deriveSessionDisplayState } from '../../domain/state-machines';

type AdminTab = 'overview' | 'users' | 'audit';

const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  clinician: [
    'Record visits and confirm patient consent',
    'Review, edit, and approve their own patients’ reports',
    'Release approved reports to patients',
    'View de-identified analytics',
  ],
  patient: ['View only their own released reports'],
  analyst: ['View de-identified, aggregated analytics only', 'No access to individual patient records'],
  admin: ['View workspace activity and the audit log', 'Review role permissions', 'Change workspace settings'],
};

const ACTION_LABELS: Record<AuditActionType, string> = {
  CONSENT_CONFIRMED: 'Consent confirmed',
  RECORDING_STARTED: 'Recording started',
  RECORDING_FINISHED: 'Recording saved',
  RECORDING_DISCARDED: 'Recording discarded',
  AUDIO_UPLOADED: 'Audio file attached',
  DRAFT_GENERATED: 'Draft generated',
  CLARIFICATIONS_RESOLVED: 'Clarifications answered',
  DRAFT_EDITED: 'Draft edited',
  DRAFT_SAVED: 'Draft saved',
  DRAFT_REJECTED_REGENERATING: 'Changes requested',
  DRAFT_REGENERATED: 'Revised draft created',
  REPORT_APPROVED_FINALIZED: 'Report approved',
  REPORT_RELEASED_TO_PATIENT: 'Released to patient',
  PRIVACY_VERIFICATION_COMPLETED: 'Privacy check passed',
  PREFERENCES_UPDATED: 'Settings changed',
};

function parseTab(value: string | null): AdminTab {
  return value === 'users' || value === 'audit' ? value : 'overview';
}

export function AdminPage() {
  const services = useServices();
  const { demoUsers } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const [actionFilter, setActionFilter] = useState<AuditActionType | 'all'>('all');

  const { data: sessions } = useQuery({
    queryKey: ['clinical-sessions-list', 'admin'],
    queryFn: () => services.sessions.listSessions(),
  });
  const { data: auditEvents, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-events'],
    queryFn: () => services.admin.listAuditEvents(),
  });

  const allSessions = sessions ?? [];
  const events = auditEvents ?? [];
  const filteredEvents = actionFilter === 'all' ? events : events.filter((e) => e.action === actionFilter);
  const awaiting = allSessions.filter((s) => deriveSessionDisplayState(s).needsClinicianAttention).length;
  const released = allSessions.filter((s) => s.release.status === 'released').length;

  const tabs: ReadonlyArray<{ id: AdminTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users & access' },
    { id: 'audit', label: 'Audit log' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Administration', to: '/admin?tab=overview' }, { label: tabs.find((t) => t.id === tab)!.label }]}
        eyebrow="Administration · demo workspace"
        title="Administration"
        description="Oversee workspace activity, who can do what, and the audit trail. Administrators cannot open or edit clinical reports."
      />

      <nav aria-label="Administration sections" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            to={`/admin?tab=${t.id}`}
            aria-current={tab === t.id ? 'page' : undefined}
            className={[
              'px-4 py-2 rounded-[10px] text-sm font-bold border transition-colors',
              tab === t.id ? 'bg-[#02754b] text-white border-[#02754b]' : 'bg-white text-[#0d4026] border-[#cde0d4] hover:bg-[#edf5f0]',
            ].join(' ')}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && (
        <>
          <section aria-label="Workspace summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Clinical sessions" value={allSessions.length} subtitle="In the demo workspace" icon={<ClipboardList className="w-4 h-4" aria-hidden="true" />} />
            <StatCard label="Need clinician action" value={awaiting} subtitle="Review or clarification" icon={<Activity className="w-4 h-4" aria-hidden="true" />} accent="orange" />
            <StatCard label="Released reports" value={released} subtitle="Visible to patients" icon={<ShieldCheck className="w-4 h-4" aria-hidden="true" />} accent="deep" />
            <StatCard label="Audit events" value={events.length} subtitle="Recorded actions" icon={<History className="w-4 h-4" aria-hidden="true" />} />
          </section>
          <Card padding="md" className="space-y-3">
            <h2 className="text-lg font-bold text-[#0d4026]">Latest activity</h2>
            <AuditList events={events.slice(0, 5)} />
            <Link to="/admin?tab=audit" className="text-sm font-bold text-[#00783c] hover:underline">
              Open the full audit log
            </Link>
          </Card>
        </>
      )}

      {tab === 'users' && (
        <Card padding="none" className="overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00783c]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[#0d4026]">Users and what they can do</h2>
          </div>
          <p className="px-5 text-xs text-[#495057]">
            Demo accounts only. Real account management belongs to the backend team’s identity service.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse mt-3">
              <caption className="sr-only">Users and permissions</caption>
              <thead>
                <tr className="bg-[#edf5f0] text-[11px] uppercase tracking-wider text-[#0d4026]">
                  <th scope="col" className="py-2.5 px-5">User</th>
                  <th scope="col" className="py-2.5 px-5">Role</th>
                  <th scope="col" className="py-2.5 px-5">Permissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4ece7]">
                {demoUsers.map((u) => (
                  <tr key={u.id} className="align-top">
                    <th scope="row" className="py-3 px-5 text-left">
                      <span className="font-bold text-[#0d4026]">{u.displayName}</span>
                      <span className="block text-xs font-normal text-[#495057]">{u.title}</span>
                    </th>
                    <td className="py-3 px-5">
                      <StatusBadge tone="teal" className="capitalize">{u.role}</StatusBadge>
                    </td>
                    <td className="py-3 px-5">
                      <ul className="list-disc list-inside text-[#242628] space-y-0.5">
                        {ROLE_PERMISSIONS[u.role].map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'audit' && (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#0d4026]">Audit log</h2>
              <p className="text-sm text-[#495057]">Append-only record of actions in this demo session, newest first.</p>
            </div>
            <div>
              <label htmlFor="audit-filter" className="block text-xs font-bold text-[#0d4026] mb-1">
                Action type
              </label>
              <select
                id="audit-filter"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as AuditActionType | 'all')}
                className="h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm"
              >
                <option value="all">All actions</option>
                {(Object.keys(ACTION_LABELS) as AuditActionType[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {auditLoading ? (
            <p role="status" className="text-sm text-[#495057]">Loading audit log…</p>
          ) : filteredEvents.length === 0 ? (
            <p className="text-sm text-[#495057] italic">No events match this filter.</p>
          ) : (
            <AuditList events={filteredEvents} />
          )}
        </Card>
      )}
    </div>
  );
}

function AuditList({ events }: { readonly events: ReadonlyArray<import('../../domain/models').AuditEvent> }) {
  return (
    <ol className="divide-y divide-[#e4ece7]">
      {events.map((e) => (
        <li key={e.id} className="py-2.5 flex flex-wrap items-start justify-between gap-2 text-sm">
          <div>
            <p className="font-semibold text-[#0d4026]">{e.summary}</p>
            <p className="text-xs text-[#495057]">
              {e.actorDisplayName}
              {e.actorType === 'ai_agent' ? ' (simulated AI)' : ''}
              {e.sessionId ? ` · ${e.sessionId}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone="neutral" showIcon={false}>
              {ACTION_LABELS[e.action]}
            </StatusBadge>
            <span className="text-xs tabular-nums text-[#495057]">{e.timeLabel}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
