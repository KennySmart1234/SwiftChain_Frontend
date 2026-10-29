import { apiClient } from '@/services/api';

export type EscrowActionStatus = 'Pending' | 'Locked' | 'Released';

export interface EscrowActionState {
  id: string;
  shipmentId: string;
  status: EscrowActionStatus;
  updatedAt: string;
}

function assertEscrowState(data: EscrowActionState): EscrowActionState {
  if (
    !data ||
    typeof data.id !== 'string' ||
    typeof data.shipmentId !== 'string' ||
    !['Pending', 'Locked', 'Released'].includes(data.status)
  ) {
    throw new Error('Invalid escrow response');
  }
  return data;
}

export const escrowActionsService = {
  async getEscrow(shipmentId: string): Promise<EscrowActionState> {
    const { data } = await apiClient.get<EscrowActionState>(
      `/escrows/${shipmentId}`,
    );
    return assertEscrowState(data);
  },

  async lockEscrow(shipmentId: string): Promise<EscrowActionState> {
    const { data } = await apiClient.post<EscrowActionState>(
      `/escrows/${shipmentId}/lock`,
    );
    return assertEscrowState(data);
  },

  async releaseEscrow(shipmentId: string): Promise<EscrowActionState> {
    const { data } = await apiClient.post<EscrowActionState>(
      `/escrows/${shipmentId}/release`,
    );
    return assertEscrowState(data);
  },
};
