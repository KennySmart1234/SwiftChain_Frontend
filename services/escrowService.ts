/**
 * Escrow Service
 *
 * Manages on-chain escrow interactions for SwiftChain deliveries.
 * Stellar Soroban integration is stubbed until `stellar-sdk` is installed
 * and `@/lib/wallet` is implemented.
 *
 * To enable real blockchain calls:
 *   1. pnpm add stellar-sdk
 *   2. Implement @/lib/wallet (getWallet utility)
 *   3. Replace the stub implementations below.
 */

import type { EscrowDetails, ReleaseFundsResponse } from '@/types/escrow';

// ---------------------------------------------------------------------------
// Parameter / response types
// ---------------------------------------------------------------------------

export interface LockEscrowParams {
  deliveryId: string;
  amount: number;
  currency: string;
  walletAddress: string;
}

export interface LockEscrowResponse {
  escrowId: string;
  transactionHash: string;
}

export interface ReleaseEscrowParams {
  escrowId: string;
  deliveryId: string;
  walletAddress: string;
}

export interface OpenDisputeParams {
  escrowId?: string;
  deliveryId: string;
  transactionId?: string;
  reason: string;
  description?: string;
  evidenceFiles?: File[];
  walletAddress: string;
}

export interface OpenDisputeResponse {
  disputeId: string;
  transactionHash: string;
}

// ---------------------------------------------------------------------------
// Service implementation (stubs — replace with real Soroban calls)
// ---------------------------------------------------------------------------

/**
 * Fetches the current state of an escrow contract.
 * @param escrowId The contract address.
 */
async function getEscrowDetails(escrowId: string): Promise<EscrowDetails> {
  // TODO: Replace with real Soroban contract call once stellar-sdk is installed.
  console.warn('[escrowService] getEscrowDetails is stubbed:', escrowId);
  return {
    currentSignatures: 0,
    requiredSignatures: 1,
    isReleased: false,
    signers: [],
  };
}

/**
 * Invokes the 'release_funds' function on the escrow contract.
 * @param escrowId The contract address.
 */
async function releaseFunds(escrowId: string): Promise<ReleaseFundsResponse> {
  // TODO: Replace with real Soroban transaction once stellar-sdk is installed.
  console.warn('[escrowService] releaseFunds is stubbed:', escrowId);
  return { success: true, transactionHash: 'stub-tx-hash' };
}

/**
 * Locks funds in an escrow smart contract for a delivery.
 */
async function lockEscrow(params: LockEscrowParams): Promise<LockEscrowResponse> {
  // TODO: Replace with real Soroban transaction once stellar-sdk is installed.
  console.warn('[escrowService] lockEscrow is stubbed:', params);
  return {
    escrowId: `escrow-${params.deliveryId}`,
    transactionHash: 'stub-lock-tx-hash',
  };
}

/**
 * Releases escrow funds after delivery confirmation.
 */
async function releaseEscrow(params: ReleaseEscrowParams): Promise<ReleaseFundsResponse & { message?: string }> {
  // TODO: Replace with real Soroban transaction once stellar-sdk is installed.
  console.warn('[escrowService] releaseEscrow is stubbed:', params);
  return { success: true, transactionHash: 'stub-release-tx-hash' };
}

/**
 * Opens a dispute on an existing escrow contract.
 */
async function openDispute(params: OpenDisputeParams): Promise<OpenDisputeResponse> {
  // TODO: Replace with real Soroban transaction once stellar-sdk is installed.
  console.warn('[escrowService] openDispute is stubbed:', params);
  return {
    disputeId: `dispute-${params.escrowId}`,
    transactionHash: 'stub-dispute-tx-hash',
  };
}

export const escrowService = {
  getEscrowDetails,
  releaseFunds,
  lockEscrow,
  releaseEscrow,
  openDispute,
};
