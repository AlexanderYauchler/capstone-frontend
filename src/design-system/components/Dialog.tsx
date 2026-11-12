import { Dialog as RadixDialog } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface DialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-[#14292e]/60 backdrop-blur-[1px] z-40" />
        <RadixDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 sm:p-6 shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="text-lg font-semibold text-[var(--color-ink)]">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="text-xs text-[var(--color-ink-muted)] mt-1">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </RadixDialog.Close>
          </div>
          <div className="mt-5">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
