import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useServices } from "../../app/providers/ServiceProvider";
import { Button } from "../../design-system/components/Button";
import { Card } from "../../design-system/components/Card";
import { PageHeader } from "../../design-system/components/PageHeader";
import { QueryError } from "../../design-system/components/QueryError";
import { ROLE_WORKSPACE_LABELS } from "../../design-system/layouts/Sidebar";
import type { WorkspacePreferences } from "../../domain/models";

function PreferencesForm({
  initial,
}: {
  readonly initial: WorkspacePreferences;
}) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [errorText, setErrorText] = useState("");
  const isDirty =
    draft.defaultMicrophone !== initial.defaultMicrophone ||
    draft.defaultTemplateId !== initial.defaultTemplateId ||
    draft.interfaceDensity !== initial.interfaceDensity;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const saved = await services.admin.savePreferences({
        defaultMicrophone: draft.defaultMicrophone,
        defaultTemplateId: draft.defaultTemplateId,
        interfaceDensity: draft.interfaceDensity,
      });
      queryClient.setQueryData(["workspace-preferences"], saved);
      await queryClient.invalidateQueries({ queryKey: ["audit-events"] });
      setStatus("saved");
    } catch (err) {
      setErrorText(
        err instanceof Error ? err.message : "Settings could not be saved.",
      );
      setStatus("error");
    }
  };

  const field =
    "w-full h-10 px-3 rounded-[8px] border border-[#056233]/40 bg-white text-sm";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-5"
      aria-label="Workspace preferences"
    >
      <div>
        <label
          htmlFor="pref-template"
          className="block text-sm font-bold text-[#0d4026] mb-1"
        >
          Default report template
        </label>
        <select
          id="pref-template"
          className={field}
          value={draft.defaultTemplateId}
          onChange={(e) => {
            setStatus("idle");
            setDraft({
              ...draft,
              defaultTemplateId: e.target
                .value as WorkspacePreferences["defaultTemplateId"],
            });
          }}
        >
          <option value="soap_standard">Standard SOAP note</option>
          <option value="narrative_summary">Narrative visit summary</option>
        </select>
        <p className="text-xs text-[#495057] mt-1">
          Used when you start a new recording.
        </p>
      </div>
      <div>
        <label
          htmlFor="pref-mic"
          className="block text-sm font-bold text-[#0d4026] mb-1"
        >
          Preferred microphone label
        </label>
        <select
          id="pref-mic"
          className={field}
          value={draft.defaultMicrophone}
          onChange={(e) => {
            setStatus("idle");
            setDraft({
              ...draft,
              defaultMicrophone: e.target
                .value as WorkspacePreferences["defaultMicrophone"],
            });
          }}
        >
          <option value="MacBook microphone">Built-in microphone</option>
          <option value="External USB microphone">
            External USB microphone
          </option>
        </select>
        <p className="text-xs text-[#495057] mt-1">
          Used when the matching device is available. Otherwise, recording uses
          the system default.
        </p>
      </div>
      <fieldset>
        <legend className="text-sm font-bold text-[#0d4026] mb-1">
          Display density
        </legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              {
                value: "comfortable_high_contrast",
                label: "Comfortable (recommended)",
              },
              { value: "compact", label: "Compact" },
            ] as const
          ).map((o) => (
            <label
              key={o.value}
              className="inline-flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name="density"
                value={o.value}
                checked={draft.interfaceDensity === o.value}
                onChange={() => {
                  setStatus("idle");
                  setDraft({ ...draft, interfaceDensity: o.value });
                }}
                className="w-4 h-4 accent-[#00783c]"
              />
              {o.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-[#495057] mt-1">
          Compact reduces workspace spacing while preserving text size.
        </p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!isDirty || status === "saving"}>
          {status === "saving" ? "Saving…" : "Save settings"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!isDirty || status === "saving"}
          onClick={() => {
            setDraft(initial);
            setStatus("idle");
          }}
        >
          Undo changes
        </Button>
        <span aria-live="polite" className="text-sm font-semibold">
          {status === "saved" && (
            <span className="inline-flex items-center gap-1.5 text-[#00783c]">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Settings
              saved
            </span>
          )}
          {status === "error" && (
            <span className="text-[var(--color-danger)]">{errorText}</span>
          )}
        </span>
      </div>
    </form>
  );
}

export function SettingsPage() {
  const services = useServices();
  const { currentUser } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["workspace-preferences"],
    queryFn: () => services.admin.getPreferences(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: ROLE_WORKSPACE_LABELS[currentUser.role] },
          { label: "Settings" },
        ]}
        title="Settings"
        description="Preferences for your workspace. Changes are saved for this demo session."
      />
      <Card padding="md" className="max-w-2xl">
        {isError ? (
          <QueryError
            title="Settings could not be loaded"
            error={error}
            onRetry={() => void refetch()}
          />
        ) : isLoading || !data ? (
          <p role="status" className="text-sm text-[#495057]">
            Loading settings…
          </p>
        ) : (
          <PreferencesForm initial={data} />
        )}
      </Card>
    </div>
  );
}
