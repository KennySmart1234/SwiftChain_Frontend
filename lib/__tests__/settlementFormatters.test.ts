import {
  formatAssetAmount,
  formatRate,
  getStellarExplorerTxUrl,
  formatSettlementDate,
  getStellarExplorerTxUrl,
  truncateHash,
} from '@/lib/settlementFormatters';

describe('settlementFormatters', () => {
  describe('formatAssetAmount', () => {
    it('shows at least two decimals with the asset code', () => {
      expect(formatAssetAmount(1250, 'XLM')).toBe('1,250.00 XLM');
    });

    it('keeps Stellar 7-decimal precision', () => {
      expect(formatAssetAmount(0.1234567, 'USDC')).toBe('0.1234567 USDC');
      expect(formatAssetAmount(0.123456789, 'XLM')).toBe('0.1234568 XLM');
    });
  });

  describe('formatRate', () => {
    it('formats fractional rates as percentages', () => {
      expect(formatRate(0.025)).toBe('2.5%');
      expect(formatRate(0.1)).toBe('10%');
    });
  });

  describe('getStellarExplorerTxUrl', () => {
    it('links to the matching network on stellar.expert', () => {
      expect(getStellarExplorerTxUrl('abc123', 'public')).toBe(
        'https://stellar.expert/explorer/public/tx/abc123',
      );
      expect(getStellarExplorerTxUrl('abc123', 'testnet')).toBe(
        'https://stellar.expert/explorer/testnet/tx/abc123',
      );
    });
  });

  describe('truncateHash', () => {
    it('keeps the start and end of long hashes', () => {
      expect(truncateHash('3f9a1c7e5b2d4a6f8c0e8b20e4')).toBe('3f9a1c…8b20e4');
    });

    it('returns short hashes unchanged', () => {
      expect(truncateHash('abc123')).toBe('abc123');
    });
  });

  describe('formatSettlementDate', () => {
    it('formats ISO timestamps in UTC', () => {
      expect(formatSettlementDate('2026-09-28T14:32:10Z')).toBe('Sep 28, 2026, 2:32 PM UTC');
    });
  });
});
