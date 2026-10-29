import type {
  SettlementBreakdown,
  SettlementBreakdownResponse,
} from '@/types/settlementConfirmation';

/** Shape of GET /escrow/:escrowId/settlement for a settled escrow. */
export const settledEscrowResponse: SettlementBreakdownResponse = {
  success: true,
  data: {
    escrowId: 'CESCROW123',
    deliveryId: 'delivery-889',
    trackingNumber: 'SC-2026-000889',
    origin: 'Lagos',
    destination: 'Abuja',
    currency: 'XLM',
    totalAmount: 1250,
    driverPayout: 1218.75,
    platformFee: 31.25,
    platformFeePercent: 2.5,
    networkFee: 0.00001,
    heldAmount: 0,
    transactionHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    settledAt: '2026-09-20T14:32:00.000Z',
  },
};

/** Settlement as returned by the service, with the explorer link attached. */
export const settlementBreakdown: SettlementBreakdown = {
  ...(settledEscrowResponse.data as SettlementBreakdown),
  explorerUrl:
    'https://testnet.steexp.com/tx/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
};

/** Shape of GET /escrow/:escrowId/settlement before the escrow is settled. */
export const unsettledEscrowResponse: SettlementBreakdownResponse = {
  success: true,
  data: null,
};
