export type AddressKind = 'pickup' | 'dropoff' | 'both';

export interface SavedAddress {
  id: string;
  label: string;
  recipientName: string;
  street: string;
  city: string;
  country: string;
  postalCode?: string;
  kind: AddressKind;
  latitude?: number;
  longitude?: number;
  usageCount: number;
  updatedAt: string;
}

export type AddressInput = Omit<SavedAddress, 'id' | 'usageCount' | 'updatedAt'>;
