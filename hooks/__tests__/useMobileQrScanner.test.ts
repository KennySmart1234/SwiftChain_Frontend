import { act, renderHook, waitFor } from '@testing-library/react';
import { useMobileQrScanner } from '@/hooks/useMobileQrScanner';
import { qrDecoderService } from '@/services/qrDecoderService';
import { qrScannerService } from '@/services/qrScannerService';

jest.mock('@/services/qrDecoderService', () => ({
  qrDecoderService: { decode: jest.fn() },
}));
jest.mock('@/services/qrScannerService', () => ({
  qrScannerService: { verifyQrCode: jest.fn() },
}));

const decode = qrDecoderService.decode as jest.Mock;
const verify = qrScannerService.verifyQrCode as jest.Mock;
const getUserMedia = jest.fn();

describe('useMobileQrScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
  });

  afterEach(() => jest.useRealTimers());

  it('maps denied camera permission to a recoverable state', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    const { result } = renderHook(() => useMobileQrScanner());

    await act(async () => result.current.startCamera());

    expect(result.current.permission).toBe('denied');
    expect(result.current.error).toBe('Camera permission was denied.');
  });

  it('decodes a live frame and verifies the detected QR value', async () => {
    const stop = jest.fn();
    getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
    decode.mockReturnValue('HANDOFF-QR-1');
    verify.mockResolvedValue({
      success: true,
      deliveryId: 'DEL-1',
      message: 'Verified',
    });
    const { result, unmount } = renderHook(() => useMobileQrScanner());
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    Object.defineProperties(video, {
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
      videoHeight: { configurable: true, value: 480 },
      videoWidth: { configurable: true, value: 640 },
    });
    video.play = jest.fn().mockResolvedValue(undefined);
    const context = { drawImage: jest.fn() } as unknown as CanvasRenderingContext2D;
    jest.spyOn(canvas, 'getContext').mockReturnValue(context);
    result.current.videoRef.current = video;
    result.current.canvasRef.current = canvas;

    await act(async () => result.current.startCamera());
    await act(async () => {
      jest.advanceTimersByTime(250);
      await Promise.resolve();
    });

    await waitFor(() => expect(verify).toHaveBeenCalledWith('HANDOFF-QR-1'));
    expect(result.current.result?.deliveryId).toBe('DEL-1');
    expect(decode).toHaveBeenCalledWith(context, 640, 480);
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('verifies a manually entered code without camera access', async () => {
    verify.mockResolvedValue({
      success: true,
      deliveryId: 'DEL-MANUAL',
      message: 'Verified',
    });
    const { result } = renderHook(() => useMobileQrScanner());
    act(() => result.current.setManualCode(' MANUAL-1 '));

    await act(async () => {
      expect(await result.current.submitManualCode()).toBe(true);
    });

    expect(verify).toHaveBeenCalledWith('MANUAL-1');
    expect(result.current.result?.deliveryId).toBe('DEL-MANUAL');
  });
});
