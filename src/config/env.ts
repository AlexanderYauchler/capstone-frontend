import { z } from 'zod';

const EnvSchema = z.object({
  VITE_APP_MODE: z.enum(['demo', 'connected']).default('demo'),
  VITE_API_BASE_URL: z.string().default('/api/v1'),
  VITE_DEMO_REFERENCE_DATE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .default('2026-10-06'),
  VITE_CLINIC_TIMEZONE: z.string().default('America/Indiana/Indianapolis'),
});

const rawEnv = {
  VITE_APP_MODE: import.meta.env.VITE_APP_MODE,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_DEMO_REFERENCE_DATE: import.meta.env.VITE_DEMO_REFERENCE_DATE,
  VITE_CLINIC_TIMEZONE: import.meta.env.VITE_CLINIC_TIMEZONE,
};

export const env = EnvSchema.parse({
  VITE_APP_MODE: rawEnv.VITE_APP_MODE || undefined,
  VITE_API_BASE_URL: rawEnv.VITE_API_BASE_URL || undefined,
  VITE_DEMO_REFERENCE_DATE: rawEnv.VITE_DEMO_REFERENCE_DATE || undefined,
  VITE_CLINIC_TIMEZONE: rawEnv.VITE_CLINIC_TIMEZONE || undefined,
});

export type AppMode = z.infer<typeof EnvSchema>['VITE_APP_MODE'];
