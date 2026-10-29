import type { SettlementBreakdown } from '@/types/settlementBreakdown';

/**
 * Recorded response shapes from GET /api/escrow/{id}/settlement, used to
 * stub the service layer in hook and component tests.
 */

export const ESCROW_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
export const SETTLEMENT_TX_HASH = '3f9a1c7e5b2d4a6f8c0e1b3d5f7a9c2e4b6d8f0a1c3e5b7d9f2a4c6e8b0d8b20e4';

export const confirmedSettlementResponse: SettlementBreakdown = {
  escrowId: ESCROW_ID,
  status: 'confirmed',
  asset: 'XLM',
  network: 'testnet',
  totalEscrowAmount: 1250,
  driverPayout: 1134.375,
  platformFee: 31.25,
  platformFeeRate: 0.025,
  taxWithholdings: [
    { code: 'vat', label: 'VAT on platform fee', rate: 0.075, amount: 2.34375 },
    { code: 'wht', label: 'Withholding tax', rate: 0.05, amount: 57.03125 },
  ],
  heldAmount: 25,
  heldReason: 'Dispute window open for 24 hours',
  remainingBalance: 0,
  transactionHash: SETTLEMENT_TX_HASH,
  ledger: 51234567,
  settledAt: '2026-09-28T14:32:10Z',
  delivery: {
    trackingNumber: 'SWC-2026-004821',
    origin: 'Lagos, NG',
    destination: 'Accra, GH',
    deliveredAt: '2026-09-28T13:58:02Z',
  },
};

export const finalizingSettlementResponse: SettlementBreakdown = {
  ...confirmedSettlementResponse,
  status: 'finalizing',
  transactionHash: SETTLEMENT_TX_HASH,
  ledger: null,
  settledAt: null,
};

export const pendingSettlementResponse: SettlementBreakdown = {
  ...confirmedSettlementResponse,
  status: 'pending',
  transactionHash: null,
  ledger: null,
  settledAt: null,
};

export const failedSettlementResponse: SettlementBreakdown = {
  ...confirmedSettlementResponse,
  status: 'failed',
  ledger: null,
  settledAt: null,
};
