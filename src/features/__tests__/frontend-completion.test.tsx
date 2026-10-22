import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../../app/providers/AppProviders';
import { appRoutes } from '../../app/router/routes';
import { DemoStore } from '../../services/demo/demo-store';

function renderApp(initialEntries: string[], store?: DemoStore) {
  const router = createMemoryRouter(appRoutes, { initialEntries });
  return {
    router,
    ...render(
      <AppProviders customStore={store}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}

function storeFor(role: 'clinician' | 'patient' | 'analyst' | 'admin') {
  return new DemoStore({ persistToSessionStorage: false, initialRole: role });
}

describe('Recording workflow', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is reachable, explains unsupported browsers, and gates actions on consent', async () => {
    renderApp(['/clinician/sessions/new'], storeFor('clinician'));
    expect(await screen.findByRole('heading', { level: 1, name: /Record a clinical visit/i })).toBeInTheDocument();
    // jsdom has no microphone APIs, so the page must say so instead of failing silently.
    expect(screen.getByText(/Live Browser Microphone Capture Unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use simulated demo audio/i })).toBeDisabled();
  });

  it('records with simulated audio, generates a draft for the selected patient, and opens review', async () => {
    const user = userEvent.setup();
    const store = storeFor('clinician');
    const { router } = renderApp(['/clinician/sessions/new'], store);

    await screen.findByRole('heading', { level: 1, name: /Record a clinical visit/i });
    await user.selectOptions(screen.getByLabelText(/Synthetic Patient Record/i), 'pat-riley-patel');
    await user.selectOptions(screen.getByLabelText(/Clinical Category/i), 'URI_acute');
    await user.click(screen.getByLabelText(/I confirm that verbal or written recording consent/i));
    await user.click(screen.getByRole('button', { name: /Use simulated demo audio/i }));

    expect(await screen.findByText(/Recording saved for visit CS-1049/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Generate draft and review/i }));

    expect(await screen.findByRole('heading', { name: /Preparing the draft report/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/clinician/sessions/CS-1049');

    // Simulated processing completes and attaches a draft for Riley Patel, never CS-1042's patient.
    expect(
      await screen.findByText(/Does the patient have any known drug allergies\?/i, undefined, { timeout: 9000 }),
    ).toBeInTheDocument();
    const report = store.getState().reports['CS-1049']!;
    expect(report.patientName).toBe('Riley Patel');
    expect(report.patientId).toBe('pat-riley-patel');
    expect(store.getState().transcripts['CS-1049']!.segments[0]!.evidenceDetail).toMatch(/Simulated demo transcript/i);
  }, 15000);

  it('shows a clear message and a retry path when microphone permission is denied', async () => {
    const user = userEvent.setup();
    class FakeMediaRecorder {
      static isTypeSupported() {
        return true;
      }
    }
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')),
        enumerateDevices: vi.fn().mockResolvedValue([{ kind: 'audioinput', deviceId: 'mic-1', label: 'Test mic', groupId: 'g' }]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    renderApp(['/clinician/sessions/new'], storeFor('clinician'));
    await screen.findByRole('heading', { level: 1, name: /Record a clinical visit/i });
    await user.click(screen.getByLabelText(/I confirm that verbal or written recording consent/i));
    await user.click(screen.getByRole('button', { name: /^Start recording$/i }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Microphone Permission Denied/i)).toBeInTheDocument();
    // The user can recover: dismiss, or fall back to attaching a file.
    expect(within(alert).getByRole('button', { name: /Switch to Audio File Upload/i })).toBeInTheDocument();

    Reflect.deleteProperty(navigator, 'mediaDevices');
  });
});

describe('Clinician review', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('requires a reason before requesting changes, then shows the revised draft being prepared', async () => {
    const user = userEvent.setup();
    const store = storeFor('clinician');
    renderApp(['/clinician/sessions/CS-1047'], store);

    await screen.findByRole('heading', { name: /Riley Patel — Hypertension follow-up/i });
    await user.click(screen.getByRole('button', { name: /^Request changes$/i }));
    const dialog = await screen.findByRole('dialog', { name: /Request changes to this draft/i });
    await user.click(within(dialog).getByRole('button', { name: /Request revised draft/i }));
    expect(await within(dialog).findByText(/Describe what needs to change/i)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/What needs to change/i), 'Assessment should mention home BP trend.');
    await user.click(within(dialog).getByRole('button', { name: /Request revised draft/i }));

    expect(await screen.findByRole('heading', { name: /Preparing a revised draft/i })).toBeInTheDocument();
    const revisions = store.getState().reports['CS-1047']!.revisions;
    expect(revisions.some((r) => r.rejectionReason === 'Assessment should mention home BP trend.')).toBe(true);
  });

  it('groups the review queue by what the clinician needs to do', async () => {
    renderApp(['/clinician/reviews'], storeFor('clinician'));
    const group = await screen.findByRole('heading', { name: /Needs your answers/i });
    const card = group.closest('div.space-y-2') as HTMLElement;
    expect(within(card).getByRole('link', { name: /Alex Morgan · Diabetes follow-up/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ready to approve \(2\)/i })).toBeInTheDocument();
  });
});

describe('Analytics', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  function kpiValue(label: RegExp): string {
    const labelEl = screen.getByText(label, { selector: 'span' });
    return labelEl.closest('div.bg-white')!.querySelector('.font-display')!.textContent ?? '';
  }

  it('updates monthly KPIs when the diagnosis filter is applied and when the month changes', async () => {
    const user = userEvent.setup();
    renderApp(['/clinician/analytics?view=monthly'], storeFor('clinician'));

    expect(await screen.findByRole('heading', { level: 2, name: /September 2026/i })).toBeInTheDocument();
    const allSessions = Number(kpiValue(/^Clinical sessions$/));
    expect(allSessions).toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText(/Diagnosis category/i), 'diabetes');
    await user.click(screen.getByRole('button', { name: /Apply filters/i }));
    expect(await screen.findByRole('button', { name: /Remove filter Diagnosis: Diabetes/i })).toBeInTheDocument();
    const diabetesSessions = Number(kpiValue(/^Clinical sessions$/));
    expect(diabetesSessions).toBeLessThan(allSessions);

    await user.click(screen.getByRole('button', { name: /Previous month/i }));
    expect(await screen.findByRole('heading', { level: 2, name: /August 2026/i })).toBeInTheDocument();
  });

  it('shows an empty state with a reset action when no visits match', async () => {
    const user = userEvent.setup();
    renderApp(['/clinician/analytics?view=cohort&dx=wellness&dept=cardiology'], storeFor('clinician'));
    expect(await screen.findByText(/No visits match these filters/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /Reset filters/i })[0]!);
    expect(await screen.findByText(/Visits in this view/i)).toBeInTheDocument();
  });

  it('rejects an inverted date range', async () => {
    const user = userEvent.setup();
    renderApp(['/clinician/analytics?view=cohort'], storeFor('clinician'));
    await screen.findByText(/Visits in this view/i);
    fireEvent.change(screen.getByLabelText(/^From$/i), { target: { value: '2026-10-05' } });
    fireEvent.change(screen.getByLabelText(/^To$/i), { target: { value: '2026-09-01' } });
    await user.click(screen.getByRole('button', { name: /Apply filters/i }));
    expect(await screen.findByText(/start date must be on or before the end date/i)).toBeInTheDocument();
  });
});

describe('Role-based access', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('blocks an analyst from the recording page and hides clinician links', async () => {
    renderApp(['/clinician/sessions/new'], storeFor('analyst'));
    expect(await screen.findByRole('heading', { name: /Access restricted/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /New recording/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Clinical sessions/i })).not.toBeInTheDocument();
  });

  it('shows patients only patient navigation and keeps unreleased drafts private', async () => {
    renderApp(['/patient/reports/CS-1047'], storeFor('patient'));
    expect(await screen.findByText(/could not be|not authorized|another patient|unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Dashboard$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Analytics/i })).not.toBeInTheDocument();
  });
});
