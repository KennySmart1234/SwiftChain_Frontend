/**
 * Stellar SDK Mock Provider Utility
 * 
 * This module provides comprehensive mocking for Stellar/Soroban contract interactions.
 * It simulates a connected wallet and contract server while allowing per-test configuration
 * of success/failure scenarios and realistic transaction delays.
 * 
 * The mocking approach mirrors the Stellar SDK's real API shape, ensuring tests validate
 * actual hook behavior against realistic provider responses.
 */

/**
 * Mock response from server.sendTransaction()
 */
export interface MockSendTransactionResponse {
  hash: string;
  result_xdr?: string;
  envelope_xdr?: string;
  status?: number;
}

/**
 * Mock response from server.getTransaction()
 */
export interface MockGetTransactionResponse {
  id: string;
  hash: string;
  status: 'NOT_FOUND' | 'SUCCESS' | 'FAILED';
  result_xdr?: string;
  envelope_xdr?: string;
}

/**
 * Configuration for per-test mock behavior
 */
export interface MockProviderConfig {
  // Wallet behavior
  walletConnected?: boolean;
  publicKey?: string;
  walletSignError?: Error | null;
  
  // Server behavior
  getAccountError?: Error | null;
  sendTransactionError?: Error | null;
  
  // Transaction behavior
  transactionHash?: string;
  transactionDelay?: number; // ms before NOT_FOUND resolves to SUCCESS
  transactionStatus?: 'SUCCESS' | 'FAILED';
  
  // Contract data queries
  contractDataResponses?: Map<string, unknown>;
  contractDataError?: Error | null;
}

/**
 * Mock Stellar Server instance
 * Simulates Soroban contract server behavior for testing
 */
export class MockStellarServer {
  private config: MockProviderConfig;
  private transactionResponses: Map<string, MockGetTransactionResponse> = new Map();

  constructor(config: MockProviderConfig = {}) {
    this.config = {
      walletConnected: true,
      publicKey: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
      transactionHash: '0x' + 'a'.repeat(64),
      transactionDelay: 100,
      transactionStatus: 'SUCCESS',
      ...config,
    };
  }

  /**
   * Mock implementation of server.getContractData()
   * Returns predefined contract storage values or throws configured error
   */
  async getContractData(contractAddress: string, storageKey: any): Promise<{ val: any }> {
    if (this.config.contractDataError) {
      throw this.config.contractDataError;
    }

    const key = storageKey?.toXDR?.('base64') || String(storageKey);
    const response = this.config.contractDataResponses?.get(key);

    if (!response) {
      throw new Error(`No mock data configured for contract storage key: ${key}`);
    }

    return { val: response };
  }

  /**
   * Mock implementation of server.getAccount()
   * Returns a mocked account with incrementing sequence number
   */
  async getAccount(publicKey: string) {
    if (this.config.getAccountError) {
      throw this.config.getAccountError;
    }

    return {
      id: publicKey,
      accountId: publicKey,
      sequence: '123456789',
      sequenceNumber: () => '123456789',
      incrementSequenceNumber: () => {
        // no-op
      },
      getSequenceNumber: () => '123456789',
    };
  }

  /**
   * Mock implementation of server.sendTransaction()
   * Returns transaction hash or throws configured error
   * Sets up subsequent getTransaction() calls to return the configured response
   */
  async sendTransaction(transaction: any): Promise<MockSendTransactionResponse> {
    if (this.config.sendTransactionError) {
      throw this.config.sendTransactionError;
    }

    const hash = this.config.transactionHash || '0x' + 'a'.repeat(64);
    const status = this.config.transactionStatus || 'SUCCESS';

    // Set up the response for this transaction hash
    this.transactionResponses.set(hash, {
      id: hash,
      hash,
      status: 'NOT_FOUND', // Initially not found
    });

    // Schedule transition to final status after delay
    if (this.config.transactionDelay !== undefined && this.config.transactionDelay >= 0) {
      setTimeout(() => {
        this.transactionResponses.set(hash, {
          id: hash,
          hash,
          status,
        });
      }, this.config.transactionDelay);
    }

    return { hash };
  }

  /**
   * Mock implementation of server.getTransaction()
   * Returns transaction status, initially NOT_FOUND then transitions to final status
   */
  async getTransaction(hash: string): Promise<MockGetTransactionResponse> {
    const response = this.transactionResponses.get(hash) || {
      id: hash,
      hash,
      status: 'NOT_FOUND' as const,
    };

    return response;
  }

  /**
   * Configure mock responses for a specific test scenario
   */
  setConfig(config: Partial<MockProviderConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear transaction history for next test
   */
  reset() {
    this.transactionResponses.clear();
  }
}

/**
 * Mock Wallet instance
 * Simulates Freighter or other Stellar wallet behavior
 */
export class MockWallet {
  private config: MockProviderConfig;

  constructor(config: MockProviderConfig = {}) {
    this.config = {
      walletConnected: true,
      publicKey: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC',
      ...config,
    };
  }

  /**
   * Mock implementation of wallet.getPublicKey()
   */
  async getPublicKey(): Promise<string | null> {
    if (!this.config.walletConnected) {
      return null;
    }
    return this.config.publicKey || null;
  }

  /**
   * Mock implementation of wallet.signTransaction()
   * Returns a mock signed XDR or throws configured error
   */
  async signTransaction(
    xdr: string,
    options: { networkPassphrase: string },
  ): Promise<string> {
    if (this.config.walletSignError) {
      throw this.config.walletSignError;
    }

    // Return the original XDR as "signed" (in real life, signature would be appended)
    return xdr;
  }

  /**
   * Configure mock responses for a specific test scenario
   */
  setConfig(config: Partial<MockProviderConfig>) {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Factory for creating mock providers with realistic defaults
 */
export const createMockStellarEnvironment = (config: MockProviderConfig = {}) => {
  const server = new MockStellarServer(config);
  const wallet = new MockWallet(config);

  return { server, wallet };
};

/**
 * Helper to create realistic mock contract data responses
 */
export const createMockContractDataResponses = (
  signers: string[] = [],
  requiredSignatures: number = 2,
  isReleased: boolean = false,
) => {
  const responses = new Map<string, any>();

  // Mock signature array response
  responses.set(
    'AAAABgAAAAtzaWduYXR1cmVz', // base64 key for 'signatures'
    {
      type: 'Vec',
      values: signers.map((signer) => ({
        type: 'String',
        value: signer,
      })),
    },
  );

  // Mock threshold response
  responses.set(
    'AAAABgAAAAl0aHJlc2hvbGQ=', // base64 key for 'threshold'
    {
      type: 'I32',
      value: requiredSignatures,
    },
  );

  // Mock released status response
  responses.set(
    'AAAABgAAAAlyZWxlYXNlZA==', // base64 key for 'released'
    {
      type: 'Bool',
      value: isReleased,
    },
  );

  return responses;
};

/**
 * Helper to simulate common error scenarios
 */
export const createMockErrors = () => ({
  walletNotConnected: new Error('Wallet not connected or public key unavailable.'),
  insufficientFunds: new Error('Insufficient funds for transaction'),
  contractReverted: new Error('Contract invocation reverted'),
  transactionTimeout: new Error('Transaction failed or timed out.'),
  networkError: new Error('Network error connecting to Soroban RPC'),
  invalidParams: new Error('Invalid lock parameters: all fields are required and amount must be positive.'),
});
