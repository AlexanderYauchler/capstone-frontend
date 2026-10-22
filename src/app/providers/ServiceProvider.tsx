/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '../../config/env';
import { parseValidUserRole, type UserRole } from '../../domain/models';
import type { ICoSignServices } from '../../services/contracts';
import { DemoStore } from '../../services/demo/demo-store';
import { createDemoServices } from '../../services/demo/demo-services';
import { createConnectedServices } from '../../services/api/connected-services';

export interface ServiceContextValue {
  readonly services: ICoSignServices;
  readonly isDemoMode: boolean;
  readonly resetDemoState: () => void;
  readonly getActiveDemoRole: () => UserRole;
  readonly subscribeDemoRole: (listener: (role: UserRole) => void) => () => void;
  readonly resetConfirmationVisible: boolean;
}

const ServiceContext = createContext<ServiceContextValue | null>(null);

export function ServiceProvider({
  children,
  customStore,
  initialRole = 'clinician',
}: {
  readonly children: ReactNode;
  readonly customStore?: DemoStore;
  readonly initialRole?: UserRole;
}) {
  const queryClient = useQueryClient();
  const isDemoMode = env.VITE_APP_MODE === 'demo';
  const [resetConfirmationVisible, setResetConfirmationVisible] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  const demoStore = useMemo<DemoStore | null>(() => {
    if (!isDemoMode) return null;

    const urlDemoRole =
      typeof window !== 'undefined'
        ? parseValidUserRole(new URLSearchParams(window.location.search).get('demoRole'))
        : null;

    const store =
      customStore ??
      new DemoStore({
        persistToSessionStorage: true,
        referenceDate: env.VITE_DEMO_REFERENCE_DATE,
        initialRole: urlDemoRole ?? initialRole,
      });

    if (urlDemoRole && store.getState().activeRole !== urlDemoRole) {
      store.update((prev) => ({
        ...prev,
        activeRole: urlDemoRole,
      }));
    } else if (!store.hydratedFromStorage && !customStore && store.getState().activeRole !== initialRole) {
      store.update((prev) => ({
        ...prev,
        activeRole: initialRole,
      }));
    }

    return store;
  }, [customStore, initialRole, isDemoMode]);

  const services = useMemo<ICoSignServices>(() => {
    if (!isDemoMode || !demoStore) {
      return createConnectedServices(env.VITE_API_BASE_URL);
    }
    return createDemoServices(demoStore);
  }, [demoStore, isDemoMode]);

  const getActiveDemoRole = useCallback((): UserRole => {
    if (!demoStore) return initialRole;
    return parseValidUserRole(demoStore.getState().activeRole) ?? 'clinician';
  }, [demoStore, initialRole]);

  const subscribeDemoRole = useCallback(
    (listener: (role: UserRole) => void): (() => void) => {
      if (!demoStore) return () => {};
      return demoStore.subscribe(() => {
        const nextRole = parseValidUserRole(demoStore.getState().activeRole) ?? 'clinician';
        listener(nextRole);
      });
    },
    [demoStore],
  );

  const resetDemoState = useCallback(() => {
    if (!isDemoMode || !demoStore) {
      queryClient.clear();
      return;
    }
    demoStore.resetToCanonicalSeed(env.VITE_DEMO_REFERENCE_DATE);
    void queryClient.invalidateQueries();
    setResetConfirmationVisible(true);
    if (typeof window !== 'undefined') {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => {
        setResetConfirmationVisible(false);
      }, 3000);
    }
  }, [demoStore, isDemoMode, queryClient]);

  const value = useMemo<ServiceContextValue>(
    () => ({
      services,
      isDemoMode,
      resetDemoState,
      getActiveDemoRole,
      subscribeDemoRole,
      resetConfirmationVisible,
    }),
    [
      getActiveDemoRole,
      isDemoMode,
      resetConfirmationVisible,
      resetDemoState,
      services,
      subscribeDemoRole,
    ],
  );

  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
}

export function useServiceContext(): ServiceContextValue {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useServiceContext must be used inside a ServiceProvider.');
  }
  return ctx;
}

export function useServices(): ICoSignServices {
  return useServiceContext().services;
}
