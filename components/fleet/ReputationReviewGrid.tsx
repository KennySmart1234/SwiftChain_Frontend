'use client';

import { useState } from 'react';
import { StarIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { useReputationReviews } from '@/hooks/useReputationReviews';
import type { RatingFilter, ReputationReview } from '@/types/reputationReview';

interface ReputationReviewGridProps {
  driverId: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={`h-4 w-4 ${i < rating ? 'text-amber-500' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReputationReview }) {
  const initials = review.reviewerName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <li className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {review.reviewerAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.reviewerAvatarUrl}
              alt={review.reviewerName}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {initials}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">{review.reviewerName}</p>
            <p className="text-xs text-gray-500">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {review.isOnChainVerified && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
            title={
              review.onChainTransactionHash
                ? `Verified on-chain: ${review.onChainTransactionHash}`
                : 'Verified on-chain'
            }
          >
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            On-chain
          </span>
        )}
      </div>

      <StarRating rating={review.rating} />

      <p className="text-sm text-gray-600">{review.feedback}</p>
    </li>
  );
}

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: 'all', label: 'All ratings' },
  { value: 5, label: '5 stars' },
  { value: 4, label: '4+ stars' },
  { value: 3, label: '3+ stars' },
];

/**
 * ReputationReviewGrid — grid of driver/customer reviews with on-chain
 * verification badges, filterable by rating, date range, and verified-only.
 */
export function ReputationReviewGrid({ driverId }: ReputationReviewGridProps) {
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const { reviews, averageRating, totalCount, isLoading, error } =
    useReputationReviews(driverId, {
      rating: ratingFilter,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      verifiedOnly,
    });

  return (
    <section aria-label="Driver reviews" className="rounded-md border border-gray-200 bg-white">
      <header className="flex flex-col gap-4 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Driver Reviews</h2>
          <p className="text-xs text-gray-500">
            {totalCount} review{totalCount === 1 ? '' : 's'} · {averageRating.toFixed(1)} average
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="rating-filter" className="sr-only">
            Filter by rating
          </label>
          <select
            id="rating-filter"
            value={ratingFilter}
            onChange={(e) =>
              setRatingFilter(
                e.target.value === 'all' ? 'all' : (Number(e.target.value) as RatingFilter)
              )
            }
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            {RATING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label htmlFor="from-date" className="sr-only">
            From date
          </label>
          <input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          />

          <label htmlFor="to-date" className="sr-only">
            To date
          </label>
          <input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          />

          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Verified only
          </label>
        </div>
      </header>

      {isLoading ? (
        <div className="p-6 text-center text-sm text-gray-500">Loading reviews…</div>
      ) : error ? (
        <div className="p-6 text-center text-sm text-red-600">{error}</div>
      ) : reviews.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500">
          No reviews match the current filters.
        </div>
      ) : (
        <ul role="list" className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}
    </section>
  );
}
