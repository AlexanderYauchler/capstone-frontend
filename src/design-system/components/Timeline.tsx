export interface TimelineItem {
  readonly id: string;
  readonly timeLabel: string;
  readonly title: string;
  readonly description: string;
  readonly isPending?: boolean;
}

export interface TimelineProps {
  readonly items: readonly TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <ol className="divide-y divide-[var(--color-border)]">
      {items.map((item) => (
        <li key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-4">
          <span
            className={`w-20 shrink-0 text-xs font-semibold tabular-nums px-2.5 py-1 rounded-md text-center ${
              item.isPending
                ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
                : 'bg-[var(--color-secondary-soft)] text-[var(--color-secondary)]'
            }`}
          >
            {item.timeLabel}
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">{item.title}</p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
