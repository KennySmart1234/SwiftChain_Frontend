import type {
  DriverReview,
  DriverReviewFilters,
  DriverReviewsPage,
} from '@/types/driverReview';

const DAY_MS = 86_400_000;
const daysAgo = (n: number): string => new Date(Date.now() - n * DAY_MS).toISOString();

const review = (
  id: string,
  reviewerName: string,
  rating: number,
  verified: boolean,
  ageDays: number,
): DriverReview => ({
  id,
  driverId: 'driver-1',
  reviewerName,
  rating,
  comment: `Comment from ${reviewerName}`,
  createdAt: daysAgo(ageDays),
  verified,
});

/** Shape-identical to the backend /fleet/drivers/:id/reviews payload. */
export const driverReviewFixtures: DriverReview[] = [
  review('r1', 'Ada Okafor', 5, true, 1),
  review('r2', 'Bola Ade', 4, false, 5),
  review('r3', 'Chi Eze', 3, true, 20),
  review('r4', 'Dayo Bello', 5, false, 40),
  review('r5', 'Efe Obi', 2, true, 100),
  review('r6', 'Femi Yusuf', 1, false, 3),
];

const RANGE_DAYS = { all: Infinity, '7d': 7, '30d': 30, '90d': 90 } as const;

/** Mirrors the server contract so tests can assert filter/sort behaviour. */
export function applyReviewFilters(
  reviews: DriverReview[],
  filters: DriverReviewFilters,
): DriverReview[] {
  const cutoff = Date.now() - RANGE_DAYS[filters.dateRange] * DAY_MS;
  const time = (r: DriverReview) => Date.parse(r.createdAt);
  return reviews
    .filter((r) => (filters.minRating ? r.rating >= filters.minRating : true))
    .filter((r) => (filters.verifiedOnly ? r.verified : true))
    .filter((r) => time(r) >= cutoff)
    .sort((a, b) => {
      switch (filters.sort) {
        case 'date_asc':
          return time(a) - time(b);
        case 'rating_desc':
          return b.rating - a.rating || time(b) - time(a);
        case 'rating_asc':
          return a.rating - b.rating || time(b) - time(a);
        default:
          return time(b) - time(a);
      }
    });
}

export function buildReviewsPage(
  reviews: DriverReview[],
  page: number,
  hasMore: boolean,
): DriverReviewsPage {
  return { reviews, page, hasMore, total: reviews.length };
}
