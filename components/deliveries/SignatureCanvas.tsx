'use client';

import { useRef } from 'react';
import { Eraser, Save } from 'lucide-react';
import { useSignatureCanvas } from '@/hooks/useSignatureCanvas';

export interface SignatureCanvasProps {
  onSave: (_dataUrl: string) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
  className?: string;
}

/** Canvas signature capture with a keyboard-accessible typed fallback. */
export function SignatureCanvas({
  onSave,
  width = 720,
  height = 260,
  disabled = false,
  className = '',
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    beginStroke,
    clear,
    continueStroke,
    endStroke,
    hasSignature,
    isTooLight,
    save,
    setTypedSignature,
    typedSignature,
  } = useSignatureCanvas({ canvasRef, onSave, disabled });

  const cannotSave = disabled || !hasSignature || isTooLight;

  return (
    <section
      className={`space-y-4 rounded-lg border border-slate-200 bg-white p-4 ${className}`.trim()}
      aria-labelledby="recipient-signature-heading"
    >
      <div>
        <h2 id="recipient-signature-heading" className="text-sm font-semibold text-slate-900">
          Recipient signature
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Sign inside the box using a mouse, stylus, or touch screen.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        aria-label="Recipient signature drawing area"
        className="block aspect-[18/7] w-full touch-none rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed"
        onPointerDown={beginStroke}
        onPointerMove={continueStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
        role="img"
      />

      {hasSignature && isTooLight && (
        <p role="alert" className="text-sm font-medium text-amber-700">
          Signature is too light. Add a longer stroke before saving.
        </p>
      )}

      <div>
        <label htmlFor="typed-signature" className="text-sm font-medium text-slate-800">
          Keyboard signature fallback
        </label>
        <p id="typed-signature-help" className="mt-1 text-xs text-slate-500">
          Type the recipient&apos;s name when drawing is not accessible.
        </p>
        <textarea
          id="typed-signature"
          value={typedSignature}
          onChange={(event) => setTypedSignature(event.target.value)}
          disabled={disabled}
          aria-describedby="typed-signature-help"
          rows={2}
          className="mt-2 w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          placeholder="Type recipient name"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasSignature}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eraser aria-hidden="true" className="h-4 w-4" />
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={cannotSave}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          Save signature
        </button>
      </div>
    </section>
  );
}

export default SignatureCanvas;
