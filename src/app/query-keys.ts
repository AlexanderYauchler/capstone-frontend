import type { QueryClient } from '@tanstack/react-query';

// ============================================================================
// CoSign — Shared React Query cache keys
// Every screen that reads clinical sessions uses one of these prefixes, so a
// clinical mutation can refresh all of them without guessing key names.
// ============================================================================

export const WORKSPACE_QUERY_PREFIXES = [
  'dashboard-metrics',
  'clinician-dashboard-sessions',
  'clinical-sessions-list',
  'clinical-sessions-unfiltered-total',
  'review-queue-sessions',
  'session-review-bundle',
  'audit-events',
  'patient-released-reports',
  'patient-released-report-detail',
  'analytics-summary',
] as const;

/**
 * Refreshes every cached query that depends on clinical session state.
 * Call after any capture, processing, review, approval, or release mutation.
 */
export async function invalidateWorkspaceQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    WORKSPACE_QUERY_PREFIXES.map((prefix) =>
      queryClient.invalidateQueries({ queryKey: [prefix] }),
    ),
  );
}
