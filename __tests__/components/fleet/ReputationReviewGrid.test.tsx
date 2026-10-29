import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReputationReviewGrid } from '@/components/fleet/ReputationReviewGrid';
import { useDriverReviews, type UseDriverReviewsResult } from '@/hooks/useDriverReviews';
import {
  applyReviewFilters,
  driverReviewFixtures,
} from '../../fixtures/driverReviewFixtures';

jest.mock('@/hooks/useDriverReviews');

const mockUseDriverReviews = useDriverReviews as jest.MockedFunction<typeof useDriverReviews>;

const fetchNextPage = jest.fn();
const refetch = jest.fn();

function result(overrides: Partial<UseDriverReviewsResult> = {}): UseDriverReviewsResult {
  return {
    reviews: [],
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage,
    refetch,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDriverReviews.mockImplementation((_driverId, filters) =>
    result({ reviews: applyReviewFilters(driverReviewFixtures, filters) }),
  );
});

describe('ReputationReviewGrid', () => {
  it('requests reviews for the driver with default filters', () => {
    render(<ReputationReviewGrid driverId="driver-1" />);
    expect(mockUseDriverReviews).toHaveBeenLastCalledWith('driver-1', {
      minRating: null,
      dateRange: 'all',
      verifiedOnly: false,
      sort: 'date_desc',
    });
  });

  it('renders a card for each review with its data', () => {
    render(<ReputationReviewGrid driverId="driver-1" />);
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(driverReviewFixtures.length);
    const first = within(cards[0]);
    expect(first.getByText('Ada Okafor')).toBeInTheDocument();
    expect(first.getByText('Comment from Ada Okafor')).toBeInTheDocument();
    expect(first.getByLabelText('Rated 5 out of 5')).toBeInTheDocument();
    expect(first.getByText('Verified')).toBeInTheDocument();
  });

  it('narrows results with the rating filter', async () => {
    const user = userEvent.setup();
    render(<ReputationReviewGrid driverId="driver-1" />);
    await user.selectOptions(screen.getByLabelText('Minimum rating'), '5');
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(screen.queryByText('Femi Yusuf')).not.toBeInTheDocument();
  });

  it('narrows results with the date filter', async () => {
    const user = userEvent.setup();
    render(<ReputationReviewGrid driverId="driver-1" />);
    await user.selectOptions(screen.getByLabelText('Date range'), '7d');
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.queryByText('Efe Obi')).not.toBeInTheDocument();
  });

  it('sorts by highest and lowest rating', async () => {
    const user = userEvent.setup();
    render(<ReputationReviewGrid driverId="driver-1" />);
    await user.selectOptions(screen.getByLabelText('Sort by'), 'rating_desc');
    expect(within(screen.getAllByRole('article')[0]).getByText('Ada Okafor')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Sort by'), 'rating_asc');
    expect(within(screen.getAllByRole('article')[0]).getByText('Femi Yusuf')).toBeInTheDocument();
  });

  it('sorts by newest and oldest date', async () => {
    const user = userEvent.setup();
    render(<ReputationReviewGrid driverId="driver-1" />);
    expect(within(screen.getAllByRole('article')[0]).getByText('Ada Okafor')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Sort by'), 'date_asc');
    expect(within(screen.getAllByRole('article')[0]).getByText('Efe Obi')).toBeInTheDocument();
  });

  it('shows only verified reviews when verified-only is checked', async () => {
    const user = userEvent.setup();
    render(<ReputationReviewGrid driverId="driver-1" />);
    await user.click(screen.getByLabelText('Verified only'));
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(3);
    cards.forEach((card) => expect(within(card).getByText('Verified')).toBeInTheDocument());
  });

  it('loads more results when Load more is clicked', async () => {
    const user = userEvent.setup();
    mockUseDriverReviews.mockReturnValue(
      result({ reviews: driverReviewFixtures, hasNextPage: true }),
    );
    render(<ReputationReviewGrid driverId="driver-1" />);
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('hides Load more when there are no further pages', () => {
    render(<ReputationReviewGrid driverId="driver-1" />);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('disables the button while the next page is loading', () => {
    mockUseDriverReviews.mockReturnValue(
      result({ reviews: driverReviewFixtures, hasNextPage: true, isFetchingNextPage: true }),
    );
    render(<ReputationReviewGrid driverId="driver-1" />);
    expect(screen.getByRole('button', { name: 'Loading more...' })).toBeDisabled();
  });

  it('shows the empty state when there are no reviews', () => {
    mockUseDriverReviews.mockReturnValue(result({ reviews: [] }));
    render(<ReputationReviewGrid driverId="driver-1" />);
    expect(screen.getByText('No reviews match your filters.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('shows a loading state', () => {
    mockUseDriverReviews.mockReturnValue(result({ isLoading: true }));
    render(<ReputationReviewGrid driverId="driver-1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading reviews...');
  });

  it('shows an error with a working retry', async () => {
    const user = userEvent.setup();
    mockUseDriverReviews.mockReturnValue(result({ error: 'Failed to load reviews' }));
    render(<ReputationReviewGrid driverId="driver-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load reviews');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
