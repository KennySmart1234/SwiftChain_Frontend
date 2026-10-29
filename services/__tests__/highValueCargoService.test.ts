import { AxiosError, AxiosHeaders } from 'axios';
import { apiClient } from '@/services/api';
import {
  highValueCargoService,
  HighValueCargoServiceError,
} from '@/services/highValueCargoService';
import {
  SHIPMENT_ID,
  awaitingApprovalResponse,
  submitApprovalResponse,
} from '@/hooks/__tests__/fixtures/highValueCargoApiResponses';

jest.mock('@/services/api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

function axiosErrorWith(status: number, data?: unknown): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', { headers }, null, {
    status,
    statusText: '',
    headers: {},
    config: { headers },
    data,
  });
}

describe('highValueCargoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the approval for a shipment', async () => {
    mockGet.mockResolvedValue({ data: awaitingApprovalResponse });
    const controller = new AbortController();

    const result = await highValueCargoService.getApproval(SHIPMENT_ID, controller.signal);

    expect(mockGet).toHaveBeenCalledWith(`/escrow/${SHIPMENT_ID}/multisig-approval`, {
      signal: controller.signal,
    });
    expect(result).toEqual(awaitingApprovalResponse);
  });

  it('submits the approval with the risk acknowledgement', async () => {
    mockPost.mockResolvedValue({ data: submitApprovalResponse });

    const result = await highValueCargoService.submitApproval(SHIPMENT_ID, {
      acknowledgedHighRisk: true,
    });

    expect(mockPost).toHaveBeenCalledWith(`/escrow/${SHIPMENT_ID}/multisig-approval/submit`, {
      acknowledgedHighRisk: true,
    });
    expect(result).toEqual(submitApprovalResponse);
  });

  it('encodes the shipment id', async () => {
    mockGet.mockResolvedValue({ data: awaitingApprovalResponse });

    await highValueCargoService.getApproval('a/b');

    expect(mockGet).toHaveBeenCalledWith('/escrow/a%2Fb/multisig-approval', { signal: undefined });
  });

  it('uses the backend error message when present', async () => {
    mockPost.mockRejectedValue(axiosErrorWith(409, { message: 'Signatures missing' }));

    const error = await highValueCargoService
      .submitApproval(SHIPMENT_ID, { acknowledgedHighRisk: true })
      .catch((e) => e);

    expect(error).toBeInstanceOf(HighValueCargoServiceError);
    expect(error.message).toBe('Signatures missing');
    expect(error.status).toBe(409);
  });

  it('falls back to a generic message for load failures', async () => {
    mockGet.mockRejectedValue(axiosErrorWith(500));

    await expect(highValueCargoService.getApproval(SHIPMENT_ID)).rejects.toEqual(
      expect.objectContaining({
        message: 'Unable to load approval details. Please try again.',
        status: 500,
      }),
    );
  });

  it('wraps non-axios errors', async () => {
    mockGet.mockRejectedValue(new Error('Network down'));

    await expect(highValueCargoService.getApproval(SHIPMENT_ID)).rejects.toEqual(
      expect.objectContaining({ message: 'Network down', status: null }),
    );
  });
});
