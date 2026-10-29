import api from '@/lib/api';
import { walletService } from '@/services/walletService';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;

describe('walletService multi-sig methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches pending operations for the wallet address', async () => {
    const payload = { success: true, message: 'ok', operations: [], totalCount: 0 };
    mockGet.mockResolvedValue({ data: payload });

    await expect(walletService.getPendingMultiSigOperations('GABC')).resolves.toEqual(payload);
    expect(mockGet).toHaveBeenCalledWith('/wallet/multi-sig/pending', {
      params: { walletAddress: 'GABC' },
    });
  });

  it('submits a signature for an operation', async () => {
    const params = { operationId: 'op-1', signature: 'sig', signerPublicKey: 'GABC' };
    const payload = { success: true, message: 'Signature submitted', currentSignatures: 2 };
    mockPost.mockResolvedValue({ data: payload });

    await expect(walletService.signMultiSigOperation(params)).resolves.toEqual(payload);
    expect(mockPost).toHaveBeenCalledWith('/wallet/multi-sig/sign', params);
  });

  it('propagates transport errors', async () => {
    mockGet.mockRejectedValue(new Error('Network Error'));

    await expect(walletService.getPendingMultiSigOperations('GABC')).rejects.toThrow('Network Error');
  });
});
