import type { EarningsSummary, PayoutHistoryPage } from '@/types/earnings';

export const earningsSummaryFixture: EarningsSummary = {
  available: 1250.5,
  pending: 320,
  total: 8940.75,
  currency: 'XLM',
  updatedAt: '2026-09-28T10:00:00.000Z',
};

export const payoutPageOneFixture: PayoutHistoryPage = {
  items: [
    {
      id: 'payout-3',
      amount: 400,
      currency: 'XLM',
      status: 'completed',
      destination: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
      txHash: 'b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4',
      createdAt: '2026-09-27T09:00:00.000Z',
    },
    {
      id: 'payout-2',
      amount: 150,
      currency: 'XLM',
      status: 'processing',
      destination: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
      createdAt: '2026-09-20T09:00:00.000Z',
    },
  ],
  nextCursor: 'cursor-page-2',
};

export const payoutPageTwoFixture: PayoutHistoryPage = {
  items: [
    {
      id: 'payout-1',
      amount: 75.25,
      currency: 'XLM',
      status: 'failed',
      destination: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
      createdAt: '2026-09-10T09:00:00.000Z',
    },
  ],
  nextCursor: null,
};
