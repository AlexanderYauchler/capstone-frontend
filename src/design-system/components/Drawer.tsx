import { Dialog as RadixDialog } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface DrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DrawerProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-[#14292e]/40 z-40" />
        <RadixDialog.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[var(--color-surface)] border-l border-[var(--color-border)] p-6 shadow-2xl overflow-y-auto focus:outline-none">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
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
              aria-label="Close inspector drawer"
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
