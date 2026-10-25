import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectedWallets, type ConnectedWalletsProps } from '@/components/wallet/ConnectedWallets';
import type { ConnectedWallet } from '@/types/wallet.types';

const WALLETS: ConnectedWallet[] = [
  {
    id: 'w1',
    address: 'GABC123DEF456STELLAR',
    provider: 'freighter',
    network: 'testnet',
    isPrimary: true,
    connectedAt: '2026-01-15T10:30:00Z',
  },
  {
    id: 'w2',
    address: 'GDEF789GHI012STELLAR',
    provider: 'ledger',
    network: 'public',
    isPrimary: false,
    connectedAt: '2026-02-20T08:00:00Z',
  },
];

function makeProps(overrides: Partial<ConnectedWalletsProps> = {}): ConnectedWalletsProps {
  return {
    wallets: WALLETS,
    activeAddress: WALLETS[0].address,
    isLoading: false,
    isDisconnecting: false,
    error: null,
    onRefresh: jest.fn(),
    onSetActive: jest.fn(),
    onDisconnect: jest.fn(),
    ...overrides,
  };
}

describe('ConnectedWallets', () => {
  it('renders every connected wallet with its provider and truncated address', () => {
    render(<ConnectedWallets {...makeProps()} />);

    expect(screen.getByText('Freighter')).toBeInTheDocument();
    expect(screen.getByText('Ledger')).toBeInTheDocument();
    expect(screen.getByText('GABC12…TELLAR')).toBeInTheDocument();
    expect(screen.getByText('GDEF78…TELLAR')).toBeInTheDocument();
  });

  it('marks the active wallet and hides its Set active action', () => {
    render(<ConnectedWallets {...makeProps()} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /set active/i })).toHaveLength(1);
  });

  it('marks the primary wallet returned by the backend', () => {
    render(<ConnectedWallets {...makeProps()} />);

    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('calls onDisconnect with the wallet that was clicked', () => {
    const props = makeProps();
    render(<ConnectedWallets {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /disconnect freighter wallet/i }));

    expect(props.onDisconnect).toHaveBeenCalledWith(WALLETS[0]);
  });

  it('calls onSetActive for a non-active wallet', () => {
    const props = makeProps();
    render(<ConnectedWallets {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /set active/i }));

    expect(props.onSetActive).toHaveBeenCalledWith(WALLETS[1]);
  });

  it('calls onRefresh when the refresh button is clicked', () => {
    const props = makeProps();
    render(<ConnectedWallets {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows a loading skeleton while wallets are being fetched', () => {
    render(<ConnectedWallets {...makeProps({ wallets: [], isLoading: true })} />);

    expect(screen.getByLabelText(/loading connected wallets/i)).toBeInTheDocument();
    expect(screen.queryByText(/no wallets connected/i)).not.toBeInTheDocument();
  });

  it('shows the error state with a retry action', () => {
    const props = makeProps({ wallets: [], error: 'Failed to load connected wallets' });
    render(<ConnectedWallets {...props} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load connected wallets');

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when the account has no wallets', () => {
    render(<ConnectedWallets {...makeProps({ wallets: [], activeAddress: null })} />);

    expect(screen.getByText(/no wallets connected/i)).toBeInTheDocument();
  });

  it('disables the disconnect action while a disconnect is in flight', () => {
    render(<ConnectedWallets {...makeProps({ isDisconnecting: true })} />);

    expect(
      screen.getByRole('button', { name: /disconnect freighter wallet/i })
    ).toBeDisabled();
  });

  it('calls onSetPrimary when Set primary button is clicked', () => {
    const onSetPrimary = jest.fn();
    render(<ConnectedWallets {...makeProps({ onSetPrimary })} />);

    const setPrimaryBtn = screen.getByRole('button', {
      name: /set ledger as primary wallet/i,
    });
    fireEvent.click(setPrimaryBtn);

    expect(onSetPrimary).toHaveBeenCalledWith(WALLETS[1]);
  });

  it('renders Connect Wallet button when onConnect is provided and calls it on click', () => {
    const onConnect = jest.fn();
    render(<ConnectedWallets {...makeProps({ onConnect })} />);

    const connectBtn = screen.getByRole('button', { name: /connect wallet/i });
    expect(connectBtn).toBeInTheDocument();

    fireEvent.click(connectBtn);
    expect(onConnect).toHaveBeenCalledTimes(1);
  });
});
