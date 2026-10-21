import { Navigate, type RouteObject } from 'react-router';
import { RoleSelectionPage } from '../../features/auth/RoleSelectionPage';
import { ClinicianDashboardPage } from '../../features/clinician/ClinicianDashboardPage';
import { ClinicalSessionDetailPage } from '../../features/clinician/ClinicalSessionDetailPage';
import { ClinicalSessionsPage } from '../../features/clinician/ClinicalSessionsPage';
import { PatientReportDetailPage } from '../../features/patient/PatientReportDetailPage';
import { PatientReportsListPage } from '../../features/patient/PatientReportsListPage';
import { NotFoundPage } from './NotFoundPage';
import { RoleGuard } from './RoleGuard';
import { SequencePlaceholderPage } from './SequencePlaceholderPage';

// ============================================================================
// CoSign — Verified Route Architecture Table (Sequence 3A)
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
        element: (
          <SequencePlaceholderPage
            title="Start a clinical visit"
            subtitle="Confirm the visit details and patient consent before recording."
            sequenceTarget="Sequence 4"
          />
        ),
      },
      {
        path: '/clinician/sessions/upload',
        element: (
          <SequencePlaceholderPage
            title="Upload a clinical recording"
            subtitle="Use a consented, pre-recorded visit as an alternative to live recording."
            sequenceTarget="Sequence 4"
          />
        ),
      },
      {
        path: '/clinician/sessions/:sessionId/record',
        element: (
          <SequencePlaceholderPage
            title="Record clinical visit"
            subtitle="Live browser audio capture or explicitly labeled simulated demo recording."
            sequenceTarget="Sequence 4"
          />
        ),
      },
      {
        path: '/clinician/sessions/:sessionId',
        element: <ClinicalSessionDetailPage />,
      },
      {
        path: '/clinician/sessions/:sessionId/summary',
        element: (
          <SequencePlaceholderPage
            title="Collected data summary"
            subtitle="Structured visit information remains a draft until clinician approval."
            sequenceTarget="Sequence 3"
          />
        ),
      },
      {
        path: '/clinician/sessions/:sessionId/privacy',
        element: (
          <SequencePlaceholderPage
            title="Preparing de-identified analytics"
            subtitle="The finalized clinical report stays separate from the analytics record."
            sequenceTarget="Sequence 3"
          />
        ),
      },
      {
        path: '/clinician/sessions/:sessionId/history',
        element: (
          <SequencePlaceholderPage
            title="Clinical report history"
            subtitle="Clinician edits, approvals, and release actions are traceable."
            sequenceTarget="Sequence 3"
          />
        ),
      },
      {
        path: '/clinician/analytics',
        element: (
          <SequencePlaceholderPage
            title="Healthcare analytics"
            subtitle="Explore clinical patterns using de-identified aggregate demonstration data."
            sequenceTarget="Sequence 4"
            kind="analytics"
          />
        ),
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
        element: (
          <SequencePlaceholderPage
            title="Healthcare analytics"
            subtitle="Explore clinical patterns using de-identified aggregate demonstration data."
            sequenceTarget="Sequence 4"
            kind="analytics"
          />
        ),
      },
    ],
  },

  // Administrator Workspace Route (Route 17)
  {
    element: <RoleGuard allowedRoles={['admin']} />,
    children: [
      {
        path: '/admin',
        element: (
          <SequencePlaceholderPage
            title="Administration workspace"
            subtitle="Manage role access and inspect workspace activity."
            sequenceTarget="Sequence 4"
          />
        ),
      },
    ],
  },

  // Shared Role-Aware Settings Route (Route 18)
  {
    element: <RoleGuard allowedRoles={['clinician', 'admin']} />,
    children: [
      {
        path: '/settings',
        element: (
          <SequencePlaceholderPage
            title="Workspace settings"
            subtitle="Preferences for your role and clinical workspace."
            sequenceTarget="Sequence 4"
          />
        ),
      },
    ],
  },

  // Graceful 404 Fallback Route
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
