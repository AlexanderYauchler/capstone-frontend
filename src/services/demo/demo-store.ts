import {
  parseValidUserRole,
  type AuditEvent,
  type ClinicalReport,
  type ClinicalSession,
  type RecordingMetadata,
  type Transcript,
  type UserRole,
  type WorkspacePreferences,
} from '../../domain/models';
import {
  INITIAL_DEMO_AUDIT_EVENTS,
  INITIAL_DEMO_RECORDINGS,
  INITIAL_DEMO_REPORTS,
  INITIAL_DEMO_SESSIONS,
  INITIAL_DEMO_TRANSCRIPTS,
  INITIAL_WORKSPACE_PREFERENCES,
} from './fixtures';
import { transientMediaRegistry } from './transient-media-registry';

// ============================================================================
// CoSign — Serializable Demo Store (Strictly Synthetic Data Only)
// ============================================================================

export const DEMO_STORAGE_KEY = 'cosign_synthetic_demo_state_v1';

export interface SerializableDemoState {
  readonly schemaVersion: 1;
  readonly activeRole: UserRole | null;
  readonly referenceDate: string;
  readonly sessions: ClinicalSession[];
  readonly transcripts: Record<string, Transcript>;
  readonly reports: Record<string, ClinicalReport>;
  readonly recordings: Record<string, RecordingMetadata>;
  readonly auditEvents: AuditEvent[];
  readonly preferences: WorkspacePreferences;
}

function createInitialSeedState(
  referenceDate = '2026-10-06',
  initialRole: UserRole = 'clinician',
): SerializableDemoState {
  return structuredClone({
    schemaVersion: 1,
    activeRole: initialRole,
    referenceDate,
    sessions: [...INITIAL_DEMO_SESSIONS],
    transcripts: { ...INITIAL_DEMO_TRANSCRIPTS },
    reports: { ...INITIAL_DEMO_REPORTS },
    recordings: { ...INITIAL_DEMO_RECORDINGS },
    auditEvents: [...INITIAL_DEMO_AUDIT_EVENTS],
    preferences: { ...INITIAL_WORKSPACE_PREFERENCES },
  });
}

/**
 * Verifies that no transient browser resource (`blob:`, `Blob`, `MediaStream`)
 * is ever serialized into sessionStorage.
 */
export function assertSerializableDemoStateSafe(state: SerializableDemoState): void {
  const serialized = JSON.stringify(state);
  if (serialized.includes('"blob:http') || serialized.includes('"blob:null')) {
    throw new Error('Security violation: Temporary blob: URLs must not be persisted to storage.');
  }
}

export class DemoStore {
  private state: SerializableDemoState;
  private readonly persistToSessionStorage: boolean;
  public readonly hydratedFromStorage: boolean;
  private readonly listeners = new Set<() => void>();

  constructor(options?: {
    persistToSessionStorage?: boolean;
    referenceDate?: string;
    initialRole?: UserRole;
  }) {
    this.persistToSessionStorage = options?.persistToSessionStorage ?? true;
    const loaded = this.loadFromSessionStorage();
    this.hydratedFromStorage = loaded !== null;
    this.state = loaded ?? createInitialSeedState(options?.referenceDate, options?.initialRole);
    if (!loaded) {
      this.saveToSessionStorage(this.state);
    }
  }

  public getState(): SerializableDemoState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public update(updater: (prev: SerializableDemoState) => SerializableDemoState): SerializableDemoState {
    const next = updater(this.state);
    assertSerializableDemoStateSafe(next);
    this.state = next;
    this.saveToSessionStorage(next);
    this.notify();
    return this.state;
  }

  public resetToCanonicalSeed(referenceDate = '2026-10-06'): SerializableDemoState {
    transientMediaRegistry.clearAll();
    if (this.persistToSessionStorage && typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(DEMO_STORAGE_KEY);
    }
    this.state = createInitialSeedState(referenceDate);
    this.saveToSessionStorage(this.state);
    this.notify();
    return this.state;
  }

  private loadFromSessionStorage(): SerializableDemoState | null {
    if (!this.persistToSessionStorage || typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    try {
      const raw = window.sessionStorage.getItem(DEMO_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SerializableDemoState;
      if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.sessions)) {
        return null;
      }
      const validatedRole = parseValidUserRole(parsed.activeRole) ?? 'clinician';
      return {
        ...parsed,
        activeRole: validatedRole,
      };
    } catch {
      return null;
    }
  }

  private saveToSessionStorage(state: SerializableDemoState): void {
    if (!this.persistToSessionStorage || typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    try {
      window.sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors in restricted environments
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
