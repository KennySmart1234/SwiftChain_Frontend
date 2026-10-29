import axios from '../../lib/axios';
import {
  getReputation,
  getOnChainReputation,
  submitRating,
  getEscrowStatus,
} from '../reputationService';

jest.mock('../../lib/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedAxios = axios as unknown as { get: jest.Mock; post: jest.Mock };

describe('reputationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReputation', () => {
    it('fetches the platform rating for a user', async () => {
      mockedAxios.get.mockResolvedValue({ data: { rating: 4.5, totalReviews: 12 } });

      const result = await getReputation('user-1');

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/reputation/user-1');
      expect(result).toEqual({ rating: 4.5, totalReviews: 12 });
    });
  });

  describe('getOnChainReputation', () => {
    it('fetches the on-chain reputation score for a user', async () => {
      const data = { score: 1250, totalOnChainReviews: 8, updatedAt: '2026-01-01T00:00:00.000Z' };
      mockedAxios.get.mockResolvedValue({ data });

      const result = await getOnChainReputation('user-1');

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/reputation/user-1/onchain');
      expect(result).toEqual(data);
    });

    it('returns null when the user has no on-chain history yet (404)', async () => {
      mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

      const result = await getOnChainReputation('new-user');

      expect(result).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      const error = { response: { status: 500 } };
      mockedAxios.get.mockRejectedValue(error);

      await expect(getOnChainReputation('user-1')).rejects.toEqual(error);
    });
  });

  describe('submitRating', () => {
    it('submits a rating and feedback for an escrow', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      const result = await submitRating({ escrowId: 'escrow-1', rating: 5, feedback: 'Great!' });

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/reputation', {
        escrowId: 'escrow-1',
        rating: 5,
        feedback: 'Great!',
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('getEscrowStatus', () => {
    it('fetches the escrow status', async () => {
      mockedAxios.get.mockResolvedValue({ data: { status: 'released' } });

      const result = await getEscrowStatus('escrow-1');

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/escrow/escrow-1');
      expect(result).toEqual({ status: 'released' });
    });
  });
});
