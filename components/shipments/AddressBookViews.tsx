'use client';

import { MapPin, Pencil, Plus, Trash2, Truck, X } from 'lucide-react';
import type { AddressInput, SavedAddress } from '@/types/addressBook';

export interface AddressBookViewProps {
  addresses: SavedAddress[];
  onSelect?: (address: SavedAddress) => void;
  onDelete?: (address: SavedAddress) => void;
  onEdit?: (address: SavedAddress) => void;
  onAdd?: () => void;
}

function AddressActions({ address, onSelect, onDelete, onEdit }: Pick<AddressBookViewProps, 'onSelect' | 'onDelete' | 'onEdit'> & { address: SavedAddress }) {
  return <div className="flex items-center gap-2">
    <button type="button" aria-label={`Select ${address.label}`} onClick={() => onSelect?.(address)} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Use</button>
    <button type="button" aria-label={`Edit ${address.label}`} onClick={() => onEdit?.(address)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"><Pencil className="h-4 w-4" /></button>
    <button type="button" aria-label={`Delete ${address.label}`} onClick={() => onDelete?.(address)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
  </div>;
}

function Empty({ onAdd }: { onAdd?: () => void }) { return <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center"><MapPin className="mx-auto h-10 w-10 text-gray-300" /><h3 className="mt-3 font-semibold text-gray-900">No saved addresses</h3><p className="mt-1 text-sm text-gray-500">Save a pickup or drop-off address for faster shipments.</p><button type="button" onClick={onAdd} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add address</button></div>; }

function AddressText({ address }: { address: SavedAddress }) { return <><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-600" /><span className="font-semibold text-gray-900">{address.label}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{address.kind}</span></div><p className="mt-1 text-sm text-gray-600">{address.street}, {address.city}, {address.country}{address.postalCode ? ` ${address.postalCode}` : ''}</p><p className="mt-1 text-xs text-gray-400">{address.recipientName} · Used {address.usageCount} times</p></>; }

export function AddressBookList({ addresses, onSelect, onDelete, onEdit, onAdd }: AddressBookViewProps) { if (!addresses.length) return <Empty onAdd={onAdd} />; return <div aria-label="Address book list" className="space-y-3">{addresses.map((address) => <article key={address.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><AddressText address={address} /><AddressActions address={address} onSelect={onSelect} onDelete={onDelete} onEdit={onEdit} /></article>)}<button type="button" onClick={onAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><Plus className="h-4 w-4" />Add address</button></div>; }

export function AddressBookGrid({ addresses, onSelect, onDelete, onEdit, onAdd }: AddressBookViewProps) { if (!addresses.length) return <Empty onAdd={onAdd} />; return <div aria-label="Address book grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{addresses.map((address) => <article key={address.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><div className="flex h-24 items-center justify-center bg-blue-50"><MapPin className="h-10 w-10 text-blue-500" /></div><div className="space-y-3 p-4"><AddressText address={address} /><AddressActions address={address} onSelect={onSelect} onDelete={onDelete} onEdit={onEdit} /></div></article>)}<button type="button" onClick={onAdd} className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-700"><Plus className="mb-2 h-6 w-6" />Add address</button></div>; }

export function AddressBookTable({ addresses, onSelect, onDelete, onEdit, onAdd }: AddressBookViewProps) { if (!addresses.length) return <Empty onAdd={onAdd} />; return <div aria-label="Address book table" className="overflow-x-auto rounded-xl border border-gray-200 bg-white"><table className="min-w-full divide-y divide-gray-200 text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Address</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Used</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{addresses.map((address) => <tr key={address.id} className="hover:bg-gray-50"><td className="px-4 py-3"><AddressText address={address} /></td><td className="px-4 py-3 text-gray-700">{address.recipientName}</td><td className="px-4 py-3 capitalize">{address.kind}</td><td className="px-4 py-3">{address.usageCount}</td><td className="px-4 py-3"><div className="flex justify-end"><AddressActions address={address} onSelect={onSelect} onDelete={onDelete} onEdit={onEdit} /></div></td></tr>)}</tbody></table><button type="button" onClick={onAdd} className="m-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><Plus className="h-4 w-4" />Add address</button></div>; }

export type { AddressInput };
export const AddressBookIcon = Truck;
export const CloseIcon = X;
