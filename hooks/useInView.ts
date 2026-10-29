'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

interface UseInViewOptions {
  /** Margin around the element (default: '0px') */
  margin?: string;
  /** Percentage of element that must be visible (0-1, default: 0) */
  threshold?: number | number[];
  /** Callback when visibility changes */
  onChange?: (isInView: boolean) => void;
}

interface UseInViewResult {
  /** Whether the element is currently in view */
  isInView: boolean;
  /** Reference to attach to the element */
  ref: RefObject<HTMLDivElement>;
}

/**
 * useInView — detects when an element enters the viewport using Intersection Observer.
 *
 * Features:
 *   - Efficient viewport detection with Intersection Observer API
 *   - Configurable threshold and margin
 *   - Automatically creates ref if none provided
 *   - Cleanup on unmount
 *   - SSR-safe with fallback
 *
 * Usage:
 *   const { isInView, ref } = useInView();
 *   return <div ref={ref}>{isInView && <ExpensiveComponent />}</div>
 */
export function useInView(
  ref?: RefObject<HTMLElement> | null,
  options: UseInViewOptions = {}
): UseInViewResult {
  const internalRef = useRef<HTMLDivElement>(null);
  const targetRef = ref || internalRef;
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!targetRef.current) return;

    // Fallback for browsers without Intersection Observer support
    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsInView(inView);
        options.onChange?.(inView);
      },
      {
        rootMargin: options.margin ?? '0px',
        threshold: options.threshold ?? 0,
      }
    );

    observer.observe(targetRef.current);

    return () => {
      observer.disconnect();
    };
  }, [targetRef, options]);

  return {
    isInView,
    ref: internalRef as RefObject<HTMLDivElement>,
  };
}
