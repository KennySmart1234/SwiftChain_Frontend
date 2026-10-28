import { act, renderHook } from '@testing-library/react';
import { useSignatureCapture } from '@/hooks/useSignatureCapture';

const context = {
  beginPath: jest.fn(),
  clearRect: jest.fn(),
  closePath: jest.fn(),
  lineTo: jest.fn(),
  moveTo: jest.fn(),
  stroke: jest.fn(),
  lineCap: '',
  lineJoin: '',
  lineWidth: 0,
  strokeStyle: '',
};

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 160;
  jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 400,
    bottom: 160,
    width: 400,
    height: 160,
    toJSON: () => ({}),
  });
  return canvas;
}

function renderSignatureHook() {
  const canvas = createCanvas();
  const hook = renderHook(() => {
    const signature = useSignatureCapture();
    signature.canvasRef.current = canvas;
    return signature;
  });
  return { canvas, hook };
}

function touchEvent(type: string, x: number, y: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }],
  });
  Object.defineProperty(event, 'changedTouches', {
    value: [{ clientX: x, clientY: y }],
  });
  return event;
}

describe('useSignatureCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
    jest
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,c2lnbmF0dXJl');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tracks mouse drawing state and ink', () => {
    const { canvas, hook } = renderSignatureHook();
    const { result } = hook;

    act(() => {
      canvas.dispatchEvent(
        new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 20 }),
      );
    });
    expect(result.current.isDrawing).toBe(true);

    act(() => {
      canvas.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 40, clientY: 50 }),
      );
      window.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(result.current.isDrawing).toBe(false);
    expect(result.current.isEmpty()).toBe(false);
    expect(context.lineTo).toHaveBeenCalledWith(40, 50);
  });

  it('supports touch drawing without scrolling the page', () => {
    const { canvas, hook } = renderSignatureHook();
    const { result } = hook;
    const start = touchEvent('touchstart', 12, 18);
    const move = touchEvent('touchmove', 30, 45);

    act(() => {
      canvas.dispatchEvent(start);
      canvas.dispatchEvent(move);
      window.dispatchEvent(touchEvent('touchend', 30, 45));
    });

    expect(start.defaultPrevented).toBe(true);
    expect(move.defaultPrevented).toBe(true);
    expect(context.stroke).toHaveBeenCalled();
    expect(result.current.isEmpty()).toBe(false);
  });

  it('returns a PNG only after ink has been drawn', () => {
    const { canvas, hook } = renderSignatureHook();
    const { result } = hook;

    expect(result.current.save()).toBeNull();
    act(() => {
      canvas.dispatchEvent(
        new MouseEvent('mousedown', { button: 0, clientX: 1, clientY: 1 }),
      );
      canvas.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 2, clientY: 2 }),
      );
      window.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(result.current.save()).toBe('data:image/png;base64,c2lnbmF0dXJl');
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png');
  });

  it('clears the bitmap and resets state', () => {
    const { canvas, hook } = renderSignatureHook();
    const { result } = hook;
    act(() => {
      canvas.dispatchEvent(
        new MouseEvent('mousedown', { button: 0, clientX: 1, clientY: 1 }),
      );
      canvas.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 2, clientY: 2 }),
      );
      result.current.clear();
    });

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 400, 160);
    expect(result.current.isEmpty()).toBe(true);
    expect(result.current.isDrawing).toBe(false);
  });

  it('removes event listeners when the hook unmounts', () => {
    const removeCanvasListener = jest.spyOn(
      HTMLCanvasElement.prototype,
      'removeEventListener',
    );
    const removeWindowListener = jest.spyOn(window, 'removeEventListener');
    const { hook } = renderSignatureHook();

    hook.unmount();

    expect(removeCanvasListener).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function),
    );
    expect(removeWindowListener).toHaveBeenCalledWith(
      'touchend',
      expect.any(Function),
    );
  });
});
