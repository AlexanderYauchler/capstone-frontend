import { Navigate, type RouteObject } from 'react-router';
import { AdminPage } from '../../features/admin/AdminPage';
import { AnalyticsPage } from '../../features/analytics/AnalyticsPage';
import { RoleSelectionPage } from '../../features/auth/RoleSelectionPage';
import { ClinicalVisitCapturePage } from '../../features/clinician/ClinicalVisitCapturePage';
import {
  ClinicalSessionHistoryPage,
  ClinicalSessionPrivacyPage,
  ClinicalSessionSummaryPage,
} from '../../features/clinician/ClinicalSessionSubpages';
import { ReviewQueuePage } from '../../features/clinician/ReviewQueuePage';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { ClinicianDashboardPage } from '../../features/clinician/ClinicianDashboardPage';
import { ClinicalSessionDetailPage } from '../../features/clinician/ClinicalSessionDetailPage';
import { ClinicalSessionsPage } from '../../features/clinician/ClinicalSessionsPage';
import { PatientReportDetailPage } from '../../features/patient/PatientReportDetailPage';
import { PatientReportsListPage } from '../../features/patient/PatientReportsListPage';
import { NotFoundPage } from './NotFoundPage';
import { RoleGuard } from './RoleGuard';

// ============================================================================
// CoSign — Route table (every route renders a working screen)
// ============================================================================

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  // 1. Login / Demo Role Selection
  {
    path: '/login',
    element: <RoleSelectionPage />,
  },

  // Clinician Workspace Routes (Routes 2..11)
  {
    element: <RoleGuard allowedRoles={['clinician']} />,
    children: [
      {
        path: '/clinician/dashboard',
        element: <ClinicianDashboardPage />,
      },
      {
        path: '/clinician/sessions',
        element: <ClinicalSessionsPage />,
      },
      {
        path: '/clinician/sessions/new',
        element: <ClinicalVisitCapturePage key="new-visit" />,
      },
      {
        path: '/clinician/sessions/upload',
        element: <ClinicalVisitCapturePage key="upload-visit" defaultMode="upload" />,
      },
      {
        path: '/clinician/sessions/:sessionId/record',
        element: <ClinicalVisitCapturePage key="record-visit" />,
      },
      {
        path: '/clinician/sessions/:sessionId',
        element: <ClinicalSessionDetailPage />,
      },
      {
        path: '/clinician/reviews',
        element: <ReviewQueuePage />,
      },
      {
        path: '/clinician/sessions/:sessionId/summary',
        element: <ClinicalSessionSummaryPage />,
      },
      {
        path: '/clinician/sessions/:sessionId/privacy',
        element: <ClinicalSessionPrivacyPage />,
      },
      {
        path: '/clinician/sessions/:sessionId/history',
        element: <ClinicalSessionHistoryPage />,
      },
      {
        path: '/clinician/analytics',
        element: <AnalyticsPage />,
      },
    ],
  },

  // Patient Portal Routes (Routes 12..15)
  {
    element: <RoleGuard allowedRoles={['patient']} />,
    children: [
      {
        path: '/patient',
        element: <PatientReportsListPage mode="overview" />,
      },
      {
        path: '/patient/reports',
        element: <PatientReportsListPage mode="reports" />,
      },
      {
        path: '/patient/reports/:reportId',
        element: <PatientReportDetailPage />,
      },
      {
        path: '/patient/history',
        element: <PatientReportsListPage mode="history" />,
      },
    ],
  },

  // Analyst Workspace Route (Route 16)
  {
    element: <RoleGuard allowedRoles={['analyst']} />,
    children: [
      {
        path: '/analyst/analytics',
        element: <AnalyticsPage />,
      },
    ],
  },

  // Administrator Workspace Route (Route 17)
  {
    element: <RoleGuard allowedRoles={['admin']} />,
    children: [
      {
        path: '/admin',
        element: <AdminPage />,
      },
    ],
  },

  // Shared Role-Aware Settings Route (Route 18)
  {
    element: <RoleGuard allowedRoles={['clinician', 'admin']} />,
    children: [
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },

  // Graceful 404 Fallback Route
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
