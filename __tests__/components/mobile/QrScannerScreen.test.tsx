import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QrScannerScreen } from '@/components/mobile/QrScannerScreen';
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

describe('QrScannerScreen (mobile)', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }],
        }),
      },
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });

    (mobileQrScannerService.verifyQrCode as jest.Mock).mockResolvedValue(mockDelivery);
  });

  it('renders the mobile scanner UI and supports manual fallback', async () => {
    const user = userEvent.setup();
    render(<QrScannerScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('qr-camera-feed')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /enter tracking code manually/i }));
    expect(screen.getByLabelText(/delivery code/i)).toBeInTheDocument();
  });

  it('shows the offline watermark when the network is unavailable', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(<QrScannerScreen />);

    expect(await screen.findByTestId('offline-watermark')).toBeInTheDocument();
  });
});
