import { apiClient } from './api';
import { DisputeCaseSummary, SubmitDisputeCasePayload } from '../types/disputeResolution';

/**
 * disputeResolutionService — API calls for the escrow dispute resolution
 * portal. Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const disputeResolutionService = {
  /** Upload a single evidence file, returning the server-assigned file id. */
  uploadEvidence: async (file: File): Promise<{ fileId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<{ fileId: string }>(
      '/escrow/disputes/evidence',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  /** Submit the dispute case referencing previously-uploaded evidence file ids. */
  submitCase: async (
    payload: SubmitDisputeCasePayload
  ): Promise<DisputeCaseSummary> => {
    const { data } = await apiClient.post<DisputeCaseSummary>(
      '/escrow/disputes',
      payload
    );
    return data;
  },
};
