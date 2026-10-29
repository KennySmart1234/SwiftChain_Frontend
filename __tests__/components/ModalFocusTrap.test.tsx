/**
 * Unit Tests for ModalFocusTrap Component
 * Tests ARIA attributes, keyboard handling, and accessibility compliance
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalFocusTrap } from '@/components/shared/ModalFocusTrap';

describe('ModalFocusTrap Component', () => {
  it('should render nothing when isOpen is false', () => {
    const { container } = render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={false}
        onClose={jest.fn()}
      >
        <div>Modal content</div>
      </ModalFocusTrap>
    );

    expect(container.innerHTML).toBe('');
  });

  it('should render children when isOpen is true', () => {
    render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={jest.fn()}
      >
        <div>Modal content</div>
      </ModalFocusTrap>
    );

    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should have correct ARIA attributes', () => {
    const { container } = render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={jest.fn()}
        ariaLabel="Test Modal"
      >
        <div>Modal content</div>
      </ModalFocusTrap>
    );

    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toHaveAttribute('id', 'test-modal');
    expect(modal).toHaveAttribute('role', 'dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-label', 'Test Modal');
  });

  it('should use aria-labelledby when provided', () => {
    const { container } = render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={jest.fn()}
        ariaLabelledBy="modal-title"
      >
        <h2 id="modal-title">Modal Title</h2>
        <div>Modal content</div>
      </ModalFocusTrap>
    );

    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('should not have aria-label when aria-labelledby is provided', () => {
    const { container } = render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={jest.fn()}
        ariaLabel="Fallback Label"
        ariaLabelledBy="modal-title"
      >
        <h2 id="modal-title">Modal Title</h2>
        <div>Modal content</div>
      </ModalFocusTrap>
    );

    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(modal).not.toHaveAttribute('aria-label');
  });

  it('should support aria-describedby', () => {
    const { container } = render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={jest.fn()}
        ariaLabel="Test Modal"
        ariaDescribedBy="modal-description"
      >
        <div id="modal-description">This is the description</div>
        <div>Modal content</div>
      </ModalFocusTrap>
    );

    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toHaveAttribute('aria-describedby', 'modal-description');
  });

  it('should support alertdialog role', () => {
    const { container } = render(
      <ModalFocusTrap
        id="alert-modal"
        isOpen={true}
        onClose={jest.fn()}
        role="alertdialog"
      >
        <div>Alert content</div>
      </ModalFocusTrap>
    );

    const modal = container.querySelector('[role="alertdialog"]');
    expect(modal).toBeInTheDocument();
  });

  it('should call onClose when Escape key is pressed', async () => {
    const onClose = jest.fn();
    render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={onClose}
      >
        <button>Action Button</button>
      </ModalFocusTrap>
    );

    const button = screen.getByRole('button');
    button.focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    // Give time for async focus trap handler
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onEscapeKey hook before onClose', () => {
    const onEscapeKey = jest.fn();
    const onClose = jest.fn();
    const callOrder: string[] = [];

    const onEscapeKeyWithTracking = () => {
      callOrder.push('onEscapeKey');
      onEscapeKey();
    };

    const onCloseWithTracking = () => {
      callOrder.push('onClose');
      onClose();
    };

    render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={onCloseWithTracking}
        onEscapeKey={onEscapeKeyWithTracking}
      >
        <button>Action Button</button>
      </ModalFocusTrap>
    );

    const button = screen.getByRole('button');
    button.focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    // Give time for async handlers
    setTimeout(() => {
      expect(callOrder[0]).toBe('onEscapeKey');
      expect(callOrder[1]).toBe('onClose');
    }, 100);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={jest.fn()}
        className="custom-modal-class"
      >
        <div>Modal content</div>
      </ModalFocusTrap>
    );

    const modal = container.querySelector('.custom-modal-class');
    expect(modal).toBeInTheDocument();
  });

  it('should support autoFocus option', () => {
    render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={jest.fn()}
        autoFocus={true}
      >
        <button id="first-btn">First Button</button>
        <button id="second-btn">Second Button</button>
      </ModalFocusTrap>
    );

    const firstButton = screen.getByRole('button', { name: /first button/i });

    // Focus should be on first focusable element
    expect(document.activeElement).toBe(firstButton);
  });

  it('should not move focus when autoFocus is false', () => {
    const externalButton = document.createElement('button');
    externalButton.textContent = 'External';
    document.body.appendChild(externalButton);
    externalButton.focus();

    render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={jest.fn()}
        autoFocus={false}
      >
        <button>Modal Button</button>
      </ModalFocusTrap>
    );

    // Focus should still be on external button
    expect(document.activeElement).toBe(externalButton);

    document.body.removeChild(externalButton);
  });

  it('should support forwardRef', () => {
    const ref = React.createRef<HTMLDivElement>();

    render(
      <ModalFocusTrap
        ref={ref}
        id="test-modal"
        isOpen={true}
        onClose={jest.fn()}
      >
        <div>Modal content</div>
      </ModalFocusTrap>
    );

    expect(ref.current).toBeInTheDocument();
    expect(ref.current?.id).toBe('test-modal');
  });

  it('should have displayName set for debugging', () => {
    expect(ModalFocusTrap.displayName).toBe('ModalFocusTrap');
  });

  it('should trap Tab key within focusable elements', async () => {
    const { container } = render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={jest.fn()}
      >
        <button id="btn1">Button 1</button>
        <button id="btn2">Button 2</button>
      </ModalFocusTrap>
    );

    const btn1 = container.querySelector('#btn1') as HTMLElement;
    const btn2 = container.querySelector('#btn2') as HTMLElement;

    // Focus on btn1
    expect(document.activeElement).toBe(btn1);

    // Tab to btn2
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Try to Tab past last - should wrap to first
    btn2.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(document.activeElement).toBe(btn1);
  });

  it('should handle multiple mount/unmount cycles', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={onClose}
      >
        <button>Button</button>
      </ModalFocusTrap>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();

    // Close modal
    rerender(
      <ModalFocusTrap
        id="test-modal"
        isOpen={false}
        onClose={onClose}
      >
        <button>Button</button>
      </ModalFocusTrap>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    // Reopen modal
    rerender(
      <ModalFocusTrap
        id="test-modal"
        isOpen={true}
        onClose={onClose}
      >
        <button>Button</button>
      </ModalFocusTrap>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
