import axios from 'axios';
import type { MobileQrScanResult } from '@/types/mobileQrScanner';

export const mobileQrScannerService = {
  async verifyQrCode(qrCode: string): Promise<MobileQrScanResult> {
    const { data } = await axios.post<MobileQrScanResult>(
      `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/mobile/qr/verify`,
      { qrCode },
    );

    return data;
  },
};
