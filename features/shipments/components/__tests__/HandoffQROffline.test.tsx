import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HandoffQR } from '@/features/shipments/components/HandoffQR';
import { useOfflineHandoffSync } from '@/hooks/useOfflineHandoffSync';

jest.mock('@/hooks/useOfflineHandoffSync');
jest.mock('@/hooks/useHandoffQR', () => ({
  useHandoffQR: () => ({ isLoading: false, data: null, error: null }),
  useGenerateHandoffQR: () => ({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

const mockedUseOfflineSync = useOfflineHandoffSync as jest.MockedFunction<
  typeof useOfflineHandoffSync
>;

describe('HandoffQR offline scanner', () => {
  const processScan = jest.fn();
  const retry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseOfflineSync.mockReturnValue({
      isOnline: false,
      syncState: 'pending',
      pendingCount: 1,
      processScan,
      retry,
    });
  });

  it('shows an offline watermark and pending sync banner', () => {
    render(<HandoffQR deliveryId="delivery-1" scannerMode />);
    expect(screen.getByTestId('offline-watermark')).toHaveTextContent('Offline mode');
    expect(screen.getByRole('status')).toHaveTextContent('1 handoff pending sync');
  });

  it('queues the scanned token through the sync hook', async () => {
    processScan.mockResolvedValue('pending');
    const onScanProcessed = jest.fn();
    const user = userEvent.setup();
    render(
      <HandoffQR
        deliveryId="delivery-1"
        scannerMode
        onScanProcessed={onScanProcessed}
      />,
    );

    await user.type(screen.getByLabelText('Scanned handoff token'), 'token-1');
    await user.click(screen.getByRole('button', { name: 'Confirm handoff scan' }));

    expect(processScan).toHaveBeenCalledWith('delivery-1', 'token-1');
    expect(onScanProcessed).toHaveBeenCalledWith('pending');
  });

  it('offers a manual retry after a failed online sync', async () => {
    mockedUseOfflineSync.mockReturnValue({
      isOnline: true,
      syncState: 'failed',
      pendingCount: 1,
      processScan,
      retry,
    });
    const user = userEvent.setup();
    render(<HandoffQR deliveryId="delivery-1" scannerMode />);

    await user.click(screen.getByRole('button', { name: 'Retry handoff sync' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
