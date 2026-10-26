'use client';

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

interface Point {
  x: number;
  y: number;
}

export interface UseSignatureCaptureOptions {
  lineColor?: string;
  lineWidth?: number;
}

export interface UseSignatureCaptureResult {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isDrawing: boolean;
  clear: () => void;
  save: () => string | null;
  isEmpty: () => boolean;
}

function pointFromEvent(
  canvas: HTMLCanvasElement,
  event: MouseEvent | TouchEvent,
): Point | null {
  const source =
    'touches' in event
      ? event.touches[0] ?? event.changedTouches[0]
      : event;
  if (!source) return null;

  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

  return {
    x: (source.clientX - rect.left) * scaleX,
    y: (source.clientY - rect.top) * scaleY,
  };
}

export function useSignatureCapture(
  options: UseSignatureCaptureOptions = {},
): UseSignatureCaptureResult {
  const { lineColor = '#111827', lineWidth = 2.5 } = options;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingRef = useRef(false);
  const emptyRef = useRef(true);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
    drawingRef.current = false;
    emptyRef.current = true;
    setIsDrawing(false);
  }, []);

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || emptyRef.current) return null;
    return canvas.toDataURL('image/png');
  }, []);

  const isEmpty = useCallback(() => emptyRef.current, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = lineWidth;
    context.strokeStyle = lineColor;
    canvas.style.touchAction = 'none';

    const start = (event: MouseEvent | TouchEvent) => {
      if (event instanceof MouseEvent && event.button !== 0) return;
      const point = pointFromEvent(canvas, event);
      if (!point) return;
      if (event.cancelable) event.preventDefault();
      context.beginPath();
      context.moveTo(point.x, point.y);
      drawingRef.current = true;
      setIsDrawing(true);
    };

    const move = (event: MouseEvent | TouchEvent) => {
      if (!drawingRef.current) return;
      const point = pointFromEvent(canvas, event);
      if (!point) return;
      if (event.cancelable) event.preventDefault();
      context.lineTo(point.x, point.y);
      context.stroke();
      emptyRef.current = false;
    };

    const end = (event: MouseEvent | TouchEvent) => {
      if (!drawingRef.current) return;
      if (event.cancelable) event.preventDefault();
      context.closePath();
      drawingRef.current = false;
      setIsDrawing(false);
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end, { passive: false });
    window.addEventListener('touchcancel', end, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
      drawingRef.current = false;
    };
  }, [lineColor, lineWidth]);

  return { canvasRef, isDrawing, clear, save, isEmpty };
}
