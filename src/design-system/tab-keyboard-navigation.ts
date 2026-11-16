import type { KeyboardEvent } from 'react';

const ENABLED_TAB_SELECTOR = '[role="tab"]:not(:disabled)';

/**
 * Implements the WAI-ARIA Tabs Pattern's manual activation keyboard model.
 * Arrow keys, Home, and End move focus; Enter and Space activate the focused tab.
 */
export function handleTabListKeyDown(event: KeyboardEvent<HTMLElement>) {
  const target = event.target;
  if (
    !(target instanceof HTMLButtonElement) ||
    target.getAttribute('role') !== 'tab' ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    target.click();
    return;
  }

  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>(
      ENABLED_TAB_SELECTOR,
    ),
  );
  const currentIndex = tabs.indexOf(target);
  if (currentIndex === -1 || tabs.length === 0) {
    return;
  }

  const orientation =
    event.currentTarget.getAttribute('aria-orientation') ?? 'horizontal';
  let nextIndex: number | null = null;

  if (
    (orientation === 'horizontal' && event.key === 'ArrowRight') ||
    (orientation === 'vertical' && event.key === 'ArrowDown')
  ) {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else if (
    (orientation === 'horizontal' && event.key === 'ArrowLeft') ||
    (orientation === 'vertical' && event.key === 'ArrowUp')
  ) {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = tabs.length - 1;
  }

  if (nextIndex === null) {
    return;
  }

  event.preventDefault();
  const nextTab = tabs[nextIndex]!;
  tabs.forEach((tab) => {
    tab.tabIndex = tab === nextTab ? 0 : -1;
  });
  nextTab.focus();
}
