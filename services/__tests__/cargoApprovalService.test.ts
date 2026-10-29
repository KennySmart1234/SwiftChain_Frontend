import { AxiosError, AxiosHeaders } from 'axios';
import api from '@/lib/api';
import {
  CargoApprovalServiceError,
  cargoApprovalService,
} from '@/services/cargoApprovalService';
import {
  SIGNER_SHIPPER,
  pendingApprovalFixture,
  thresholdMetApprovalFixture,
} from '@/hooks/__tests__/fixtures/cargoApprovalApiResponses';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;

function axiosErrorWith(status: number, message: string): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', { headers }, null, {
    status,
    statusText: 'Error',
    headers,
    config: { headers },
    data: { message },
  });
}

describe('cargoApprovalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApproval', () => {
    it('reads the escrow approvals endpoint and unwraps the envelope', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: pendingApprovalFixture } });

      await expect(cargoApprovalService.getApproval('escrow-hv-001')).resolves.toEqual(
        pendingApprovalFixture,
      );
      expect(mockGet).toHaveBeenCalledWith('/escrow/escrow-hv-001/approvals', {
        signal: undefined,
      });
    });

    it('encodes the escrow id in the path', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: pendingApprovalFixture } });

      await cargoApprovalService.getApproval('escrow/../1');

      expect(mockGet).toHaveBeenCalledWith('/escrow/escrow%2F..%2F1/approvals', {
        signal: undefined,
      });
    });

    it('throws the API message for an unsuccessful envelope', async () => {
      mockGet.mockResolvedValue({ data: { success: false, message: 'Escrow not found' } });

      await expect(cargoApprovalService.getApproval('missing')).rejects.toThrow(
        'Escrow not found',
      );
    });
  });

  describe('submitSignature', () => {
    const request = { signerPublicKey: SIGNER_SHIPPER, signedTransactionXdr: 'signed-xdr' };

    it('posts the signed envelope and returns the updated approval', async () => {
      mockPost.mockResolvedValue({ data: { success: true, data: thresholdMetApprovalFixture } });

      await expect(
        cargoApprovalService.submitSignature('escrow-hv-001', request),
      ).resolves.toEqual(thresholdMetApprovalFixture);
      expect(mockPost).toHaveBeenCalledWith('/escrow/escrow-hv-001/approvals/signatures', request);
    });

    it.each([
      [409, 'already_signed'],
      [410, 'expired'],
      [403, 'unauthorized_signer'],
      [500, 'unknown'],
    ])('maps HTTP %i to the %s error code', async (status, code) => {
      mockPost.mockRejectedValue(axiosErrorWith(status, 'Rejected by escrow service'));

      const error = await cargoApprovalService
        .submitSignature('escrow-hv-001', request)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(CargoApprovalServiceError);
      expect(error).toMatchObject({ code, status, message: 'Rejected by escrow service' });
    });
  });
});
