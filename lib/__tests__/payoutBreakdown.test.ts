import { calculatePayoutBreakdown } from '@/lib/payoutBreakdown';

describe('calculatePayoutBreakdown', () => {
  it('deducts the platform commission and gas estimate from the escrow amount', () => {
    expect(
      calculatePayoutBreakdown({
        escrowAmount: 1000,
        currency: 'XLM',
        platformFeePercent: 2.5,
        estimatedGasFee: 0.5,
      }),
    ).toEqual({
      currency: 'XLM',
      grossAmount: 1000,
      platformFeePercent: 2.5,
      platformFee: 25,
      estimatedGasFee: 0.5,
      netPayout: 974.5,
    });
  });

  it('rounds to Stellar precision without floating point noise', () => {
    const result = calculatePayoutBreakdown({
      escrowAmount: 0.3,
      currency: 'XLM',
      platformFeePercent: 10,
      estimatedGasFee: 0.00001,
    });

    expect(result.platformFee).toBe(0.03);
    expect(result.netPayout).toBe(0.26999);
  });

  it('floors the net payout at zero when fees exceed the escrow amount', () => {
    const result = calculatePayoutBreakdown({
      escrowAmount: 1,
      currency: 'XLM',
      platformFeePercent: 50,
      estimatedGasFee: 2,
    });

    expect(result.netPayout).toBe(0);
  });

  it('treats negative or non-finite inputs as zero and caps the commission at 100%', () => {
    const result = calculatePayoutBreakdown({
      escrowAmount: Number.NaN,
      currency: 'USDC',
      platformFeePercent: 250,
      estimatedGasFee: -1,
    });

    expect(result).toEqual({
      currency: 'USDC',
      grossAmount: 0,
      platformFeePercent: 100,
      platformFee: 0,
      estimatedGasFee: 0,
      netPayout: 0,
    });
  });
});
