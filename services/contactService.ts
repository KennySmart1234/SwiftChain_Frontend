import axios from '@/lib/httpClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export type SupportCategory =
  | 'general'
  | 'billing'
  | 'technical'
  | 'delivery'
  | 'account';

export interface ContactPayload {
  subject: string;
  category: SupportCategory;
  message: string;
  attachment?: string | null; // base64 encoded file
  attachmentName?: string | null;
}

export interface ContactResponse {
  success: boolean;
  ticketId: string;
  message: string;
}

export const contactService = {
  async submitTicket(payload: ContactPayload): Promise<ContactResponse> {
    const { data } = await axios.post<ContactResponse>(
      `${API_BASE_URL}/api/support/contact`,
      payload,
    );
    return data;
  },
};
