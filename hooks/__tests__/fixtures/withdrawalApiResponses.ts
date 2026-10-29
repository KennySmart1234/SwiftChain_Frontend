import type { WithdrawalQuote, WithdrawalReceipt } from '@/types/withdrawal';

/** Valid Stellar public keys (checksummed). */
export const VALID_DESTINATION = 'GBK5RUOQ44LHR4IQDKRLJADLKCLO6LQDCS7ERYO7VTVHABXBR4BZ7WIS';
/** Same key with one character changed, so the checksum no longer matches. */
export const MISTYPED_DESTINATION = 'GBK5RUOQ44LHR4IQDKRLJADLKCLO6LQDCS7ERYO7VTVHABXBR4BZ7WIT';

export const testnetQuoteFixture: WithdrawalQuote = {
  quoteId: 'quote-testnet-1',
  network: 'testnet',
  assetCode: 'XLM',
  availableBalance: 1250.5,
  networkFee: 0.5,
  minimumWithdrawal: 10,
  fiatCurrency: 'USD',
  fiatRate: 0.12,
  quotedAt: '2026-09-29T10:00:00.000Z',
};

export const publicQuoteFixture: WithdrawalQuote = {
  ...testnetQuoteFixture,
  quoteId: 'quote-public-1',
  network: 'public',
  networkFee: 0.00001,
};

export const withdrawalReceiptFixture: WithdrawalReceipt = {
  id: 'wd-001',
  amount: 100,
  fee: 0.5,
  assetCode: 'XLM',
  destination: VALID_DESTINATION,
  network: 'testnet',
  status: 'submitted',
  txHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  createdAt: '2026-09-29T10:01:00.000Z',
};
