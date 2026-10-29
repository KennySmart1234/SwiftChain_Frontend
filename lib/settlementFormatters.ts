import type { StellarNetwork } from '@/types/settlementBreakdown';

const STELLAR_EXPERT_BASE_URL = 'https://stellar.expert/explorer';

/**
 * Formats an on-chain asset amount, keeping up to 7 decimal places (the
 * precision of Stellar amounts) while always showing at least 2.
 */
export function formatAssetAmount(amount: number, asset: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  }).format(amount);
  return `${formatted} ${asset}`;
}

/** Formats a fractional rate (0.025) as a percentage string ("2.5%"). */
export function formatRate(rate: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 2,
  }).format(rate);
}

export function getStellarExplorerTxUrl(hash: string, network: StellarNetwork): string {
  return `${STELLAR_EXPERT_BASE_URL}/${network}/tx/${encodeURIComponent(hash)}`;
}

/** Shortens a transaction hash for display, e.g. "3f9a1c…8b20e4". */
export function truncateHash(hash: string, visible = 6): string {
  if (hash.length <= visible * 2 + 1) return hash;
  return `${hash.slice(0, visible)}…${hash.slice(-visible)}`;
}

export function formatSettlementDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(iso));
}
