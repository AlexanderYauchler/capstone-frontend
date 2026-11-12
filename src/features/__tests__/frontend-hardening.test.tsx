import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../app/providers/AppProviders";
import { appRoutes } from "../../app/router/routes";
import { RouteErrorPage } from "../../app/router/RouteErrorPage";
import type { SessionReviewBundle } from "../../services/contracts";
import { DemoStore } from "../../services/demo/demo-store";

const faults = vi.hoisted(() => ({
  preferences: false,
  sessions: false,
  audit: false,
  visit: null as (() => Promise<SessionReviewBundle>) | null,
}));

vi.mock("../../services/demo/demo-services", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/demo/demo-services")>();
  return {
    ...actual,
    createDemoServices: (store: DemoStore) => {
      const services = actual.createDemoServices(store);
      const getPreferences = services.admin.getPreferences;
      const listSessions = services.sessions.listSessions;
      const listAuditEvents = services.admin.listAuditEvents;
      const getBundle = services.sessions.getSessionReviewBundle;
      services.admin.getPreferences = () =>
        faults.preferences
          ? Promise.reject(new Error("Preferences offline"))
          : getPreferences();
      services.sessions.listSessions = (...args) =>
        faults.sessions
          ? Promise.reject(new Error("Sessions offline"))
          : listSessions(...args);
      services.admin.listAuditEvents = () =>
        faults.audit
          ? Promise.reject(new Error("Audit offline"))
          : listAuditEvents();
      services.sessions.getSessionReviewBundle = (id) =>
        faults.visit ? faults.visit() : getBundle(id);
      return services;
    },
  };
});

function open(
  path: string,
  store = new DemoStore({ persistToSessionStorage: false }),
) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <AppProviders customStore={store}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, store };
}

beforeEach(() => {
  window.sessionStorage.clear();
  faults.preferences = false;
  faults.sessions = false;
  faults.audit = false;
  faults.visit = null;
});
afterEach(() => vi.restoreAllMocks());

describe("Recording route safety", () => {
  it.each([
    "/clinician/sessions/MISSING/record",
    "/clinician/sessions/new?sessionId=MISSING",
  ])(
    "blocks an unknown visit at %s without creating an encounter",
    async (path) => {
      const { store } = open(path);
      const count = store.getState().sessions.length;
      expect(
        await screen.findByRole("heading", {
          name: "Visit could not be loaded",
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText(/Synthetic Patient Record/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Start recording/i }),
      ).not.toBeInTheDocument();
      expect(store.getState().sessions).toHaveLength(count);
    },
  );

  it("keeps patient and capture controls hidden until a slow visit lookup completes", async () => {
    let resolveVisit!: (bundle: SessionReviewBundle) => void;
    faults.visit = () =>
      new Promise((resolve) => {
        resolveVisit = resolve;
      });
    const { store } = open("/clinician/sessions/CS-1047/record");
    expect(
      await screen.findByText("Loading recording workspace…"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Synthetic Patient Record/i),
    ).not.toBeInTheDocument();
    await act(async () => {
      resolveVisit({
        session: store.getState().sessions.find((s) => s.id === "CS-1047")!,
      });
    });
    expect(
      await screen.findByRole("heading", { name: /Record a clinical visit/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Synthetic Patient Record/i)).toHaveValue(
      "pat-riley-patel",
    );
  });

  it("retries a failed visit lookup and opens the requested patient", async () => {
    faults.visit = () => Promise.reject(new Error("Visit service offline"));
    open("/clinician/sessions/CS-1047/record");
    expect(
      await screen.findByText("Visit service offline"),
    ).toBeInTheDocument();
    faults.visit = null;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: /Record a clinical visit/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Synthetic Patient Record/i)).toHaveValue(
      "pat-riley-patel",
    );
  });

  it("replaces recording state when the visit route parameter changes", async () => {
    const { router } = open("/clinician/sessions/CS-1047/record");
    await screen.findByRole("heading", { name: /Record a clinical visit/i });
    expect(screen.getByLabelText(/Synthetic Patient Record/i)).toHaveValue(
      "pat-riley-patel",
    );
    await act(async () => {
      await router.navigate("/clinician/sessions/CS-1042/record");
    });
    await waitFor(() =>
      expect(screen.getByLabelText(/Synthetic Patient Record/i)).toHaveValue(
        "pat-alex-morgan",
      ),
    );
  });
});

describe("Working preferences", () => {
  it("applies the saved template to a new encounter and compact density to the workspace", async () => {
    const store = new DemoStore({ persistToSessionStorage: false });
    store.update((state) => ({
      ...state,
      preferences: {
        ...state.preferences,
        defaultTemplateId: "narrative_summary",
        interfaceDensity: "compact",
      },
    }));
    open("/clinician/sessions/new", store);
    await screen.findByRole("heading", { name: /Record a clinical visit/i });
    expect(
      document.querySelector('[data-density="compact"]'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByLabelText(
        /I confirm that verbal or written recording consent/i,
      ),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Continue to recording/i }),
    );
    await waitFor(() =>
      expect(store.getState().sessions.at(-1)?.templateId).toBe(
        "narrative_summary",
      ),
    );
  });

  it("updates density after saving Settings and uses the new template on the next recording", async () => {
    const user = userEvent.setup();
    const { router, store } = open("/settings");
    const form = await screen.findByRole("form", {
      name: "Workspace preferences",
    });
    await user.selectOptions(
      within(form).getByLabelText("Default report template"),
      "narrative_summary",
    );
    await user.click(within(form).getByLabelText("Compact"));
    await user.click(
      within(form).getByRole("button", { name: "Save settings" }),
    );
    await screen.findByText("Settings saved");
    expect(
      document.querySelector('[data-density="compact"]'),
    ).toBeInTheDocument();
    await act(async () => {
      await router.navigate("/clinician/sessions/new");
    });
    await screen.findByRole("heading", { name: /Record a clinical visit/i });
    await user.click(
      screen.getByLabelText(
        /I confirm that verbal or written recording consent/i,
      ),
    );
    await user.click(
      screen.getByRole("button", { name: /Continue to recording/i }),
    );
    await waitFor(() =>
      expect(store.getState().sessions.at(-1)?.templateId).toBe(
        "narrative_summary",
      ),
    );
  });
});

describe("Recoverable service failures", () => {
  it("shows a settings error and can recover using Try again", async () => {
    faults.preferences = true;
    open("/settings");
    await screen.findByRole("heading", {
      name: "Settings could not be loaded",
    });
    expect(screen.queryByText("Loading settings…")).not.toBeInTheDocument();
    faults.preferences = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("form", { name: "Workspace preferences" }),
    ).toBeInTheDocument();
  });

  it("does not display zero metrics when the admin session request fails", async () => {
    faults.sessions = true;
    open(
      "/admin",
      new DemoStore({ persistToSessionStorage: false, initialRole: "admin" }),
    );
    await screen.findByRole("heading", {
      name: "Workspace summary could not be loaded",
    });
    expect(
      screen.queryByRole("region", { name: "Workspace summary" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("In the demo workspace")).not.toBeInTheDocument();
    faults.sessions = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByText("In the demo workspace"),
    ).toBeInTheDocument();
  });

  it("does not label a failed audit request as an empty filter result", async () => {
    faults.audit = true;
    open(
      "/admin?tab=audit",
      new DemoStore({ persistToSessionStorage: false, initialRole: "admin" }),
    );
    await screen.findByRole("heading", {
      name: "Audit log could not be loaded",
    });
    expect(
      screen.queryByText("No events match this filter."),
    ).not.toBeInTheDocument();
  });
});

it("scrolls to the top and moves focus to main content after footer navigation", async () => {
  open("/clinician/sessions/new");
  await screen.findByRole("heading", { name: /Record a clinical visit/i });
  const scroll = vi.spyOn(window, "scrollTo");
  scroll.mockClear();
  await userEvent.click(
    within(screen.getByRole("navigation", { name: "Footer" })).getByRole(
      "link",
      { name: "Dashboard" },
    ),
  );
  await screen.findByRole("heading", { name: /Good morning/i });
  expect(scroll).toHaveBeenCalledWith(0, 0);
  expect(document.getElementById("main-content")).toHaveFocus();
});

it("offers recovery when an unexpected page render fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  function BrokenPage(): never {
    throw new Error("Unexpected page failure");
  }
  const router = createMemoryRouter([
    { path: "/", element: <BrokenPage />, errorElement: <RouteErrorPage /> },
  ]);
  render(<RouterProvider router={router} />);
  expect(
    await screen.findByRole("heading", {
      name: "This page could not be opened",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Reload page" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Return to role selection" }),
  ).toHaveAttribute("href", "/");
});
