/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { parseValidUserRole, type User, type UserRole } from '../../domain/models';
import { DEMO_USERS } from '../../services/demo/fixtures';
import { useServiceContext } from './ServiceProvider';

export interface AuthContextValue {
  readonly currentUser: User;
  readonly demoUsers: readonly User[];
  readonly switchDemoRole: (role: UserRole) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveUserForRole(role: UserRole): User {
  return DEMO_USERS.find((u) => u.role === role) ?? DEMO_USERS[0]!;
}

export function AuthProvider({
  children,
}: {
  readonly children: ReactNode;
  readonly initialRole?: UserRole;
}) {
  const { services, getActiveDemoRole, subscribeDemoRole } = useServiceContext();
  const queryClient = useQueryClient();

  const activeRole = useSyncExternalStore(
    subscribeDemoRole,
    getActiveDemoRole,
    getActiveDemoRole,
  );
  const currentUser = resolveUserForRole(activeRole);

  const switchDemoRole = useCallback(
    async (role: UserRole): Promise<User> => {
      const validated = parseValidUserRole(role) ?? 'clinician';
      const updated = await services.auth.switchRole(validated);
      void queryClient.invalidateQueries();
      return updated;
    },
    [queryClient, services.auth],
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        demoUsers: DEMO_USERS,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return ctx;
}
