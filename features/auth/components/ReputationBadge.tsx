import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useReputation } from "../hooks/useReputation";

interface ReputationBadgeProps {
  userId: string;
  escrowId?: string;
  /** Called with the selected star value when a rating star is clicked. */
  onChange?: (value: number) => void;
}

export const ReputationBadge = ({ userId, escrowId, onChange }: ReputationBadgeProps) => {
  const {
    rating,
    totalReviews,
    escrowReleased,
    handleSubmit,
    loading,
    onChainReputation,
    onChainLoading,
  } = useReputation(userId, escrowId);

  const [modalOpen, setModalOpen] = useState(false);
  const [value, setValue] = useState(0);
  const [feedback, setFeedback] = useState("");

  return (
    <div className="p-4 border rounded-xl">
      <div className="flex flex-wrap items-center gap-3">
        {/* Platform star rating */}
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">★</span>
          <span>{rating.toFixed(1)}</span>
          <span className="text-gray-500">({totalReviews})</span>
        </div>

        {/* On-chain reputation score — visually distinct from the platform rating */}
        <Tooltip content="Platform rating comes from customer feedback after escrow release. On-chain score is a verifiable record of completed deliveries recorded on the Stellar blockchain.">
          {onChainLoading ? (
            <span
              data-testid="onchain-loading"
              className="h-5 w-24 animate-pulse rounded-full bg-gray-200"
            />
          ) : onChainReputation ? (
            <span
              data-testid="onchain-score"
              title="Verified On-Chain Reputation Score"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
              <span className="font-semibold uppercase tracking-wide">On-chain</span>
              <span>{onChainReputation.score.toLocaleString()}</span>
            </span>
          ) : (
            <span
              data-testid="onchain-unavailable"
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500"
            >
              Not yet available on-chain
            </span>
          )}
        </Tooltip>

        <Link
          href={`/reviews/${userId}`}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          View all reviews
        </Link>
      </div>

      <button
        onClick={() => setModalOpen(true)}
        disabled={!escrowReleased}
        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        Leave Feedback
      </button>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg w-80">
            <h2 className="font-semibold mb-2">Rate Experience</h2>

             <div className="flex gap-1">
             {[1,2,3,4,5].map((star) => (
            <button
             key={star}
             onClick={() => {
               setValue(star);
               onChange?.(star);
             }}
             className={star <= value ? "text-yellow-400" : "text-gray-300"}
             >
             ★
            </button>
             ))}
            </div>

            <textarea
              className="w-full mt-2 border p-2 rounded"
              placeholder="Write feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />

            <button
              onClick={async () => {
                await handleSubmit(value, feedback);
                setModalOpen(false);
              }}
              disabled={loading}
              className="mt-3 w-full bg-green-500 text-white py-2 rounded"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};