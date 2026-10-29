import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReputationBadge } from '../ReputationBadge';
import { useReputation } from '../../hooks/useReputation';

jest.mock('../../hooks/useReputation');
jest.mock('next/link', () => {
  function MockLink({ href, children, ...rest }: { href: string; children: React.ReactNode }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockedUseReputation = useReputation as jest.Mock;

function baseHookReturn(overrides: Partial<ReturnType<typeof useReputation>> = {}) {
  return {
    rating: 4.5,
    totalReviews: 20,
    escrowReleased: true,
    loading: false,
    handleSubmit: jest.fn().mockResolvedValue(undefined),
    onChainReputation: null,
    onChainLoading: false,
    onChainError: null,
    ...overrides,
  };
}

describe('ReputationBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the existing platform star rating unchanged', () => {
    mockedUseReputation.mockReturnValue(baseHookReturn());

    render(<ReputationBadge userId="user-1" escrowId="escrow-1" />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(20)')).toBeInTheDocument();
  });

  it('shows a loading skeleton for the on-chain score while fetching', () => {
    mockedUseReputation.mockReturnValue(baseHookReturn({ onChainLoading: true }));

    render(<ReputationBadge userId="user-1" />);

    expect(screen.getByTestId('onchain-loading')).toBeInTheDocument();
  });

  it('displays both scores with distinct styling when on-chain data is available', () => {
    mockedUseReputation.mockReturnValue(
      baseHookReturn({
        onChainReputation: { score: 1250, totalOnChainReviews: 9, updatedAt: '2026-01-01T00:00:00.000Z' },
      }),
    );

    render(<ReputationBadge userId="user-1" />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByTestId('onchain-score')).toHaveTextContent('1,250');
  });

  it('shows a clear fallback when the on-chain score is missing, never crashing or showing undefined/NaN', () => {
    mockedUseReputation.mockReturnValue(baseHookReturn({ onChainReputation: null }));

    render(<ReputationBadge userId="user-1" />);

    expect(screen.getByTestId('onchain-unavailable')).toHaveTextContent('Not yet available on-chain');
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
  });

  it('links to the full reviews grid for the user', () => {
    mockedUseReputation.mockReturnValue(baseHookReturn());

    render(<ReputationBadge userId="user-42" />);

    expect(screen.getByRole('link', { name: 'View all reviews' })).toHaveAttribute(
      'href',
      '/reviews/user-42',
    );
  });

  it('shows a tooltip explaining the difference between on-chain and platform scores', async () => {
    const user = userEvent.setup();
    mockedUseReputation.mockReturnValue(baseHookReturn());

    render(<ReputationBadge userId="user-1" />);

    const trigger = screen.getByTestId('onchain-unavailable').closest('span')?.parentElement;
    expect(trigger).toBeTruthy();

    await user.hover(screen.getByTestId('onchain-unavailable'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(/Platform rating/i);
  });

  it('disables the feedback button until escrow is released', () => {
    mockedUseReputation.mockReturnValue(baseHookReturn({ escrowReleased: false }));

    render(<ReputationBadge userId="user-1" escrowId="escrow-1" />);

    expect(screen.getByRole('button', { name: 'Leave Feedback' })).toBeDisabled();
  });

  it('opens the feedback modal and submits a star rating with the wired value state', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn().mockResolvedValue(undefined);
    const onChange = jest.fn();
    mockedUseReputation.mockReturnValue(baseHookReturn({ handleSubmit }));

    render(<ReputationBadge userId="user-1" escrowId="escrow-1" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Leave Feedback' }));
    expect(screen.getByText('Rate Experience')).toBeInTheDocument();

    const stars = screen.getAllByText('★').filter((el) => el.tagName === 'BUTTON');
    await user.click(stars[3]); // 4th star => value 4

    expect(onChange).toHaveBeenCalledWith(4);

    await user.type(screen.getByPlaceholderText('Write feedback...'), 'Solid delivery');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(handleSubmit).toHaveBeenCalledWith(4, 'Solid delivery');
  });

  it('does not throw when onChange is not provided', async () => {
    const user = userEvent.setup();
    mockedUseReputation.mockReturnValue(baseHookReturn());

    render(<ReputationBadge userId="user-1" escrowId="escrow-1" />);

    await user.click(screen.getByRole('button', { name: 'Leave Feedback' }));
    const stars = screen.getAllByText('★').filter((el) => el.tagName === 'BUTTON');

    await expect(user.click(stars[2])).resolves.not.toThrow();
  });
});
