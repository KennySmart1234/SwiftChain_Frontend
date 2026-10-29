import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditTrailGrid } from '@/components/dashboard/AuditTrailGrid';
import { useAuditTrailGrid, type UseAuditTrailGridResult } from '@/hooks/useAuditTrailGrid';
import type { AuditEvent } from '@/services/auditService';

jest.mock('@/hooks/useAuditTrailGrid', () => ({
  ...jest.requireActual('@/hooks/useAuditTrailGrid'),
  useAuditTrailGrid: jest.fn(),
}));
jest.mock('@/lib/api', () => ({ __esModule: true, default: {} }));

const mockedUseAuditTrailGrid = useAuditTrailGrid as jest.MockedFunction<typeof useAuditTrailGrid>;

const events: AuditEvent[] = [
  {
    eventId: 'evt-001',
    eventType: 'escrow-funded',
    description: '',
    timestamp: '2026-09-27T08:00:00Z',
    actorId: 'customer-1',
    actorAddress: 'GCUSTOMERADDRESS00000000000000000000000000000000000001',
    status: 'confirmed',
  },
  {
    eventId: 'evt-002',
    eventType: 'dispute-raised',
    description: '',
    timestamp: '2026-09-29T08:00:00Z',
    actorId: 'driver-7',
    actorAddress: 'GDRIVERADDRESS000000000000000000000000000000000000007',
    status: 'pending',
  },
  {
    eventId: 'evt-003',
    eventType: 'escrow-released',
    description: '',
    timestamp: '2026-09-28T08:00:00Z',
    actorId: 'admin-2',
    actorAddress: 'GADMINADDRESS0000000000000000000000000000000000000002',
    status: 'failed',
  },
];

function setup(overrides: Partial<UseAuditTrailGridResult> = {}) {
  const state: UseAuditTrailGridResult = {
    events,
    totalCount: 120,
    isLoading: false,
    isFetching: false,
    error: null,
    pageIndex: 1,
    pageSize: 25,
    hasNextPage: true,
    hasPreviousPage: false,
    nextPage: jest.fn(),
    previousPage: jest.fn(),
    setPageSize: jest.fn(),
    density: 'regular',
    setDensity: jest.fn(),
    refresh: jest.fn(),
    ...overrides,
  };
  mockedUseAuditTrailGrid.mockReturnValue(state);
  return state;
}

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
const firstColumn = () => bodyRows().map((row) => within(row).getAllByRole('cell')[0].textContent);

describe('AuditTrailGrid', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all five columns and defaults to newest first', () => {
    setup();
    render(<AuditTrailGrid />);

    for (const name of ['Event ID', 'Type', 'Timestamp', 'Actor', 'Status']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(firstColumn()).toEqual(['evt-002', 'evt-003', 'evt-001']);
    expect(screen.getByRole('columnheader', { name: /timestamp/i })).toHaveAttribute('aria-sort', 'descending');
  });

  it('sorts by a column when its header is clicked', async () => {
    setup();
    const user = userEvent.setup();
    render(<AuditTrailGrid />);

    await user.click(screen.getByRole('button', { name: /event id/i }));
    expect(firstColumn()).toEqual(['evt-001', 'evt-002', 'evt-003']);
    expect(screen.getByRole('columnheader', { name: /event id/i })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: /event id/i }));
    expect(firstColumn()).toEqual(['evt-003', 'evt-002', 'evt-001']);
  });

  it('filters rows across columns as the user types', async () => {
    setup();
    const user = userEvent.setup();
    render(<AuditTrailGrid />);

    const search = screen.getByLabelText(/search audit events/i);
    await user.type(search, 'driver-7');
    expect(firstColumn()).toEqual(['evt-002']);
    expect(screen.getByText(/showing 1 of 3 on this page/i)).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'escrow released');
    expect(firstColumn()).toEqual(['evt-003']);

    await user.clear(search);
    await user.type(search, 'nothing-matches');
    expect(screen.getByText('No events match your search.')).toBeInTheDocument();
  });

  it('hides and shows columns from the column menu', async () => {
    setup();
    const user = userEvent.setup();
    render(<AuditTrailGrid />);

    await user.click(screen.getByText('Columns'));
    await user.click(screen.getByRole('checkbox', { name: 'Actor' }));
    expect(screen.queryByRole('columnheader', { name: /actor/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Actor' }));
    expect(screen.getByRole('columnheader', { name: /actor/i })).toBeInTheDocument();
  });

  it('changes density through the hook', async () => {
    const state = setup();
    const user = userEvent.setup();
    render(<AuditTrailGrid />);

    expect(screen.getByRole('button', { name: 'Regular' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Compact' }));
    expect(state.setDensity).toHaveBeenCalledWith('compact');
  });

  it('shows the row count and drives cursor pagination', async () => {
    const state = setup({ pageIndex: 2, hasPreviousPage: true });
    const user = userEvent.setup();
    render(<AuditTrailGrid />);

    expect(screen.getByText(/120 total events/)).toBeInTheDocument();
    expect(screen.getByText('Page 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await user.click(screen.getByRole('button', { name: /previous page/i }));
    await user.selectOptions(screen.getByLabelText(/rows per page/i), '50');

    expect(state.nextPage).toHaveBeenCalled();
    expect(state.previousPage).toHaveBeenCalled();
    expect(state.setPageSize).toHaveBeenCalledWith(50);
  });

  it('disables pagination buttons at the boundaries', () => {
    setup({ hasNextPage: false, hasPreviousPage: false });
    render(<AuditTrailGrid />);

    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
  });

  it('shows an error with a retry action', async () => {
    const state = setup({ events: [], error: 'Request failed with status code 503' });
    const user = userEvent.setup();
    render(<AuditTrailGrid />);

    expect(screen.getByRole('alert')).toHaveTextContent('Request failed with status code 503');
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(state.refresh).toHaveBeenCalled();
  });

  it('shows an empty state when there are no events', () => {
    setup({ events: [], totalCount: 0, hasNextPage: false });
    render(<AuditTrailGrid />);

    expect(screen.getByText('No audit events recorded yet.')).toBeInTheDocument();
  });
});
