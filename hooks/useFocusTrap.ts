/**
 * useFocusTrap Hook
 * Custom React hook that manages focus trapping within a container
 * Handles Tab cycling, Escape key closing, and focus restoration
 * 
 * Wraps the focusTrapService for React-specific lifecycle and cleanup
 */

import { useEffect, useRef } from 'react';
import {
  getFocusableElements,
  getFirstFocusableElement,
  focusElement,
  restoreFocus,
  createFocusTrapHandler,
} from '@/services/focusTrapService';

interface UseFocusTrapOptions {
  /**
   * Whether the focus trap is active
   * While true, keyboard events are intercepted to trap focus
   * While false, the hook is essentially inactive
   */
  isActive: boolean;

  /**
   * Reference to the container element that should trap focus
   */
  containerRef: React.RefObject<HTMLElement>;

  /**
   * Callback invoked when Escape key is pressed
   */
  onEscape?: () => void;

  /**
   * Whether to move focus to the container on activation
   * If true, focus moves to the first focusable element (or container if none exist)
   * If false, focus behavior is not automatically managed
   * Default: true
   */
  autoFocus?: boolean;

  /**
   * Element that had focus before activation (used for restoration)
   * If not provided, document.activeElement is captured at activation
   * Default: undefined (will be captured automatically)
   */
  previouslyFocusedElement?: HTMLElement | null;
}

/**
 * useFocusTrap — manages focus trapping within a container element
 * 
 * While isActive is true:
 * - Tab/Shift+Tab cycles focus only within focusable elements in the container
 * - Escape key triggers onEscape callback
 * - Focus is moved to the first focusable element on activation (unless autoFocus=false)
 * 
 * On deactivation or unmount:
 * - Keyboard listeners are removed
 * - Focus is restored to the element that had focus before activation
 * - All listeners are properly cleaned up
 * 
 * @param options - Configuration options
 */
export function useFocusTrap({
  isActive,
  containerRef,
  onEscape,
  autoFocus = true,
  previouslyFocusedElement,
}: UseFocusTrapOptions): void {
  // Store reference to the previously focused element for restoration
  const previouslyFocusedRef = useRef<HTMLElement | null>(previouslyFocusedElement || null);

  // Store reference to the focus trap handler for cleanup
  const focusTrapHandlerRef = useRef<(event: KeyboardEvent) => void | null>(null);

  useEffect(() => {
    // If not active, skip
    if (!isActive || !containerRef.current) {
      return;
    }

    const container = containerRef.current;

    // Capture the currently focused element before we move focus
    // (only if not already set externally)
    if (previouslyFocusedElement === undefined) {
      previouslyFocusedRef.current = (document.activeElement as HTMLElement) || null;
    } else {
      previouslyFocusedRef.current = previouslyFocusedElement;
    }

    // Move focus to the container or its first focusable child on activation
    if (autoFocus) {
      const firstFocusable = getFirstFocusableElement(container);
      if (firstFocusable) {
        focusElement(firstFocusable, false);
      } else {
        // If no focusable children, focus the container itself
        container.focus();
      }
    }

    // Create and attach the focus trap keydown handler
    focusTrapHandlerRef.current = createFocusTrapHandler(container, onEscape);
    document.addEventListener('keydown', focusTrapHandlerRef.current, true);

    // Cleanup function: remove listeners and restore focus
    return () => {
      // Remove keydown listener
      if (focusTrapHandlerRef.current) {
        document.removeEventListener('keydown', focusTrapHandlerRef.current, true);
        focusTrapHandlerRef.current = null;
      }

      // Restore focus to the element that had focus before activation
      if (previouslyFocusedRef.current) {
        restoreFocus(previouslyFocusedRef.current);
      }
    };
  }, [isActive, containerRef, onEscape, autoFocus, previouslyFocusedElement]);
}

/**
 * Hook variant: useFocusTrapWithRef
 * Alternative for cases where you want to manage the previously focused element yourself
 * Accepts the containerRef and isActive, returns an object with the current focus state
 * 
 * Example:
 * ```
 * const { activate, deactivate } = useFocusTrapWithRef(containerRef);
 * // Call activate() when opening the modal
 * // Call deactivate() when closing the modal
 * ```
 */
export function useFocusTrapWithRef(
  containerRef: React.RefObject<HTMLElement>,
  onEscape?: () => void,
  autoFocus?: boolean
): { activate: () => void; deactivate: () => void } {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const focusTrapHandlerRef = useRef<(event: KeyboardEvent) => void | null>(null);

  const activate = () => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    previouslyFocusedRef.current = (document.activeElement as HTMLElement) || null;

    if (autoFocus !== false) {
      const firstFocusable = getFirstFocusableElement(container);
      if (firstFocusable) {
        focusElement(firstFocusable, false);
      } else {
        container.focus();
      }
    }

    focusTrapHandlerRef.current = createFocusTrapHandler(container, onEscape);
    document.addEventListener('keydown', focusTrapHandlerRef.current, true);
  };

  const deactivate = () => {
    if (focusTrapHandlerRef.current) {
      document.removeEventListener('keydown', focusTrapHandlerRef.current, true);
      focusTrapHandlerRef.current = null;
    }

    if (previouslyFocusedRef.current) {
      restoreFocus(previouslyFocusedRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      deactivate();
    };
  }, []);

  return { activate, deactivate };
}
