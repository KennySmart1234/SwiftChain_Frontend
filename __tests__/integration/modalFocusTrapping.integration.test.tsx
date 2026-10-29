/**
 * Integration Tests for Focus Trapping
 * Tests real keyboard navigation scenarios with actual modals
 */

import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalFocusTrap } from '@/components/shared/ModalFocusTrap';

/**
 * Test component: Typical modal workflow with AcceptJobModal-like structure
 */
function TestModalComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>

      {/* Backdrop */}
      {isOpen && (
        <div
          data-testid="backdrop"
          onClick={() => setIsOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }}
        />
      )}

      {/* Modal with focus trap */}
      <ModalFocusTrap
        id="confirm-modal"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        ariaLabelledBy="modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '400px' }}>
          <h2 id="modal-title">Confirm Action</h2>
          <p>Are you sure you want to proceed?</p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button onClick={() => setIsOpen(false)}>Cancel</button>
            <button onClick={() => setIsOpen(false)}>Confirm</button>
          </div>
        </div>
      </ModalFocusTrap>
    </div>
  );
}

describe('Focus Trapping Integration Tests', () => {
  it('should trap focus within modal and prevent background access', async () => {
    render(<TestModalComponent />);

    // Open modal
    const openButton = screen.getByRole('button', { name: /open modal/i });
    await userEvent.click(openButton);

    // Get modal buttons
    const buttons = screen.getAllByRole('button');
    const cancelButton = buttons[1]; // First button after "Open Modal"
    const confirmButton = buttons[2]; // Second button in modal

    // Focus should be on first focusable element (Cancel button)
    expect(document.activeElement).toBe(cancelButton);

    // Tab to next button
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true, code: 'Tab' });
    await waitFor(() => {
      expect(document.activeElement).toBe(confirmButton);
    });

    // Tab again - should wrap to first button
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true, code: 'Tab' });
    await waitFor(() => {
      expect(document.activeElement).toBe(cancelButton);
    });

    // Shift+Tab - should go to last button
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true, bubbles: true, code: 'ShiftTab' });
    await waitFor(() => {
      expect(document.activeElement).toBe(confirmButton);
    });
  });

  it('should close modal when Escape key is pressed', async () => {
    render(<TestModalComponent />);

    // Modal should not be visible initially
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();

    // Open modal
    const openButton = screen.getByRole('button', { name: /open modal/i });
    await userEvent.click(openButton);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape', bubbles: true });

    await waitFor(() => {
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });
  });

  it('should never allow focus to escape to background elements', async () => {
    const { container } = render(
      <div>
        <button id="background-btn-1">Background Button 1</button>
        <TestModalComponent />
        <button id="background-btn-2">Background Button 2</button>
      </div>
    );

    // Open modal
    const openButton = screen.getByRole('button', { name: /open modal/i });
    await userEvent.click(openButton);

    const modalButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent === 'Cancel' || btn.textContent === 'Confirm'
    );

    const cancelButton = modalButtons[0];
    const confirmButton = modalButtons[1];

    // Initial focus should be in modal
    expect(document.activeElement).toBe(cancelButton);

    // Cycle through Tab multiple times - should stay in modal
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(document, { key: 'Tab', bubbles: true });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const focusedElement = document.activeElement as HTMLElement;
      const isInModal = cancelButton === focusedElement || confirmButton === focusedElement;

      expect(isInModal).toBe(true);
    }

    // Cycle backward with Shift+Tab
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true, bubbles: true });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const focusedElement = document.activeElement as HTMLElement;
      const isInModal = cancelButton === focusedElement || confirmButton === focusedElement;

      expect(isInModal).toBe(true);
    }
  });

  it('should restore focus to opening button when modal closes', async () => {
    render(<TestModalComponent />);

    const openButton = screen.getByRole('button', { name: /open modal/i });

    // Focus on open button
    openButton.focus();
    expect(document.activeElement).toBe(openButton);

    // Open modal
    await userEvent.click(openButton);

    // Focus is now in modal
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(document.activeElement).toBe(cancelButton);

    // Close via Escape
    fireEvent.keyDown(document, { key: 'Escape', bubbles: true });

    await waitFor(() => {
      // Focus should be restored to open button
      expect(document.activeElement).toBe(openButton);
    });
  });

  it('should have proper ARIA attributes for accessibility', async () => {
    const { container } = render(<TestModalComponent />);

    // Open modal
    const openButton = screen.getByRole('button', { name: /open modal/i });
    await userEvent.click(openButton);

    const modal = container.querySelector('[role="dialog"]');

    expect(modal).toHaveAttribute('role', 'dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(modal).toHaveAttribute('id', 'confirm-modal');
  });

  it('should handle rapid key presses correctly', async () => {
    render(<TestModalComponent />);

    // Open modal
    const openButton = screen.getByRole('button', { name: /open modal/i });
    await userEvent.click(openButton);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const confirmButton = screen.getByRole('button', { name: /confirm/i });

    // Rapid Tab presses
    for (let i = 0; i < 100; i++) {
      fireEvent.keyDown(document, { key: 'Tab', bubbles: true });
    }

    await waitFor(() => {
      const focused = document.activeElement;
      const isInModal = focused === cancelButton || focused === confirmButton;
      expect(isInModal).toBe(true);
    });
  });

  it('should work correctly with form inputs', async () => {
    function FormModal() {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <div>
          <button onClick={() => setIsOpen(true)}>Open Form</button>

          <ModalFocusTrap
            id="form-modal"
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            ariaLabel="Form Modal"
          >
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
              <input id="field1" type="text" placeholder="Field 1" />
              <input id="field2" type="text" placeholder="Field 2" />
              <button id="submit-btn">Submit</button>
            </div>
          </ModalFocusTrap>
        </div>
      );
    }

    const { container } = render(<FormModal />);

    // Open modal
    const openButton = screen.getByRole('button', { name: /open form/i });
    await userEvent.click(openButton);

    const field1 = container.querySelector('#field1') as HTMLInputElement;
    const field2 = container.querySelector('#field2') as HTMLInputElement;
    const submitBtn = container.querySelector('#submit-btn') as HTMLButtonElement;

    // Focus should be on first input
    expect(document.activeElement).toBe(field1);

    // Tab through inputs and button
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true });
    await waitFor(() => expect(document.activeElement).toBe(field2));

    fireEvent.keyDown(document, { key: 'Tab', bubbles: true });
    await waitFor(() => expect(document.activeElement).toBe(submitBtn));

    // Tab should wrap to first input
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true });
    await waitFor(() => expect(document.activeElement).toBe(field1));
  });

  it('should handle disabled buttons correctly', async () => {
    function FormWithDisabled() {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <div>
          <button onClick={() => setIsOpen(true)}>Open</button>

          <ModalFocusTrap
            id="form-modal"
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            ariaLabel="Form"
          >
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
              <button id="btn1">Enabled 1</button>
              <button id="btn2" disabled>
                Disabled
              </button>
              <button id="btn3">Enabled 2</button>
            </div>
          </ModalFocusTrap>
        </div>
      );
    }

    const { container } = render(<FormWithDisabled />);

    // Open modal
    const openButton = screen.getByRole('button', { name: /^Open$/i });
    await userEvent.click(openButton);

    const btn1 = container.querySelector('#btn1') as HTMLButtonElement;
    const btn2 = container.querySelector('#btn2') as HTMLButtonElement;
    const btn3 = container.querySelector('#btn3') as HTMLButtonElement;

    // First enabled button should be focused
    expect(document.activeElement).toBe(btn1);

    // Tab should skip disabled and go to next enabled
    btn3.focus();
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true });

    await waitFor(() => {
      // Should wrap to first enabled
      expect(document.activeElement).toBe(btn1);
    });
  });
});
