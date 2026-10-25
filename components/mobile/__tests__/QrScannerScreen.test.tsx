import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act, renderHook } from '@testing-library/react';
import { QrScannerScreen } from '@/components/mobile/QrScannerScreen';
import { useMobileQrScanner } from '@/hooks/useMobileQrScanner';
import { mobileQrScannerService } from '@/services/mobileQrScannerService';

jest.mock('@/services/mobileQrScannerService');

const mockDelivery = {
  deliveryId: 'DEL-99234',
  recipient: 'Amina Hassan',
  destination: 'Nairobi, Kenya',
  amount: 'KSh 14,500',
  status: 'In Transit',
  eta: 'Today, 4:30 PM',
};

describe('QrScannerScreen', () => {
  const originalMediaDevices = navigator.mediaDevices;
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn(),
      },
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });

    (mobileQrScannerService.verifyQrCode as jest.Mock).mockResolvedValue(mockDelivery);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
    });
    jest.clearAllMocks();
  });

  it('renders the permission loading state while the camera is starting', async () => {
    let resolveMedia: (stream: MediaStream) => void;
    const streamPromise = new Promise<MediaStream>((resolve) => {
      resolveMedia = resolve;
    });
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockReturnValue(streamPromise);

    render(<QrScannerScreen />);

    expect(screen.getByText(/requesting camera permission/i)).toBeInTheDocument();

    resolveMedia!({ getTracks: () => [{ stop: jest.fn() }] } as MediaStream);

    await waitFor(() => {
      expect(screen.getByTestId('qr-camera-feed')).toBeInTheDocument();
    });
  });

  it('shows the camera error state with a retry action', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(permissionError);

    render(<QrScannerScreen />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/camera permission denied/i);
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('activates the camera feed when permission is granted', async () => {
    const mockStream = { getTracks: () => [{ stop: jest.fn() }] } as MediaStream;
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);

    render(<QrScannerScreen />);

    await waitFor(() => {
      const video = screen.getByTestId('qr-camera-feed');
      expect(video).toHaveClass('opacity-100');
    });
  });

  it('shows delivery details after a successful QR scan', async () => {
    const user = userEvent.setup();
    const mockStream = { getTracks: () => [{ stop: jest.fn() }] } as MediaStream;
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);

    render(<QrScannerScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('qr-camera-feed')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /scan qr code/i }));

    await waitFor(() => {
      expect(screen.getByText(/delivery details/i)).toBeInTheDocument();
      expect(screen.getByText(/DEL-99234/i)).toBeInTheDocument();
    });
  });

  it('reveals the manual entry fallback', async () => {
    const user = userEvent.setup();
    const mockStream = { getTracks: () => [{ stop: jest.fn() }] } as MediaStream;
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);

    render(<QrScannerScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('qr-camera-feed')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /enter tracking code manually/i }));
    expect(screen.getByLabelText(/delivery code/i)).toBeInTheDocument();
  });

  it('submits the manual code through the backend service', async () => {
    const user = userEvent.setup();
    const mockStream = { getTracks: () => [{ stop: jest.fn() }] } as MediaStream;
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);

    render(<QrScannerScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('qr-camera-feed')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /enter tracking code manually/i }));
    await user.type(screen.getByLabelText(/delivery code/i), 'DEL-99234');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(mobileQrScannerService.verifyQrCode).toHaveBeenCalledWith('DEL-99234');
    });
  });

  it('shows the offline watermark when the device is offline', async () => {
    const mockStream = { getTracks: () => [{ stop: jest.fn() }] } as MediaStream;
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(<QrScannerScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('offline-watermark')).toBeInTheDocument();
    });
  });
});

describe('useMobileQrScanner', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn(),
      },
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });

    (mobileQrScannerService.verifyQrCode as jest.Mock).mockResolvedValue(mockDelivery);
  });

  it('scans a QR payload and stores backend delivery details', async () => {
    const { result } = renderHook(() => useMobileQrScanner());

    await act(async () => {
      const response = await result.current.handleScan('DEL-99234');
      expect(response).toMatchObject({ deliveryId: 'DEL-99234' });
    });

    expect(result.current.scanResult).toMatchObject({ deliveryId: 'DEL-99234' });
    expect(result.current.error).toBeNull();
  });

  it('captures camera permission errors and allows retry', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(permissionError);

    const { result } = renderHook(() => useMobileQrScanner());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.error).toMatch(/camera permission denied/i);
    expect(result.current.isCameraActive).toBe(false);
  });
});
