/**
 * Focus Trap Service
 * Pure DOM-level utility functions for keyboard focus management in modals/popovers
 * Handles focus cycling, trap enforcement, and focus restoration
 * 
 * No React dependencies — this is a framework-agnostic DOM utility service
 */

/**
 * CSS selector for all focusable HTML elements
 * Includes: buttons, links, form inputs, elements with tabindex
 * Excludes: disabled elements, hidden elements, tabindex=-1
 */
const FOCUSABLE_SELECTOR = `
  button:not([disabled]):not([hidden]),
  [href]:not([disabled]):not([hidden]),
  input:not([disabled]):not([hidden]),
  select:not([disabled]):not([hidden]),
  textarea:not([disabled]):not([hidden]),
  [tabindex]:not([tabindex="-1"]):not([disabled]):not([hidden])
`
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .join(', ');

/**
 * Get all focusable elements within a container, in DOM order
 * Respects disabled and hidden states
 * @param container - The container element to search within
 * @returns Array of focusable HTMLElements in tab order
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  if (!container) return [];

  const focusableElements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );

  // Filter out elements that are truly invisible (e.g., display: none, visibility: hidden)
  return focusableElements.filter((el) => {
    // Check if element or any parent has display: none
    if (window.getComputedStyle(el).display === 'none') return false;
    // Check if element or any parent has visibility: hidden
    if (window.getComputedStyle(el).visibility === 'hidden') return false;
    // Element must be within the viewport or at least have layout
    if (el.offsetParent === null && el.offsetHeight === 0 && el.offsetWidth === 0)
      return false;

    return true;
  });
}

/**
 * Get the first focusable element within a container
 * @param container - The container element to search within
 * @returns The first focusable HTMLElement, or null if none found
 */
export function getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
  const focusable = getFocusableElements(container);
  return focusable.length > 0 ? focusable[0] : null;
}

/**
 * Get the last focusable element within a container
 * @param container - The container element to search within
 * @returns The last focusable HTMLElement, or null if none found
 */
export function getLastFocusableElement(container: HTMLElement): HTMLElement | null {
  const focusable = getFocusableElements(container);
  return focusable.length > 0 ? focusable[focusable.length - 1] : null;
}

/**
 * Determine the next focus target when Tab is pressed
 * If currently focused element is the last focusable, wraps to first
 * If currently focused element is the first (with Shift+Tab), wraps to last
 * @param container - The container element
 * @param currentlyFocused - The currently focused element
 * @param isShiftTab - Whether Shift+Tab was pressed (backwards navigation)
 * @returns The next focus target, or null if no focusable elements exist
 */
export function getNextFocusTarget(
  container: HTMLElement,
  currentlyFocused: Element | null,
  isShiftTab: boolean = false
): HTMLElement | null {
  const focusable = getFocusableElements(container);

  if (focusable.length === 0) return null;
  if (focusable.length === 1) return focusable[0];

  const currentIndex = focusable.indexOf(currentlyFocused as HTMLElement);

  if (isShiftTab) {
    // Shift+Tab (backwards): if on first, wrap to last
    if (currentIndex <= 0) {
      return focusable[focusable.length - 1];
    }
  } else {
    // Tab (forwards): if on last, wrap to first
    if (currentIndex >= focusable.length - 1) {
      return focusable[0];
    }
  }

  return null;
}

/**
 * Check whether the provided element has focus within the container
 * Useful for determining if a Tab/Shift+Tab keystroke is at a boundary
 * @param container - The container element
 * @param element - The element to check
 * @returns true if element is the first or last focusable in the container
 */
export function isFocusAtBoundary(
  container: HTMLElement,
  element: Element | null
): { isFirst: boolean; isLast: boolean } {
  const first = getFirstFocusableElement(container);
  const last = getLastFocusableElement(container);

  return {
    isFirst: element === first,
    isLast: element === last,
  };
}

/**
 * Focus an element with optional scrolling into view
 * @param element - The element to focus
 * @param scrollIntoView - Whether to scroll the element into view (default: true)
 */
export function focusElement(element: HTMLElement, scrollIntoView: boolean = true): void {
  if (!element) return;

  if (scrollIntoView) {
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  element.focus({ preventScroll: !scrollIntoView });
}

/**
 * Restore focus to a previously focused element
 * @param element - The element to restore focus to
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element && element.focus) {
    element.focus();
  }
}

/**
 * Create a focus trap event handler for keydown events
 * This is a pure function that returns the handler, suitable for addEventListener
 * @param container - The container element
 * @param onEscape - Optional callback for ESC key
 * @returns The keydown event handler function
 */
export function createFocusTrapHandler(
  container: HTMLElement,
  onEscape?: () => void
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    // Handle Escape key
    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape?.();
      return;
    }

    // Handle Tab key for focus cycling
    if (event.key !== 'Tab') return;

    const isShiftTab = event.shiftKey;
    const currentlyFocused = document.activeElement;
    const nextTarget = getNextFocusTarget(container, currentlyFocused, isShiftTab);

    // If next target is not null, focus wrap around occurred
    if (nextTarget) {
      event.preventDefault();
      focusElement(nextTarget, false);
    }
  };
}
