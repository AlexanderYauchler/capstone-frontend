import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no scrolling implementation; browser checks verify actual positions.
window.scrollTo = vi.fn();
