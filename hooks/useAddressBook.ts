'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AddressInput, SavedAddress } from '@/types/addressBook';

export interface AddressBookApi {
  addresses: SavedAddress[];
  isLoading: boolean;
  error: string | null;
  addAddress: (input: AddressInput) => Promise<SavedAddress>;
  updateAddress: (id: string, input: AddressInput) => Promise<SavedAddress>;
  deleteAddress: (id: string) => Promise<void>;
  selectAddress: (address: SavedAddress) => Promise<void>;
  refetch: () => Promise<void>;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? 'Address book request failed');
  return response.json() as Promise<T>;
}

export function useAddressBook(): AddressBookApi {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await request<{ addresses: SavedAddress[] }>('/api/shipments/address-book');
      setAddresses(data.addresses);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load saved addresses');
    } finally { setIsLoading(false); }
  }, []);
  // Initial synchronization with the address-book API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refetch(); }, [refetch]);
  const addAddress = useCallback(async (input: AddressInput) => {
    const address = await request<SavedAddress>('/api/shipments/address-book', { method: 'POST', body: JSON.stringify(input) });
    setAddresses((current) => [address, ...current]); return address;
  }, []);
  const updateAddress = useCallback(async (id: string, input: AddressInput) => {
    const address = await request<SavedAddress>(`/api/shipments/address-book/${id}`, { method: 'PUT', body: JSON.stringify(input) });
    setAddresses((current) => current.map((item) => item.id === id ? address : item)); return address;
  }, []);
  const deleteAddress = useCallback(async (id: string) => {
    await request<void>(`/api/shipments/address-book/${id}`, { method: 'DELETE' });
    setAddresses((current) => current.filter((item) => item.id !== id));
  }, []);
  const selectAddress = useCallback(async (address: SavedAddress) => {
    await request<void>(`/api/shipments/address-book/${address.id}/use`, { method: 'POST' });
    setAddresses((current) => current.map((item) => item.id === address.id ? { ...item, usageCount: item.usageCount + 1 } : item));
  }, []);
  return { addresses, isLoading, error, addAddress, updateAddress, deleteAddress, selectAddress, refetch };
}
