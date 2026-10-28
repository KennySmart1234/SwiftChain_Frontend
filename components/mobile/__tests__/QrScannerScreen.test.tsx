import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QrScannerScreen } from '@/components/mobile/QrScannerScreen';
import { useMobileQrScanner } from '@/hooks/useMobileQrScanner';

jest.mock('@/hooks/useMobileQrScanner');

const mockedScanner = useMobileQrScanner as jest.MockedFunction<
  typeof useMobileQrScanner
>;
const startCamera = jest.fn().mockResolvedValue(undefined);
const submitManualCode = jest.fn().mockResolvedValue(true);
const setManualCode = jest.fn();
const scanAgain = jest.fn();

function mockScanner(
  overrides: Partial<ReturnType<typeof useMobileQrScanner>> = {},
) {
  mockedScanner.mockReturnValue({
    canvasRef: { current: null },
    error: null,
    isVerifying: false,
    manualCode: '',
    permission: 'granted',
    result: null,
    scanAgain,
    setManualCode,
    startCamera,
    stopCamera: jest.fn(),
    submitManualCode,
    videoRef: { current: null },
    ...overrides,
  });
}

describe('QrScannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScanner();
  });

  it('requests camera access on mount and renders the scan region', () => {
    render(<QrScannerScreen />);
    expect(startCamera).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mobile-qr-video')).toHaveAttribute('playsinline');
    expect(screen.getByLabelText('QR scan region')).toBeInTheDocument();
  });

  it('shows permission errors and retries camera access', async () => {
    mockScanner({ permission: 'denied', error: 'Camera permission was denied.' });
    const user = userEvent.setup();
    render(<QrScannerScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent('Camera permission was denied.');
    await user.click(screen.getByRole('button', { name: 'Retry camera' }));
    expect(startCamera).toHaveBeenCalledTimes(2);
  });

  it('shows verified delivery details after a successful scan', () => {
    mockScanner({
      result: {
        success: true,
        deliveryId: 'DEL-2048',
        message: 'Verified',
        status: 'IN_TRANSIT',
        destination: 'Lagos',
      },
    });
    render(<QrScannerScreen />);

    expect(screen.getByLabelText('Scan success')).toHaveTextContent('Handoff verified');
    expect(screen.getByText('DEL-2048')).toBeInTheDocument();
    expect(screen.getByText('IN_TRANSIT')).toBeInTheDocument();
    expect(screen.getByText('Lagos')).toBeInTheDocument();
  });

  it('submits the manual fallback code', async () => {
    mockScanner({ manualCode: 'HANDOFF-123' });
    const user = userEvent.setup();
    render(<QrScannerScreen />);

    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(submitManualCode).toHaveBeenCalledTimes(1);
  });

  it('updates manual code input through the hook', async () => {
    const user = userEvent.setup();
    render(<QrScannerScreen />);

    await user.type(screen.getByLabelText('Manual code'), 'A');
    expect(setManualCode).toHaveBeenCalledWith('A');
  });
});
