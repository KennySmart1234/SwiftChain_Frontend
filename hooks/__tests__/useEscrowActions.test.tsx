import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EscrowActions } from '@/components/escrow/EscrowActions';
import { escrowActionsService } from '@/services/escrowActionsService';

jest.mock('@/services/escrowActionsService', () => ({
  escrowActionsService: {
    getEscrow: jest.fn(),
    lockEscrow: jest.fn(),
    releaseEscrow: jest.fn(),
  },
}));

const mockedService = jest.mocked(escrowActionsService);

function renderEscrow() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EscrowActions shipmentId="shipment-42" />
    </QueryClientProvider>,
  );
}

describe('useEscrowActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Locked immediately before the lock request resolves', async () => {
    let resolveLock: (_value: {
      id: string;
      shipmentId: string;
      status: 'Locked';
      updatedAt: string;
    }) => void = () => undefined;
    mockedService.getEscrow.mockResolvedValue({
      id: 'escrow-42',
      shipmentId: 'shipment-42',
      status: 'Pending',
      updatedAt: '2026-09-29T08:00:00.000Z',
    });
    mockedService.lockEscrow.mockReturnValue(
      new Promise((resolve) => {
        resolveLock = resolve;
      }),
    );
    const user = userEvent.setup();
    renderEscrow();

    await user.click(await screen.findByRole('button', { name: /lock funds/i }));
    expect(screen.getByText('Locked')).toBeInTheDocument();

    resolveLock({
      id: 'escrow-42',
      shipmentId: 'shipment-42',
      status: 'Locked',
      updatedAt: '2026-09-29T08:01:00.000Z',
    });
  });

  it('rolls Released back to Locked when the backend rejects the action', async () => {
    mockedService.getEscrow.mockResolvedValue({
      id: 'escrow-42',
      shipmentId: 'shipment-42',
      status: 'Locked',
      updatedAt: '2026-09-29T08:00:00.000Z',
    });
    let rejectRelease: (_reason: Error) => void = () => undefined;
    mockedService.releaseEscrow.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRelease = reject;
      }),
    );
    const user = userEvent.setup();
    renderEscrow();

    await user.click(
      await screen.findByRole('button', { name: /release funds/i }),
    );
    expect(screen.getByText('Released')).toBeInTheDocument();

    rejectRelease(new Error('Backend rejected release'));

    expect(await screen.findByText('Locked')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Backend rejected release',
    );
  });
});
