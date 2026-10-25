import { act, renderHook } from '@testing-library/react';
import jsQR from 'jsqr';
import { useMobileQrScanner } from '@/hooks/useMobileQrScanner';

jest.mock('jsqr', () => ({ __esModule: true, default: jest.fn() }));

const mockedJsQr = jsQR as jest.MockedFunction<typeof jsQR>;
const stopTrack = jest.fn();
const stream = {
  getTracks: () => [{ stop: stopTrack }],
} as unknown as MediaStream;
const context = {
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(16),
    width: 2,
    height: 2,
  })),
};

function videoElement(): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'readyState', {
    configurable: true,
    value: HTMLMediaElement.HAVE_CURRENT_DATA,
  });
  Object.defineProperty(video, 'videoWidth', { configurable: true, value: 2 });
  Object.defineProperty(video, 'videoHeight', { configurable: true, value: 2 });
  Object.defineProperty(video, 'srcObject', {
    configurable: true,
    writable: true,
    value: null,
  });
  video.play = jest.fn().mockResolvedValue(undefined);
  return video;
}

describe('useMobileQrScanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
    });
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('requests the rear camera with iOS-safe constraints', async () => {
    const { result } = renderHook(() =>
      useMobileQrScanner({ autoStart: false }),
    );
    const video = videoElement();
    result.current.videoRef.current = video;

    await act(async () => result.current.startScanning());

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    expect(video.getAttribute('playsinline')).toBe('true');
    expect(result.current.permission).toBe('granted');
    expect(result.current.isScanning).toBe(true);
  });

  it('decodes one frame per second and stops after a result', async () => {
    mockedJsQr.mockReturnValueOnce({
      data: 'handoff-123',
      binaryData: [],
      chunks: [],
      location: {} as ReturnType<typeof jsQR> extends infer R
        ? R extends { location: infer L }
          ? L
          : never
        : never,
      version: 1,
    });
    const onDecode = jest.fn();
    const { result } = renderHook(() =>
      useMobileQrScanner({ autoStart: false, onDecode }),
    );
    result.current.videoRef.current = videoElement();
    await act(async () => result.current.startScanning());

    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(mockedJsQr).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current.data).toBe('handoff-123');
    expect(onDecode).toHaveBeenCalledWith('handoff-123');
    expect(result.current.isScanning).toBe(false);
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it('reports a denied camera permission', async () => {
    const denied = new DOMException('Denied', 'NotAllowedError');
    jest
      .mocked(navigator.mediaDevices.getUserMedia)
      .mockRejectedValueOnce(denied);
    const { result } = renderHook(() =>
      useMobileQrScanner({ autoStart: false }),
    );
    result.current.videoRef.current = videoElement();

    await act(async () => result.current.startScanning());

    expect(result.current.permission).toBe('denied');
    expect(result.current.error).toBe('Camera permission was denied.');
  });

  it('reports unsupported camera APIs without throwing', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
    const { result } = renderHook(() =>
      useMobileQrScanner({ autoStart: false }),
    );

    await act(async () => result.current.startScanning());

    expect(result.current.permission).toBe('unavailable');
    expect(result.current.error).toContain('not available');
  });

  it('stops every media track on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useMobileQrScanner({ autoStart: false }),
    );
    result.current.videoRef.current = videoElement();
    await act(async () => result.current.startScanning());

    unmount();

    expect(stopTrack).toHaveBeenCalledTimes(1);
  });
});
