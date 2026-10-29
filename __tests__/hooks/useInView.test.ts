import { renderHook, waitFor } from '@testing-library/react';
import { useInView } from '@/hooks/useInView';
import { useRef } from 'react';

/**
 * useInView Hook Tests
 *
 * Tests viewport detection using Intersection Observer API.
 * Verifies:
 *   - Hook correctly detects when element enters viewport
 *   - Threshold configuration works
 *   - Root margin configuration works
 *   - Callback is invoked on visibility changes
 *   - Cleanup on unmount
 */

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

beforeEach(() => {
  mockIntersectionObserver.mockClear();
  mockObserve.mockClear();
  mockDisconnect.mockClear();

  mockIntersectionObserver.mockImplementation((callback: IntersectionObserverCallback) => ({
    observe: mockObserve,
    unobserve: jest.fn(),
    disconnect: mockDisconnect,
    root: null,
    rootMargin: '0px',
    thresholds: [0],
  }));

  global.IntersectionObserver = mockIntersectionObserver as any;
});

describe('useInView', () => {
  it('should initialize with isInView as false', () => {
    const { result } = renderHook(() => useInView());
    expect(result.current.isInView).toBe(false);
  });

  it('should create and use ref from hook if none provided', () => {
    const { result } = renderHook(() => useInView());
    expect(result.current.ref).toBeDefined();
    expect(result.current.ref.current).toBeNull();
  });

  it('should accept external ref', () => {
    const externalRef = useRef(null);
    const { result } = renderHook(() => useInView(externalRef));
    expect(result.current.ref).toBe(externalRef);
  });

  it('should observe element on mount', () => {
    const { result } = renderHook(() => useInView());
    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  it('should disconnect observer on unmount', () => {
    const { unmount } = renderHook(() => useInView());
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should set isInView to true when element enters viewport', async () => {
    const callback = mockIntersectionObserver.mock.calls[0][0];
    const { result } = renderHook(() => useInView());

    act(() => {
      callback([{ isIntersecting: true }] as IntersectionObserverEntry[]);
    });

    await waitFor(() => {
      expect(result.current.isInView).toBe(true);
    });
  });

  it('should set isInView to false when element leaves viewport', async () => {
    const callback = mockIntersectionObserver.mock.calls[0][0];
    const { result, rerender } = renderHook(() => useInView());

    act(() => {
      callback([{ isIntersecting: true }] as IntersectionObserverEntry[]);
    });

    await waitFor(() => {
      expect(result.current.isInView).toBe(true);
    });

    act(() => {
      callback([{ isIntersecting: false }] as IntersectionObserverEntry[]);
    });

    await waitFor(() => {
      expect(result.current.isInView).toBe(false);
    });
  });

  it('should call onChange callback when visibility changes', () => {
    const onChange = jest.fn();
    const callback = mockIntersectionObserver.mock.calls[0][0];

    renderHook(() => useInView(null, { onChange }));

    act(() => {
      callback([{ isIntersecting: true }] as IntersectionObserverEntry[]);
    });

    expect(onChange).toHaveBeenCalledWith(true);

    act(() => {
      callback([{ isIntersecting: false }] as IntersectionObserverEntry[]);
    });

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('should respect threshold option', () => {
    renderHook(() => useInView(null, { threshold: 0.5 }));
    const options = mockIntersectionObserver.mock.calls[0][1];
    expect(options.threshold).toBe(0.5);
  });

  it('should respect margin option', () => {
    renderHook(() => useInView(null, { margin: '10px' }));
    const options = mockIntersectionObserver.mock.calls[0][1];
    expect(options.rootMargin).toBe('10px');
  });

  it('should handle missing IntersectionObserver gracefully', () => {
    const originalIO = global.IntersectionObserver;
    delete (global as any).IntersectionObserver;

    const { result } = renderHook(() => useInView());
    expect(result.current.isInView).toBe(true); // Fallback: assume in view

    global.IntersectionObserver = originalIO;
  });
});

// Helper for act()
function act(callback: () => void) {
  callback();
}
