import { useParams, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useServices } from "../../app/providers/ServiceProvider";
import { useWorkspacePreferences } from "../../app/providers/useWorkspacePreferences";
import { ButtonLink } from "../../design-system/components/Button";
import { Card } from "../../design-system/components/Card";
import { QueryError } from "../../design-system/components/QueryError";
import {
  ClinicalRecordingStudio,
  type StudioCaptureMode,
} from "./ClinicalRecordingStudio";

/** Resolve the route and defaults before mounting any interactive capture state. */
export function ClinicalVisitCapturePage({
  defaultMode,
}: {
  readonly defaultMode?: StudioCaptureMode;
}) {
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const sessionId =
    routeSessionId ?? searchParams.get("sessionId") ?? undefined;
  const mode =
    defaultMode ??
    (searchParams.get("mode") === "upload" ? "upload" : "microphone");
  const services = useServices();
  const preferences = useWorkspacePreferences();
  const visit = useQuery({
    queryKey: ["session-review-bundle", sessionId],
    queryFn: () => services.sessions.getSessionReviewBundle(sessionId!),
    enabled: sessionId !== undefined,
  });

  if (
    sessionId !== undefined &&
    (visit.isError || (visit.isSuccess && !visit.data?.session))
  ) {
    return (
      <Card className="space-y-4">
        <h1 className="text-2xl">Visit could not be loaded</h1>
        <QueryError
          title="Recording is unavailable"
          error={visit.error ?? new Error("Visit not found.")}
          onRetry={() => void visit.refetch()}
        />
        <ButtonLink to="/clinician/sessions">
          Back to clinical sessions
        </ButtonLink>
      </Card>
    );
  }
  if (preferences.isError) {
    return (
      <QueryError
        title="Recording preferences could not be loaded"
        error={preferences.error}
        onRetry={() => void preferences.refetch()}
      />
    );
  }
  if (!preferences.data || (sessionId !== undefined && !visit.data)) {
    return <Card role="status">Loading recording workspace…</Card>;
  }

  return (
    <ClinicalRecordingStudio
      key={`${sessionId ?? "new"}:${mode}`}
      initialSessionId={sessionId}
      defaultMode={mode}
      preferences={preferences.data}
    />
  );
}
