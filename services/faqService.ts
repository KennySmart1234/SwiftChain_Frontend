import axios from '@/lib/httpClient';
import type { Locale } from '@/contexts/LanguageContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqCategory {
  id: string;
  category: string;
  items: FaqItem[];
}

export type FaqResponse = FaqCategory[];

export const faqService = {
  async getFaqs(locale: Locale = 'en'): Promise<FaqResponse> {
    const { data } = await axios.get<FaqResponse>(
      `${API_BASE_URL}/api/faq?lang=${locale}`,
    );
    return data;
  },
};
