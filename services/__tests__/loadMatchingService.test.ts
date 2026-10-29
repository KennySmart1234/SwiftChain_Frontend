import { apiClient } from '@/services/api';
import { loadMatchingService } from '@/services/loadMatchingService';

jest.mock('@/services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('loadMatchingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getContracts', () => {
    it('fetches contracts with no filters applied', async () => {
      mockedApiClient.get.mockResolvedValue({ data: [] });

      await loadMatchingService.getContracts();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/driver/load-matching/contracts', {
        params: {},
        signal: undefined,
      });
    });

    it('builds query params from the given filters, omitting "all" cargoType', async () => {
      mockedApiClient.get.mockResolvedValue({ data: [] });

      await loadMatchingService.getContracts({
        cargoType: 'refrigerated',
        region: 'Ashanti',
        minRate: 100,
        maxRate: 1000,
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/driver/load-matching/contracts', {
        params: { cargoType: 'refrigerated', region: 'Ashanti', minRate: '100', maxRate: '1000' },
        signal: undefined,
      });
    });

    it('omits cargoType from params when it is "all"', async () => {
      mockedApiClient.get.mockResolvedValue({ data: [] });

      await loadMatchingService.getContracts({ cargoType: 'all' });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/driver/load-matching/contracts', {
        params: {},
        signal: undefined,
      });
    });
  });

  describe('submitBid', () => {
    it('posts the bid payload and returns the typed bid', async () => {
      const bid = {
        id: 'bid-1',
        contractId: 'contract-1',
        bidAmount: 500,
        proposedTimeline: '2 days',
        status: 'submitted' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      mockedApiClient.post.mockResolvedValue({ data: bid });

      const result = await loadMatchingService.submitBid({
        contractId: 'contract-1',
        bidAmount: 500,
        proposedTimeline: '2 days',
      });

      expect(result).toEqual(bid);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/driver/load-matching/bids', {
        contractId: 'contract-1',
        bidAmount: 500,
        proposedTimeline: '2 days',
      });
    });
  });

  describe('getBids', () => {
    it('fetches the current bids', async () => {
      mockedApiClient.get.mockResolvedValue({ data: [] });

      await loadMatchingService.getBids();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/driver/load-matching/bids', {
        signal: undefined,
      });
    });
  });
});
