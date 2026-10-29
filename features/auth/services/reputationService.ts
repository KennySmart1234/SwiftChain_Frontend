import axios from "../lib/axios";

export interface OnChainReputation {
  score: number;
  totalOnChainReviews: number;
  updatedAt: string;
}

export const getReputation = async (userId: string) => {
  const res = await axios.get(`/api/reputation/${userId}`);
  return res.data;
};

export const getOnChainReputation = async (
  userId: string
): Promise<OnChainReputation | null> => {
  try {
    const res = await axios.get(`/api/reputation/${userId}/onchain`);
    return res.data;
  } catch (err: any) {
    // A user with no on-chain history yet is an expected, non-error state —
    // the caller should show a "not yet available" fallback, not surface an error.
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
};

export const submitRating = async (data: {
  escrowId: string;
  rating: number;
  feedback: string;
}) => {
  const res = await axios.post(`/api/reputation`, data);
  return res.data;
};

export const getEscrowStatus = async (escrowId: string) => {
  const res = await axios.get(`/api/escrow/${escrowId}`);
  return res.data;
};