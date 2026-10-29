/**
 * Unit Tests for useFocusTrap Hook
 * Tests React lifecycle management and keyboard event handling
 */

import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

describe('useFocusTrap Hook', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should do nothing when isActive is false', () => {
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <button id="btn2">Button 2</button>
    `;

    const containerRef = { current: container };
    const { rerender } = renderHook(() =>
      useFocusTrap({
        isActive: false,
        containerRef: containerRef as any,
      })
    );

    // Focus should not be managed
    expect(document.activeElement).not.toBe(container.querySelector('#btn1'));

    rerender();
  });

  it('should focus first focusable element on activation', () => {
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <button id="btn2">Button 2</button>
    `;

    const containerRef = { current: container };

    act(() => {
      renderHook(() =>
        useFocusTrap({
          isActive: true,
          containerRef: containerRef as any,
          autoFocus: true,
        })
      );
    });

    expect(document.activeElement).toBe(container.querySelector('#btn1'));
  });

  it('should focus container if no focusable children exist and autoFocus is true', () => {
    container.innerHTML = '<div id="content">No focusable elements</div>';

    const containerRef = { current: container };

    act(() => {
      renderHook(() =>
        useFocusTrap({
          isActive: true,
          containerRef: containerRef as any,
          autoFocus: true,
        })
      );
    });

    expect(document.activeElement).toBe(container);
  });

  it('should not move focus when autoFocus is false', () => {
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <button id="btn2">Button 2</button>
    `;

    const initialFocused = document.createElement('button');
    initialFocused.textContent = 'Initial focus';
    document.body.appendChild(initialFocused);
    initialFocused.focus();

    const containerRef = { current: container };

    act(() => {
      renderHook(() =>
        useFocusTrap({
          isActive: true,
          containerRef: containerRef as any,
          autoFocus: false,
        })
      );
    });

    expect(document.activeElement).toBe(initialFocused);

    document.body.removeChild(initialFocused);
  });

  it('should trap Tab key within container', () => {
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <button id="btn2">Button 2</button>
    `;

    const containerRef = { current: container };
    const btn1 = container.querySelector('#btn1') as HTMLElement;
    const btn2 = container.querySelector('#btn2') as HTMLElement;

    renderHook(() =>
      useFocusTrap({
        isActive: true,
        containerRef: containerRef as any,
      })
    );

    // Focus is on first button
    expect(document.activeElement).toBe(btn1);

    // Simulate Tab on last button
    btn2.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(tabEvent);
    });

    // Focus should wrap to first button
    expect(document.activeElement).toBe(btn1);
  });

  it('should trap Shift+Tab within container', () => {
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <button id="btn2">Button 2</button>
    `;

    const containerRef = { current: container };
    const btn1 = container.querySelector('#btn1') as HTMLElement;
    const btn2 = container.querySelector('#btn2') as HTMLElement;

    renderHook(() =>
      useFocusTrap({
        isActive: true,
        containerRef: containerRef as any,
      })
    );

    // Move focus to last button
    btn2.focus();

    // Simulate Shift+Tab on first button
    btn1.focus();
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(shiftTabEvent);
    });

    // Focus should wrap to last button
    expect(document.activeElement).toBe(btn2);
  });

  it('should restore focus on deactivation', () => {
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <button id="btn2">Button 2</button>
    `;

    const triggerButton = document.createElement('button');
    triggerButton.id = 'trigger';
    triggerButton.textContent = 'Trigger';
    document.body.appendChild(triggerButton);

    triggerButton.focus();

    const containerRef = { current: container };

    const { unmount } = renderHook(() =>
      useFocusTrap({
        isActive: true,
        containerRef: containerRef as any,
      })
    );

    // Focus is now on first button in container
    expect(document.activeElement).toBe(container.querySelector('#btn1'));

    // Unmount hook
    act(() => {
      unmount();
    });

    // Focus should be restored to trigger button
    expect(document.activeElement).toBe(triggerButton);

    document.body.removeChild(triggerButton);
  });

  it('should call onEscape when Escape key is pressed', () => {
    container.innerHTML = '<button id="btn1">Button 1</button>';

    const onEscape = jest.fn();
    const containerRef = { current: container };

    renderHook(() =>
      useFocusTrap({
        isActive: true,
        containerRef: containerRef as any,
        onEscape,
      })
    );

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(escapeEvent);
    });

    expect(onEscape).toHaveBeenCalled();
  });

  it('should remove listeners on deactivation', () => {
    container.innerHTML = '<button id="btn1">Button 1</button>';

    const containerRef = { current: container };
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useFocusTrap({
        isActive: true,
        containerRef: containerRef as any,
      })
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      true
    );

    act(() => {
      unmount();
    });

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      true
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should use externally provided previouslyFocusedElement for restoration', () => {
    container.innerHTML = '<button id="btn1">Button 1</button>';

    const externalButton = document.createElement('button');
    externalButton.id = 'external';
    externalButton.textContent = 'External';
    document.body.appendChild(externalButton);

    const containerRef = { current: container };

    const { unmount } = renderHook(() =>
      useFocusTrap({
        isActive: true,
        containerRef: containerRef as any,
        previouslyFocusedElement: externalButton,
      })
    );

    act(() => {
      unmount();
    });

    expect(document.activeElement).toBe(externalButton);

    document.body.removeChild(externalButton);
  });
});
