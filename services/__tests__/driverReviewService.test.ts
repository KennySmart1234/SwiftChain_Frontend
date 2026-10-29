import axios from 'axios';
import { driverReviewService } from '@/services/driverReviewService';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

describe('driverReviewService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches filtered reviews from the fleet reviews endpoint', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { reviews: [], page: 1, hasMore: false, total: 0 },
    });
    const signal = new AbortController().signal;
    await driverReviewService.getDriverReviews(
      'driver-1',
      {
        page: 1,
        pageSize: 6,
        minRating: 4,
        dateRange: '30d',
        verifiedOnly: true,
        sort: 'rating_desc',
      },
      signal,
    );

    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${apiBase}/api/fleet/drivers/driver-1/reviews`,
      {
        params: {
          page: 1,
          pageSize: 6,
          minRating: 4,
          dateRange: '30d',
          verifiedOnly: true,
          sort: 'rating_desc',
        },
        signal,
      },
    );
  });

  it('fetches the on-chain reputation score separately', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        driverId: 'driver-1',
        score: 92,
        totalReviews: 24,
        verifiedReviews: 20,
        updatedAt: '2026-10-18T00:00:00.000Z',
        source: 'on_chain',
      },
    });
    const signal = new AbortController().signal;

    await driverReviewService.getDriverReputation('driver-1', signal);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${apiBase}/api/fleet/drivers/driver-1/reputation`,
      { signal },
    );
  });
});
