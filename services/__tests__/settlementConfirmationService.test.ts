import { AxiosError, AxiosHeaders } from 'axios';
import api from '@/lib/api';
import { settlementConfirmationService } from '@/services/settlementConfirmationService';
import {
  settledEscrowResponse,
  settlementBreakdown,
  unsettledEscrowResponse,
} from '@/components/escrow/__tests__/fixtures/settlementApiResponses';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockGet = api.get as jest.Mock;

function httpError(status: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', undefined, config, {}, {
    status,
    statusText: '',
    headers: {},
    config,
    data: {},
  });
}

describe('settlementConfirmationService.getSettlementBreakdown', () => {
  const originalNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  });

  afterAll(() => {
    if (originalNetwork === undefined) delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    else process.env.NEXT_PUBLIC_STELLAR_NETWORK = originalNetwork;
  });

  it('reads the settlement endpoint and attaches a testnet explorer link', async () => {
    mockGet.mockResolvedValue({ data: settledEscrowResponse });

    await expect(
      settlementConfirmationService.getSettlementBreakdown('CESCROW123'),
    ).resolves.toEqual(settlementBreakdown);
    expect(mockGet).toHaveBeenCalledWith('/escrow/CESCROW123/settlement');
  });

  it('uses the public explorer on the public network', async () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'public';
    mockGet.mockResolvedValue({ data: settledEscrowResponse });

    const result = await settlementConfirmationService.getSettlementBreakdown('CESCROW123');

    expect(result?.explorerUrl).toBe(
      `https://steexp.com/tx/${settledEscrowResponse.data?.transactionHash}`,
    );
  });

  it('leaves the explorer link unset when there is no transaction hash', async () => {
    mockGet.mockResolvedValue({
      data: {
        ...settledEscrowResponse,
        data: { ...settledEscrowResponse.data, transactionHash: undefined },
      },
    });

    const result = await settlementConfirmationService.getSettlementBreakdown('CESCROW123');

    expect(result?.explorerUrl).toBeUndefined();
  });

  it('resolves to null when the escrow is not settled', async () => {
    mockGet.mockResolvedValue({ data: unsettledEscrowResponse });

    await expect(settlementConfirmationService.getSettlementBreakdown('CESCROW123')).resolves.toBeNull();
  });

  it('resolves to null when the backend returns 404', async () => {
    mockGet.mockRejectedValue(httpError(404));

    await expect(settlementConfirmationService.getSettlementBreakdown('CESCROW123')).resolves.toBeNull();
  });

  it('rethrows other transport errors', async () => {
    mockGet.mockRejectedValue(httpError(500));

    await expect(settlementConfirmationService.getSettlementBreakdown('CESCROW123')).rejects.toThrow(
      'Request failed',
    );
  });

  it('throws the backend message for an unsuccessful response', async () => {
    mockGet.mockResolvedValue({ data: { success: false, message: 'Escrow is disputed' } });

    await expect(settlementConfirmationService.getSettlementBreakdown('CESCROW123')).rejects.toThrow(
      'Escrow is disputed',
    );
  });
});
