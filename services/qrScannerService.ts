import { apiClient } from './api';

export interface VerifiedQrDelivery {
  success: boolean;
  deliveryId: string;
  message: string;
  status?: string;
  senderName?: string;
  driverName?: string;
  destination?: string;
}

export const qrScannerService = {
  verifyQrCode: async (qrData: string): Promise<VerifiedQrDelivery> => {
    const response = await apiClient.post<VerifiedQrDelivery>(
      '/logistics/qr/verify',
      { data: qrData },
    );
    return response.data;
  },
};
