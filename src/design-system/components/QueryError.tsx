import { Button } from "./Button";

export function QueryError({
  title,
  error,
  onRetry,
}: {
  readonly title: string;
  readonly error: unknown;
  readonly onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] p-4 space-y-3"
    >
      <h2 className="font-bold text-[var(--color-danger)]">{title}</h2>
      <p className="text-sm">
        {error instanceof Error ? error.message : "Please try again."}
      </p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
