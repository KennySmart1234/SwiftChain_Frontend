/**
 * Unit Tests for focusTrapService
 * Tests pure DOM utility functions for focus management
 */

import {
  getFocusableElements,
  getFirstFocusableElement,
  getLastFocusableElement,
  getNextFocusTarget,
  isFocusAtBoundary,
  focusElement,
  restoreFocus,
  createFocusTrapHandler,
} from '@/services/focusTrapService';

describe('focusTrapService', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Create a container for testing
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('getFocusableElements', () => {
    it('should return empty array if container is null', () => {
      const result = getFocusableElements(null as any);
      expect(result).toEqual([]);
    });

    it('should find all focusable elements (buttons, links, inputs)', () => {
      container.innerHTML = `
        <button>Button 1</button>
        <a href="#test">Link</a>
        <input type="text" />
        <select><option>Option</option></select>
        <textarea></textarea>
        <div tabindex="0">Div with tabindex</div>
      `;

      const result = getFocusableElements(container);
      expect(result.length).toBe(6);
    });

    it('should exclude disabled elements', () => {
      container.innerHTML = `
        <button>Enabled</button>
        <button disabled>Disabled</button>
        <input type="text" />
        <input type="text" disabled />
      `;

      const result = getFocusableElements(container);
      expect(result.length).toBe(2);
    });

    it('should exclude elements with hidden attribute', () => {
      container.innerHTML = `
        <button>Visible</button>
        <button hidden>Hidden</button>
      `;

      const result = getFocusableElements(container);
      expect(result.length).toBe(1);
    });

    it('should exclude tabindex="-1" elements', () => {
      container.innerHTML = `
        <button tabindex="0">Focusable</button>
        <button tabindex="-1">Not focusable</button>
      `;

      const result = getFocusableElements(container);
      expect(result.length).toBe(1);
    });

    it('should exclude elements with display: none', () => {
      container.innerHTML = `
        <button>Visible</button>
        <button style="display: none;">Hidden</button>
      `;

      const result = getFocusableElements(container);
      expect(result.length).toBe(1);
    });

    it('should return elements in DOM order', () => {
      container.innerHTML = `
        <button id="first">First</button>
        <input id="second" type="text" />
        <a id="third" href="#test">Third</a>
      `;

      const result = getFocusableElements(container);
      expect(result[0].id).toBe('first');
      expect(result[1].id).toBe('second');
      expect(result[2].id).toBe('third');
    });
  });

  describe('getFirstFocusableElement', () => {
    it('should return the first focusable element', () => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="second">Second</button>
      `;

      const result = getFirstFocusableElement(container);
      expect(result?.id).toBe('first');
    });

    it('should return null if no focusable elements exist', () => {
      container.innerHTML = '<div>No focusable elements</div>';

      const result = getFirstFocusableElement(container);
      expect(result).toBeNull();
    });
  });

  describe('getLastFocusableElement', () => {
    it('should return the last focusable element', () => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="last">Last</button>
      `;

      const result = getLastFocusableElement(container);
      expect(result?.id).toBe('last');
    });

    it('should return null if no focusable elements exist', () => {
      container.innerHTML = '<div>No focusable elements</div>';

      const result = getLastFocusableElement(container);
      expect(result).toBeNull();
    });
  });

  describe('getNextFocusTarget', () => {
    beforeEach(() => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="last">Last</button>
      `;
    });

    it('should wrap to first when Tab is on last element', () => {
      const lastElement = container.querySelector('#last') as HTMLElement;
      const result = getNextFocusTarget(container, lastElement, false);

      const firstElement = container.querySelector('#first') as HTMLElement;
      expect(result).toBe(firstElement);
    });

    it('should wrap to last when Shift+Tab is on first element', () => {
      const firstElement = container.querySelector('#first') as HTMLElement;
      const result = getNextFocusTarget(container, firstElement, true);

      const lastElement = container.querySelector('#last') as HTMLElement;
      expect(result).toBe(lastElement);
    });

    it('should return null when Tab is on middle element', () => {
      const secondElement = container.querySelector('#second') as HTMLElement;
      const result = getNextFocusTarget(container, secondElement, false);

      expect(result).toBeNull();
    });

    it('should return null when Shift+Tab is on middle element', () => {
      const secondElement = container.querySelector('#second') as HTMLElement;
      const result = getNextFocusTarget(container, secondElement, true);

      expect(result).toBeNull();
    });

    it('should return first element when only one focusable exists', () => {
      container.innerHTML = '<button id="only">Only</button>';
      const onlyElement = container.querySelector('#only') as HTMLElement;

      const result = getNextFocusTarget(container, onlyElement, false);
      expect(result).toBe(onlyElement);
    });

    it('should return null if no focusable elements exist', () => {
      container.innerHTML = '<div>No focusable</div>';
      const result = getNextFocusTarget(container, null, false);

      expect(result).toBeNull();
    });
  });

  describe('isFocusAtBoundary', () => {
    beforeEach(() => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="middle">Middle</button>
        <button id="last">Last</button>
      `;
    });

    it('should identify first focusable as boundary', () => {
      const firstElement = container.querySelector('#first') as HTMLElement;
      const result = isFocusAtBoundary(container, firstElement);

      expect(result.isFirst).toBe(true);
      expect(result.isLast).toBe(false);
    });

    it('should identify last focusable as boundary', () => {
      const lastElement = container.querySelector('#last') as HTMLElement;
      const result = isFocusAtBoundary(container, lastElement);

      expect(result.isFirst).toBe(false);
      expect(result.isLast).toBe(true);
    });

    it('should not identify middle element as boundary', () => {
      const middleElement = container.querySelector('#middle') as HTMLElement;
      const result = isFocusAtBoundary(container, middleElement);

      expect(result.isFirst).toBe(false);
      expect(result.isLast).toBe(false);
    });

    it('should not identify non-focusable element as boundary', () => {
      const nonFocusable = document.createElement('div');
      const result = isFocusAtBoundary(container, nonFocusable);

      expect(result.isFirst).toBe(false);
      expect(result.isLast).toBe(false);
    });
  });

  describe('focusElement', () => {
    it('should focus the element', () => {
      const button = document.createElement('button');
      button.textContent = 'Test';
      container.appendChild(button);

      focusElement(button, false);

      expect(document.activeElement).toBe(button);
    });

    it('should not throw if element is null', () => {
      expect(() => focusElement(null as any)).not.toThrow();
    });
  });

  describe('restoreFocus', () => {
    it('should restore focus to the provided element', () => {
      const button = document.createElement('button');
      button.textContent = 'Test';
      container.appendChild(button);

      restoreFocus(button);

      expect(document.activeElement).toBe(button);
    });

    it('should not throw if element is null', () => {
      expect(() => restoreFocus(null)).not.toThrow();
    });
  });

  describe('createFocusTrapHandler', () => {
    beforeEach(() => {
      container.innerHTML = `
        <button id="first">First</button>
        <button id="last">Last</button>
      `;
    });

    it('should prevent Tab on last element and focus first', () => {
      const lastButton = container.querySelector('#last') as HTMLElement;
      const firstButton = container.querySelector('#first') as HTMLElement;

      const handler = createFocusTrapHandler(container);
      lastButton.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(document.activeElement).toBe(firstButton);
    });

    it('should prevent Shift+Tab on first element and focus last', () => {
      const firstButton = container.querySelector('#first') as HTMLElement;
      const lastButton = container.querySelector('#last') as HTMLElement;

      const handler = createFocusTrapHandler(container);
      firstButton.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(document.activeElement).toBe(lastButton);
    });

    it('should call onEscape callback when Escape is pressed', () => {
      const onEscape = jest.fn();
      const handler = createFocusTrapHandler(container, onEscape);

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(onEscape).toHaveBeenCalled();
    });

    it('should ignore other keys', () => {
      const handler = createFocusTrapHandler(container);

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      handler(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
});
