import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { UserRole } from '../../domain/models';
import type { DemoStore } from '../../services/demo/demo-store';
import { AuthProvider } from './AuthProvider';
import { ServiceProvider } from './ServiceProvider';

export function AppProviders({
  children,
  customStore,
  initialRole = 'clinician',
}: {
  readonly children: ReactNode;
  readonly customStore?: DemoStore;
  readonly initialRole?: UserRole;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceProvider customStore={customStore} initialRole={initialRole}>
        <AuthProvider initialRole={initialRole}>{children}</AuthProvider>
      </ServiceProvider>
    </QueryClientProvider>
  );
}
