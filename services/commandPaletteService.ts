import axios from '@/lib/httpClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface DeliverySummary {
  id: string;
  title: string;
  status?: string;
}

export const commandPaletteService = {
  async fetchDeliveries(): Promise<DeliverySummary[]> {
    const response = await axios.get<DeliverySummary[] | { items: DeliverySummary[] }>(
      `${API_BASE_URL}/api/deliveries`,
    );

    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }

    return data?.items ?? [];
  },
};
