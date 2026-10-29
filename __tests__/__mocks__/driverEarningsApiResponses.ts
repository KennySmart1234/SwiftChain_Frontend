import type {
  DriverEarningsSummary,
  DriverPayout,
} from '@/types/driverEarnings';
import type { NgnXlmRate } from '@/services/fxService';

/**
 * Recorded response shapes from the driver earnings endpoints
 * (/driver/earnings/summary, /driver/earnings/payouts, /driver/earnings/withdrawals)
 * and the NGN/XLM rate endpoint, used to stub the service layer in tests.
 */

export const DESTINATION_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

export const earningsSummaryResponse: DriverEarningsSummary = {
  availableXlm: 1250.5,
  pendingEscrowXlm: 340,
  lifetimeEarningsXlm: 9820.75,
  pendingEscrowCount: 3,
  updatedAt: '2026-09-28T10:15:00Z',
};

export const emptyBalanceSummaryResponse: DriverEarningsSummary = {
  availableXlm: 0,
  pendingEscrowXlm: 45,
  lifetimeEarningsXlm: 45,
  pendingEscrowCount: 1,
  updatedAt: '2026-09-28T10:15:00Z',
};

export const refreshedSummaryResponse: DriverEarningsSummary = {
  ...earningsSummaryResponse,
  availableXlm: 1500.5,
  pendingEscrowXlm: 90,
  updatedAt: '2026-09-28T10:30:00Z',
};

export const payoutHistoryResponse: DriverPayout[] = [
  {
    id: 'po_01',
    amountXlm: 500,
    destination: DESTINATION_ADDRESS,
    status: 'completed',
    txHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    createdAt: '2026-09-27T08:00:00Z',
  },
  {
    id: 'po_02',
    amountXlm: 120.25,
    destination: DESTINATION_ADDRESS,
    status: 'processing',
    createdAt: '2026-09-27T12:30:00Z',
  },
  {
    id: 'po_03',
    amountXlm: 75,
    destination: DESTINATION_ADDRESS,
    status: 'pending',
    createdAt: '2026-09-28T07:45:00Z',
  },
  {
    id: 'po_04',
    amountXlm: 60,
    destination: DESTINATION_ADDRESS,
    status: 'failed',
    createdAt: '2026-09-28T09:10:00Z',
  },
];

export const withdrawalPayoutResponse: DriverPayout = {
  id: 'po_05',
  amountXlm: 200,
  destination: DESTINATION_ADDRESS,
  status: 'pending',
  createdAt: '2026-09-28T10:20:00Z',
};

export const ngnXlmRateResponse: NgnXlmRate = {
  ngnPerXlm: 400,
  updatedAt: '2026-09-28T10:14:00Z',
};
