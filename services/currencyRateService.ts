import axios from '@/lib/httpClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CurrencyRateResponse {
  fiat: string;
  xlmRate: number;
  updatedAt: string;
}

export const currencyRateService = {
  async getXlmRate(fiat: string): Promise<CurrencyRateResponse> {
    const { data } = await axios.get<CurrencyRateResponse>(
      `${API_BASE_URL}/api/rates/xlm`,
      {
        params: { fiat },
      }
    );

    if (
      !data ||
      typeof data.fiat !== 'string' ||
      typeof data.xlmRate !== 'number' ||
      typeof data.updatedAt !== 'string'
    ) {
      throw new Error('Invalid currency rate response');
    }

    return data;
  },
};
