import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReceiptVerification } from '../ReceiptVerification';

describe('ReceiptVerification', () => {
  it('renders the verification form', () => {
    render(<ReceiptVerification />);

    expect(
      screen.getByRole('heading', { name: /verify delivery receipt/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /verify receipt/i })
    ).toBeInTheDocument();
  });

  it('shows a validation error when the field is empty', async () => {
    const user = userEvent.setup();

    render(<ReceiptVerification />);
    await user.click(screen.getByRole('button', { name: /verify receipt/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Receipt ID is required.'
    );
  });

  it('shows a validation error for an invalid receipt format', async () => {
    const user = userEvent.setup();

    render(<ReceiptVerification />);
    const input = screen.getByLabelText(/receipt id/i);
    await user.type(input, 'bad receipt!');
    await user.click(screen.getByRole('button', { name: /verify receipt/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a valid Stellar receipt ID or transaction hash.'
    );
  });

  it('submits a valid receipt and shows the success state', async () => {
    const user = userEvent.setup();
    const onVerify = jest.fn().mockResolvedValue({
      status: 'verified',
      message: 'Receipt verified on-chain.',
    });

    render(<ReceiptVerification onVerify={onVerify} />);

    const input = screen.getByLabelText(/receipt id/i);
    await user.type(input, 'ABCDEF123456');
    await user.click(screen.getByRole('button', { name: /verify receipt/i }));

    expect(onVerify).toHaveBeenCalledWith('ABCDEF123456');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Receipt verified on-chain.'
    );
  });

  it('surfaces an API error when verification fails', async () => {
    const user = userEvent.setup();
    const onVerify = jest.fn().mockRejectedValue(new Error('Network timeout'));

    render(<ReceiptVerification onVerify={onVerify} />);

    const input = screen.getByLabelText(/receipt id/i);
    await user.type(input, 'ABCDEF123456');
    await user.click(screen.getByRole('button', { name: /verify receipt/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Network timeout'
    );
  });
});
