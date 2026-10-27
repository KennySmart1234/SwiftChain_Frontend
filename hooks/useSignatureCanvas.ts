'use client';

import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  MIN_SIGNATURE_INK_LENGTH,
  signatureCaptureService,
} from '@/services/signatureCaptureService';

interface Point {
  x: number;
  y: number;
}

interface UseSignatureCanvasOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onSave: (_dataUrl: string) => void;
  disabled?: boolean;
  minimumInkLength?: number;
}

function canvasPoint(canvas: HTMLCanvasElement, event: ReactPointerEvent<HTMLCanvasElement>): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function drawingContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 2.5;
  context.strokeStyle = '#111827';
  return context;
}

export function useSignatureCanvas({
  canvasRef,
  onSave,
  disabled = false,
  minimumInkLength = MIN_SIGNATURE_INK_LENGTH,
}: UseSignatureCanvasOptions) {
  const [hasSignature, setHasSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isTooLight, setIsTooLight] = useState(false);
  const [typedSignature, setTypedSignatureState] = useState('');
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const inkLengthRef = useRef(0);

  const updateQuality = useCallback(
    (inkLength: number, text: string) => {
      const quality = signatureCaptureService.assessQuality(
        inkLength,
        text,
        minimumInkLength,
      );
      setIsTooLight(quality.isTooLight);
    },
    [minimumInkLength],
  );

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    drawingRef.current = false;
    setIsDrawing(false);
    lastPointRef.current = null;
    inkLengthRef.current = 0;
    setTypedSignatureState('');
    setHasSignature(false);
    setIsTooLight(false);
  }, [canvasRef]);

  const beginStroke = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabled || event.button > 0) return;
      const canvas = canvasRef.current;
      const context = canvas && drawingContext(canvas);
      if (!canvas || !context) return;

      event.preventDefault();
      canvas.setPointerCapture?.(event.pointerId);
      if (typedSignature) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        setTypedSignatureState('');
        inkLengthRef.current = 0;
      }
      const point = canvasPoint(canvas, event);
      context.beginPath();
      context.moveTo(point.x, point.y);
      drawingRef.current = true;
      setIsDrawing(true);
      lastPointRef.current = point;
      setHasSignature(true);
      updateQuality(inkLengthRef.current, '');
    },
    [canvasRef, disabled, typedSignature, updateQuality],
  );

  const continueStroke = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || disabled) return;
      const canvas = canvasRef.current;
      const context = canvas && drawingContext(canvas);
      const previous = lastPointRef.current;
      if (!canvas || !context || !previous) return;

      event.preventDefault();
      const point = canvasPoint(canvas, event);
      context.lineTo(point.x, point.y);
      context.stroke();
      inkLengthRef.current += Math.hypot(point.x - previous.x, point.y - previous.y);
      lastPointRef.current = point;
      updateQuality(inkLengthRef.current, '');
    },
    [canvasRef, disabled, updateQuality],
  );

  const endStroke = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      canvasRef.current?.releasePointerCapture?.(event.pointerId);
      drawingRef.current = false;
      setIsDrawing(false);
      lastPointRef.current = null;
      updateQuality(inkLengthRef.current, '');
    },
    [canvasRef, updateQuality],
  );

  const setTypedSignature = useCallback(
    (value: string) => {
      const canvas = canvasRef.current;
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      drawingRef.current = false;
      setIsDrawing(false);
      lastPointRef.current = null;
      inkLengthRef.current = 0;
      setTypedSignatureState(value);
      setHasSignature(value.trim().length > 0);
      updateQuality(0, value);
    },
    [canvasRef, updateQuality],
  );

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature || isTooLight || disabled) return;

    if (typedSignature.trim()) {
      const context = drawingContext(canvas);
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#111827';
      context.font = 'italic 30px cursive';
      context.textBaseline = 'middle';
      context.fillText(typedSignature.trim(), 24, canvas.height / 2);
    }

    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl && dataUrl !== 'data:,') onSave(dataUrl);
  }, [canvasRef, disabled, hasSignature, isTooLight, onSave, typedSignature]);

  return {
    beginStroke,
    clear,
    continueStroke,
    endStroke,
    hasSignature,
    isDrawing,
    isTooLight,
    save,
    setTypedSignature,
    typedSignature,
  };
}
