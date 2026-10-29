import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateWizard } from '@/components/shipment/CreateWizard';
import { shipmentCreationService } from '@/services/shipmentCreationService';

jest.mock('@/services/shipmentCreationService', () => ({
  shipmentCreationService: { createShipment: jest.fn() },
}));

const mockedCreateShipment =
  shipmentCreationService.createShipment as jest.MockedFunction<
    typeof shipmentCreationService.createShipment
  >;

function renderWizard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateWizard />
    </QueryClientProvider>,
  );
}

async function completeSenderStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Sender name'), 'Amina Yusuf');
  await user.type(screen.getByLabelText('Recipient name'), 'David Okafor');
  await user.type(
    screen.getByLabelText('Pickup address'),
    '12 Marina Road, Lagos',
  );
  await user.type(
    screen.getByLabelText('Destination'),
    '9 Airport Road, Abuja',
  );
  await user.type(screen.getByLabelText('Recipient phone'), '+2348012345678');
  await user.click(screen.getByRole('button', { name: /continue/i }));
}

describe('CreateWizard', () => {
  beforeEach(() => {
    mockedCreateShipment.mockReset();
  });

  it('validates the current step before allowing progression', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText('Sender name is required')).toBeInTheDocument();
    expect(screen.getByText('Sender')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByLabelText('Cargo description')).not.toBeInTheDocument();
  });

  it('preserves entered values when navigating back', async () => {
    const user = userEvent.setup();
    renderWizard();

    await completeSenderStep(user);
    expect(await screen.findByLabelText('Cargo description')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByLabelText('Sender name')).toHaveValue('Amina Yusuf');
    expect(screen.getByLabelText('Destination')).toHaveValue(
      '9 Airport Road, Abuja',
    );
  });

  it('submits the complete shipment through the service layer', async () => {
    mockedCreateShipment.mockResolvedValue({
      id: 'shipment-42',
      status: 'pending',
      createdAt: '2026-09-29T08:00:00.000Z',
    });
    const user = userEvent.setup();
    renderWizard();

    await completeSenderStep(user);
    await user.type(
      await screen.findByLabelText('Cargo description'),
      'Temperature controlled medical supplies',
    );
    await user.clear(screen.getByLabelText('Weight (kg)'));
    await user.type(screen.getByLabelText('Weight (kg)'), '12.5');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.clear(await screen.findByLabelText('Escrow amount (XLM)'));
    await user.type(screen.getByLabelText('Escrow amount (XLM)'), '250');
    await user.click(screen.getByRole('button', { name: /create shipment/i }));

    expect(
      await screen.findByText('Shipment shipment-42 was created successfully.'),
    ).toBeInTheDocument();
    expect(mockedCreateShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        senderName: 'Amina Yusuf',
        description: 'Temperature controlled medical supplies',
        weightKg: 12.5,
        amountXlm: 250,
        paymentMethod: 'escrow',
      }),
    );
  });
});
