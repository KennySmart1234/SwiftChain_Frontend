/**
 * ModalFocusTrap Component
 * WCAG 2.1 compliant accessible modal/popover wrapper
 * Enforces keyboard focus trapping and provides proper ARIA attributes
 * 
 * Architecture: Component consumes useFocusTrap hook (which wraps focusTrapService)
 * - No raw keydown handlers here
 * - All keyboard logic delegated to the hook
 * - Focus management delegated to the service
 */

'use client';

import React, { useRef, useEffect, ReactNode } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export interface ModalFocusTrapProps {
  /**
   * Whether the modal is open/active
   * While true, focus is trapped within this container
   * While false, the trap is inactive
   */
  isOpen: boolean;

  /**
   * Callback invoked when Escape key is pressed
   * Typically triggers closing the modal
   */
  onClose: () => void;

  /**
   * Unique identifier for the modal
   * Used in aria-labelledby and aria-describedby IDs
   */
  id: string;

  /**
   * Label for the modal dialog
   * Used as aria-label if aria-labelledby is not provided
   */
  ariaLabel?: string;

  /**
   * Element ID containing the modal's label
   * Used as aria-labelledby
   * If provided, takes precedence over ariaLabel
   */
  ariaLabelledBy?: string;

  /**
   * Element ID containing the modal's description
   * Used as aria-describedby for additional description
   */
  ariaDescribedBy?: string;

  /**
   * Child elements to render inside the modal
   * Typically includes header, content, and footer sections
   */
  children: ReactNode;

  /**
   * CSS class name to apply to the container
   * Default: 'modal-focus-trap-container'
   */
  className?: string;

  /**
   * Whether to automatically focus the first focusable element on open
   * Default: true
   */
  autoFocus?: boolean;

  /**
   * Element that had focus before opening (used for restoration)
   * If not provided, it will be captured automatically on open
   * Default: undefined
   */
  previouslyFocusedElement?: HTMLElement | null;

  /**
   * Role attribute for the container
   * Default: 'dialog' (can override for alertdialog, etc.)
   */
  role?: 'dialog' | 'alertdialog';

  /**
   * Additional handler for Escape key (runs before onClose)
   * Useful for custom logic before closing
   */
  onEscapeKey?: () => void;
}

/**
 * ModalFocusTrap — WCAG 2.1 compliant wrapper for modals and popovers
 * 
 * Key features:
 * - Enforces keyboard focus trapping (Tab cycles only within modal)
 * - Escape key closes the modal
 * - Proper ARIA attributes (role=dialog, aria-modal=true, aria-label/aria-labelledby)
 * - Focus restoration (returns focus to triggering element when closed)
 * - No raw keyboard handling in the component (delegated to useFocusTrap hook)
 * 
 * Usage:
 * ```tsx
 * <ModalFocusTrap
 *   id="confirm-delete"
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   ariaLabel="Confirm deletion"
 * >
 *   <div>Are you sure you want to delete?</div>
 *   <button onClick={handleConfirm}>Delete</button>
 *   <button onClick={() => setIsOpen(false)}>Cancel</button>
 * </ModalFocusTrap>
 * ```
 */
export const ModalFocusTrap = React.forwardRef<HTMLDivElement, ModalFocusTrapProps>(
  (
    {
      isOpen,
      onClose,
      id,
      ariaLabel,
      ariaLabelledBy,
      ariaDescribedBy,
      children,
      className = 'modal-focus-trap-container',
      autoFocus = true,
      previouslyFocusedElement,
      role = 'dialog',
      onEscapeKey,
    },
    ref
  ) => {
    // Create a local ref for the container if no ref is provided
    const internalRef = useRef<HTMLDivElement>(null);
    const containerRef = ref || internalRef;

    // Enhanced escape handler that runs custom logic first
    const handleEscape = () => {
      onEscapeKey?.();
      onClose();
    };

    // Apply focus trap while modal is open
    useFocusTrap({
      isActive: isOpen,
      containerRef: containerRef as React.RefObject<HTMLElement>,
      onEscape: handleEscape,
      autoFocus,
      previouslyFocusedElement,
    });

    // If modal is not open, don't render
    if (!isOpen) {
      return null;
    }

    return (
      <div
        ref={containerRef as React.Ref<HTMLDivElement>}
        id={id}
        role={role}
        aria-modal="true"
        // Use aria-labelledby if provided, otherwise aria-label
        // This follows WCAG best practice: aria-labelledby takes precedence
        {...(ariaLabelledBy
          ? { 'aria-labelledby': ariaLabelledBy }
          : ariaLabel
            ? { 'aria-label': ariaLabel }
            : {})}
        // Optional description
        {...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {})}
        className={className}
        // Allow keyboard events to be captured
        onKeyDown={(e) => {
          // ESC is handled by the hook, but we can log here if needed
          if (e.key === 'Escape') {
            e.preventDefault();
          }
        }}
      >
        {children}
      </div>
    );
  }
);

ModalFocusTrap.displayName = 'ModalFocusTrap';

/**
 * Export a hook for imperatively managing ModalFocusTrap instances
 * Useful for advanced patterns where you need external control
 */
export function useModalFocusTrap(id: string) {
  const containerRef = useRef<HTMLDivElement>(null);

  return {
    ref: containerRef,
    focus: () => {
      containerRef.current?.focus();
    },
    blur: () => {
      containerRef.current?.blur();
    },
  };
}
