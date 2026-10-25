'use client';

import {
  AlertCircle,
  CheckCircle2,
  Link2Off,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConnectedWallet } from '@/types/wallet.types';

export interface ConnectedWalletsProps {
  wallets: ConnectedWallet[];
  /** Address currently active in the shared wallet context. */
  activeAddress: string | null;
  isLoading: boolean;
  isDisconnecting: boolean;
  isSettingPrimary?: boolean;
  isConnecting?: boolean;
  error: string | null;
  onRefresh: () => void;
  onSetActive: (_wallet: ConnectedWallet) => void;
  onSetPrimary?: (_wallet: ConnectedWallet) => void;
  onConnect?: () => void;
  onDisconnect: (_wallet: ConnectedWallet) => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  freighter: 'Freighter',
  walletconnect: 'WalletConnect',
  ledger: 'Ledger',
  albedo: 'Albedo',
  xbull: 'xBull',
  rabet: 'Rabet',
};

function formatProvider(provider: string): string {
  return (
    PROVIDER_LABELS[provider.toLowerCase()] ??
    provider.charAt(0).toUpperCase() + provider.slice(1)
  );
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function formatConnectedAt(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * ConnectedWallets — presentational panel listing the Web3 wallets linked to
 * the account. It renders data supplied by useWalletManagement and never talks
 * to a service or the network directly.
 *
 * Layered Architecture:
 *   ConnectedWallets (Component) → useWalletManagement (Hook) → walletService (Service)
 */
export function ConnectedWallets({
  wallets,
  activeAddress,
  isLoading,
  isDisconnecting,
  isSettingPrimary = false,
  isConnecting = false,
  error,
  onRefresh,
  onSetActive,
  onSetPrimary,
  onConnect,
  onDisconnect,
}: ConnectedWalletsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Connected Wallets</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage the Web3 wallets linked to your SwiftChain account.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {onConnect && (
            <button
              type="button"
              onClick={onConnect}
              disabled={isLoading || isConnecting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Connect Wallet
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {error && !isLoading && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-2 text-xs font-semibold text-red-700 hover:text-red-800"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <ul aria-busy="true" aria-label="Loading connected wallets" className="space-y-3">
          {[0, 1].map((index) => (
            <li
              key={index}
              className="h-[92px] animate-pulse rounded-xl border border-gray-100 bg-gray-50"
            />
          ))}
        </ul>
      )}

      {!isLoading && !error && wallets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
          <Wallet className="h-10 w-10 text-gray-400" />
          <p className="mt-3 text-sm font-semibold text-gray-900">
            No wallets connected
          </p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            Connect a Stellar wallet from the dashboard to link it to your account.
          </p>
        </div>
      )}

      {!isLoading && wallets.length > 0 && (
        <ul role="list" className="space-y-3">
          {wallets.map((wallet) => {
            const isActive = wallet.address === activeAddress;
            const connectedAt = formatConnectedAt(wallet.connectedAt);

            return (
              <li
                key={wallet.id}
                className={cn(
                  'flex flex-col gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between',
                  isActive
                    ? 'border-blue-200 bg-blue-50/60'
                    : 'border-gray-100 bg-white'
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"
                    aria-hidden="true"
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {wallet.label || formatProvider(wallet.provider)}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                        {wallet.network}
                      </span>
                      {wallet.isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          <Star className="h-3 w-3" />
                          Primary
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-1 truncate font-mono text-xs text-gray-500"
                      title={wallet.address}
                    >
                      {truncateAddress(wallet.address)}
                    </p>
                    {connectedAt && (
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Connected {connectedAt}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {!wallet.isPrimary && onSetPrimary && (
                    <button
                      type="button"
                      onClick={() => onSetPrimary(wallet)}
                      disabled={isSettingPrimary}
                      aria-label={`Set ${wallet.label || formatProvider(wallet.provider)} as primary wallet`}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Set primary
                    </button>
                  )}
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => onSetActive(wallet)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Set active
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDisconnect(wallet)}
                    disabled={isDisconnecting}
                    aria-label={`Disconnect ${formatProvider(wallet.provider)} wallet`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDisconnecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Disconnect
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && wallets.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <Link2Off className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
          <p className="text-xs text-blue-700">
            Removing a wallet revokes its access to your escrow and delivery
            funds. You can reconnect it at any time.
          </p>
        </div>
      )}
    </div>
  );
}
