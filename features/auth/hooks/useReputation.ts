import { useEffect, useState } from "react";
import {
  getReputation,
  submitRating,
  getEscrowStatus,
  getOnChainReputation,
  type OnChainReputation,
} from "../services/reputationService";

export const useReputation = (userId: string, escrowId?: string) => {
  const [rating, setRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [escrowReleased, setEscrowReleased] = useState(false);
  const [loading, setLoading] = useState(false);

  // On-chain score is additive: it never blocks or alters the existing
  // platform-rating fetch above. The settled result is stored together with
  // the userId it belongs to, so "loading" is derived from a stale/absent
  // result rather than written back into state from the effect body.
  const [onChainResult, setOnChainResult] = useState<{
    userId: string;
    data: OnChainReputation | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const rep = await getReputation(userId);
      setRating(rep.rating);
      setTotalReviews(rep.totalReviews);

      if (escrowId) {
        const escrow = await getEscrowStatus(escrowId);
        setEscrowReleased(escrow.status === "released");
      }
    };

    fetchData();
  }, [userId, escrowId]);

  useEffect(() => {
    let cancelled = false;

    getOnChainReputation(userId)
      .then((data) => {
        if (cancelled) return;
        setOnChainResult({ userId, data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Failed to load on-chain reputation";
        setOnChainResult({ userId, data: null, error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const onChainLoading = !onChainResult || onChainResult.userId !== userId;
  const onChainReputation = onChainLoading ? null : onChainResult.data;
  const onChainError = onChainLoading ? null : onChainResult.error;

  const handleSubmit = async (rating: number, feedback: string) => {
    if (!escrowReleased) {
      throw new Error("Escrow not released");
    }

    setLoading(true);
    await submitRating({ escrowId: escrowId!, rating, feedback });
    setLoading(false);
  };

  return {
    rating,
    totalReviews,
    escrowReleased,
    loading,
    handleSubmit,
    onChainReputation,
    onChainLoading,
    onChainError,
  };
};