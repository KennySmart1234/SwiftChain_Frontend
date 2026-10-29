import { renderHook, act, waitFor } from '@testing-library/react';
import { useReputation } from '../useReputation';
import {
  getReputation,
  submitRating,
  getEscrowStatus,
  getOnChainReputation,
} from '../../services/reputationService';

jest.mock('../../services/reputationService');

const mockedGetReputation = getReputation as jest.Mock;
const mockedSubmitRating = submitRating as jest.Mock;
const mockedGetEscrowStatus = getEscrowStatus as jest.Mock;
const mockedGetOnChainReputation = getOnChainReputation as jest.Mock;

describe('useReputation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetReputation.mockResolvedValue({ rating: 4.2, totalReviews: 10 });
    mockedGetEscrowStatus.mockResolvedValue({ status: 'released' });
    mockedGetOnChainReputation.mockResolvedValue({
      score: 900,
      totalOnChainReviews: 6,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('fetches and returns the existing platform rating unchanged', async () => {
    const { result } = renderHook(() => useReputation('user-1', 'escrow-1'));

    await waitFor(() => {
      expect(result.current.rating).toBe(4.2);
      expect(result.current.totalReviews).toBe(10);
    });
  });

  it('sets escrowReleased based on escrow status', async () => {
    const { result } = renderHook(() => useReputation('user-1', 'escrow-1'));

    await waitFor(() => {
      expect(result.current.escrowReleased).toBe(true);
    });
  });

  it('throws from handleSubmit when escrow is not released', async () => {
    mockedGetEscrowStatus.mockResolvedValue({ status: 'locked' });

    const { result } = renderHook(() => useReputation('user-1', 'escrow-1'));

    await waitFor(() => expect(result.current.escrowReleased).toBe(false));

    await expect(result.current.handleSubmit(5, 'Great')).rejects.toThrow('Escrow not released');
  });

  it('calls submitRating with the escrow id when released', async () => {
    const { result } = renderHook(() => useReputation('user-1', 'escrow-1'));

    await waitFor(() => expect(result.current.escrowReleased).toBe(true));

    await act(async () => {
      await result.current.handleSubmit(5, 'Great experience');
    });

    expect(mockedSubmitRating).toHaveBeenCalledWith({
      escrowId: 'escrow-1',
      rating: 5,
      feedback: 'Great experience',
    });
  });

  it('additionally fetches and returns the on-chain reputation score', async () => {
    const { result } = renderHook(() => useReputation('user-1'));

    expect(result.current.onChainLoading).toBe(true);

    await waitFor(() => expect(result.current.onChainLoading).toBe(false));

    expect(result.current.onChainReputation).toEqual({
      score: 900,
      totalOnChainReviews: 6,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.current.onChainError).toBeNull();
  });

  it('handles a missing on-chain score gracefully (null, no crash)', async () => {
    mockedGetOnChainReputation.mockResolvedValue(null);

    const { result } = renderHook(() => useReputation('user-1'));

    await waitFor(() => expect(result.current.onChainLoading).toBe(false));

    expect(result.current.onChainReputation).toBeNull();
    expect(result.current.onChainError).toBeNull();
  });

  it('surfaces an on-chain fetch error without affecting platform rating state', async () => {
    mockedGetOnChainReputation.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useReputation('user-1', 'escrow-1'));

    await waitFor(() => expect(result.current.onChainLoading).toBe(false));

    expect(result.current.onChainError).toBe('Network error');
    // Existing platform-rating behavior keeps working regardless of on-chain failure.
    await waitFor(() => {
      expect(result.current.rating).toBe(4.2);
      expect(result.current.escrowReleased).toBe(true);
    });
  });

  it('does not fetch escrow status when no escrowId is provided', async () => {
    renderHook(() => useReputation('user-1'));

    await waitFor(() => expect(mockedGetReputation).toHaveBeenCalled());

    expect(mockedGetEscrowStatus).not.toHaveBeenCalled();
  });
});
