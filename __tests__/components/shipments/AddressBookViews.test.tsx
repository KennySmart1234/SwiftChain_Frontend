import { fireEvent, render, screen } from '@testing-library/react';
import { AddressBookGrid, AddressBookList, AddressBookTable } from '@/components/shipments/AddressBookViews';
import type { SavedAddress } from '@/types/addressBook';

const addresses: SavedAddress[] = [
  { id: '1', label: 'Lagos Hub', recipientName: 'Ada Obi', street: '12 Marina Road', city: 'Lagos', country: 'Nigeria', kind: 'pickup', usageCount: 8, updatedAt: '2026-01-01' },
  { id: '2', label: 'Abuja Office', recipientName: 'Tunde Ali', street: '4 Airport Way', city: 'Abuja', country: 'Nigeria', kind: 'both', usageCount: 3, updatedAt: '2026-01-02' },
];
const props = () => ({ onSelect: jest.fn(), onDelete: jest.fn(), onEdit: jest.fn(), onAdd: jest.fn() });

describe('AddressBookList', () => {
  it('renders saved address labels and locations', () => { render(<AddressBookList addresses={addresses} {...props()} />); expect(screen.getByLabelText('Address book list')).toBeInTheDocument(); expect(screen.getByText('Lagos Hub')).toBeInTheDocument(); expect(screen.getByText(/12 Marina Road/)).toBeInTheDocument(); });
  it('selects an address', () => { const p = props(); render(<AddressBookList addresses={addresses} {...p} />); fireEvent.click(screen.getByRole('button', { name: 'Select Lagos Hub' })); expect(p.onSelect).toHaveBeenCalledWith(addresses[0]); });
  it('supports edit and delete', () => { const p = props(); render(<AddressBookList addresses={addresses} {...p} />); fireEvent.click(screen.getByRole('button', { name: 'Edit Lagos Hub' })); fireEvent.click(screen.getByRole('button', { name: 'Delete Lagos Hub' })); expect(p.onEdit).toHaveBeenCalled(); expect(p.onDelete).toHaveBeenCalled(); });
  it('supports adding an address', () => { const p = props(); render(<AddressBookList addresses={addresses} {...p} />); fireEvent.click(screen.getByRole('button', { name: /Add address/ })); expect(p.onAdd).toHaveBeenCalled(); });
  it('renders an empty state', () => { const p = props(); render(<AddressBookList addresses={[]} {...p} />); expect(screen.getByText('No saved addresses')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: /Add address/ })); expect(p.onAdd).toHaveBeenCalled(); });
});

describe('AddressBookGrid', () => {
  it('renders cards and map thumbnails', () => { render(<AddressBookGrid addresses={addresses} {...props()} />); expect(screen.getByLabelText('Address book grid')).toBeInTheDocument(); expect(screen.getAllByRole('button', { name: /Select/ })).toHaveLength(2); });
  it('selects and deletes from a card', () => { const p = props(); render(<AddressBookGrid addresses={addresses} {...p} />); fireEvent.click(screen.getByRole('button', { name: 'Select Abuja Office' })); fireEvent.click(screen.getByRole('button', { name: 'Delete Abuja Office' })); expect(p.onSelect).toHaveBeenCalledWith(addresses[1]); expect(p.onDelete).toHaveBeenCalledWith(addresses[1]); });
  it('renders grid empty state', () => { render(<AddressBookGrid addresses={[]} {...props()} />); expect(screen.getByText('Save a pickup or drop-off address for faster shipments.')).toBeInTheDocument(); });
  it('supports editing a card', () => { const p = props(); render(<AddressBookGrid addresses={addresses} {...p} />); fireEvent.click(screen.getByRole('button', { name: 'Edit Abuja Office' })); expect(p.onEdit).toHaveBeenCalledWith(addresses[1]); });
  it('supports adding from the grid', () => { const p = props(); render(<AddressBookGrid addresses={addresses} {...p} />); fireEvent.click(screen.getByRole('button', { name: /Add address/ })); expect(p.onAdd).toHaveBeenCalled(); });
});

describe('AddressBookTable', () => {
  it('renders sortable-friendly column headings and rows', () => { render(<AddressBookTable addresses={addresses} {...props()} />); expect(screen.getByLabelText('Address book table')).toBeInTheDocument(); expect(screen.getByText('Recipient')).toBeInTheDocument(); expect(screen.getByText('Used')).toBeInTheDocument(); expect(screen.getByText('Tunde Ali')).toBeInTheDocument(); });
  it('selects a row', () => { const p = props(); render(<AddressBookTable addresses={addresses} {...p} />); fireEvent.click(screen.getByRole('button', { name: 'Select Lagos Hub' })); expect(p.onSelect).toHaveBeenCalledWith(addresses[0]); });
  it('supports row edit and delete', () => { const p = props(); render(<AddressBookTable addresses={addresses} {...p} />); fireEvent.click(screen.getByRole('button', { name: 'Edit Abuja Office' })); fireEvent.click(screen.getByRole('button', { name: 'Delete Abuja Office' })); expect(p.onEdit).toHaveBeenCalledWith(addresses[1]); expect(p.onDelete).toHaveBeenCalledWith(addresses[1]); });
  it('renders table empty state', () => { render(<AddressBookTable addresses={[]} {...props()} />); expect(screen.getByText('No saved addresses')).toBeInTheDocument(); });
  it('adds from the table footer', () => { const p = props(); render(<AddressBookTable addresses={addresses} {...p} />); fireEvent.click(screen.getByRole('button', { name: /Add address/ })); expect(p.onAdd).toHaveBeenCalled(); });
});
