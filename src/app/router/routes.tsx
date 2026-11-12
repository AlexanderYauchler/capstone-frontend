import { Navigate, type RouteObject } from "react-router";
import { RoleSelectionPage } from "../../features/auth/RoleSelectionPage";
import { NotFoundPage } from "./NotFoundPage";
import { RoleGuard } from "./RoleGuard";
import { RouteLayout } from "./RouteLayout";
import { RouteErrorPage } from "./RouteErrorPage";

// ============================================================================
// CoSign — Route table (every route renders a working screen)
// ============================================================================

export const appRoutes: RouteObject[] = [
  {
    element: <RouteLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <p role="status">Opening workspace…</p>,
    children: [
      {
        path: "/",
        element: <Navigate to="/login" replace />,
      },
      // 1. Login / Demo Role Selection
      {
        path: "/login",
        element: <RoleSelectionPage />,
      },

      // Clinician Workspace Routes (Routes 2..11)
      {
        element: <RoleGuard allowedRoles={["clinician"]} />,
        children: [
          {
            path: "/clinician/dashboard",
            lazy: async () => ({
              Component: (
                await import("../../features/clinician/ClinicianDashboardPage")
              ).ClinicianDashboardPage,
            }),
          },
          {
            path: "/clinician/sessions",
            lazy: async () => ({
              Component: (
                await import("../../features/clinician/ClinicalSessionsPage")
              ).ClinicalSessionsPage,
            }),
          },
          {
            path: "/clinician/sessions/new",
            lazy: async () => {
              const { ClinicalVisitCapturePage } =
                await import("../../features/clinician/ClinicalVisitCapturePage");
              return { Component: () => <ClinicalVisitCapturePage /> };
            },
          },
          {
            path: "/clinician/sessions/upload",
            lazy: async () => {
              const { ClinicalVisitCapturePage } =
                await import("../../features/clinician/ClinicalVisitCapturePage");
              return {
                Component: () => (
                  <ClinicalVisitCapturePage defaultMode="upload" />
                ),
              };
            },
          },
          {
            path: "/clinician/sessions/:sessionId/record",
            lazy: async () => {
              const { ClinicalVisitCapturePage } =
                await import("../../features/clinician/ClinicalVisitCapturePage");
              return { Component: () => <ClinicalVisitCapturePage /> };
            },
          },
          {
            path: "/clinician/sessions/:sessionId",
            lazy: async () => ({
              Component: (
                await import("../../features/clinician/ClinicalSessionDetailPage")
              ).ClinicalSessionDetailPage,
            }),
          },
          {
            path: "/clinician/reviews",
            lazy: async () => ({
              Component: (
                await import("../../features/clinician/ReviewQueuePage")
              ).ReviewQueuePage,
            }),
          },
          {
            path: "/clinician/sessions/:sessionId/summary",
            lazy: async () => ({
              Component: (
                await import("../../features/clinician/ClinicalSessionSubpages")
              ).ClinicalSessionSummaryPage,
            }),
          },
          {
            path: "/clinician/sessions/:sessionId/privacy",
            lazy: async () => ({
              Component: (
                await import("../../features/clinician/ClinicalSessionSubpages")
              ).ClinicalSessionPrivacyPage,
            }),
          },
          {
            path: "/clinician/sessions/:sessionId/history",
            lazy: async () => ({
              Component: (
                await import("../../features/clinician/ClinicalSessionSubpages")
              ).ClinicalSessionHistoryPage,
            }),
          },
          {
            path: "/clinician/analytics",
            lazy: async () => ({
              Component: (
                await import("../../features/analytics/AnalyticsPage")
              ).AnalyticsPage,
            }),
          },
        ],
      },

      // Patient Portal Routes (Routes 12..15)
      {
        element: <RoleGuard allowedRoles={["patient"]} />,
        children: [
          {
            path: "/patient",
            lazy: async () => {
              const { PatientReportsListPage } =
                await import("../../features/patient/PatientReportsListPage");
              return {
                Component: () => <PatientReportsListPage mode="overview" />,
              };
            },
          },
          {
            path: "/patient/reports",
            lazy: async () => {
              const { PatientReportsListPage } =
                await import("../../features/patient/PatientReportsListPage");
              return {
                Component: () => <PatientReportsListPage mode="reports" />,
              };
            },
          },
          {
            path: "/patient/reports/:reportId",
            lazy: async () => ({
              Component: (
                await import("../../features/patient/PatientReportDetailPage")
              ).PatientReportDetailPage,
            }),
          },
          {
            path: "/patient/history",
            lazy: async () => {
              const { PatientReportsListPage } =
                await import("../../features/patient/PatientReportsListPage");
              return {
                Component: () => <PatientReportsListPage mode="history" />,
              };
            },
          },
        ],
      },

      // Analyst Workspace Route (Route 16)
      {
        element: <RoleGuard allowedRoles={["analyst"]} />,
        children: [
          {
            path: "/analyst/analytics",
            lazy: async () => ({
              Component: (
                await import("../../features/analytics/AnalyticsPage")
              ).AnalyticsPage,
            }),
          },
        ],
      },

      // Administrator Workspace Route (Route 17)
      {
        element: <RoleGuard allowedRoles={["admin"]} />,
        children: [
          {
            path: "/admin",
            lazy: async () => ({
              Component: (await import("../../features/admin/AdminPage"))
                .AdminPage,
            }),
          },
        ],
      },

      // Shared Role-Aware Settings Route (Route 18)
      {
        element: <RoleGuard allowedRoles={["clinician", "admin"]} />,
        children: [
          {
            path: "/settings",
            lazy: async () => ({
              Component: (await import("../../features/settings/SettingsPage"))
                .SettingsPage,
            }),
          },
        ],
      },

      // Graceful 404 Fallback Route
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
];
