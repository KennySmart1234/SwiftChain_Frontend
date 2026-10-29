import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefundListView } from '@/components/admin/refunds/RefundListView';
import { RefundGridView } from '@/components/admin/refunds/RefundGridView';
import { RefundTableView } from '@/components/admin/refunds/RefundTableView';
import { useAdminRefunds, type UseAdminRefundsResult } from '@/hooks/useAdminRefunds';
import type { RefundRecord } from '@/services/adminRefundService';

jest.mock('@/hooks/useAdminRefunds');

const mockedHook = useAdminRefunds as jest.MockedFunction<typeof useAdminRefunds>;

const makeRefund = (n: number, overrides: Partial<RefundRecord> = {}): RefundRecord => ({
  id: `RF-${n}`,
  shipmentId: `SH-${n}`,
  customerId: `CU-${n}`,
  amount: 10 * n,
  currency: 'XLM',
  status: 'pending',
  reason: `Reason ${n}`,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-02T10:00:00.000Z',
  ...overrides,
});

const baseResult = (refunds: RefundRecord[], overrides: Partial<UseAdminRefundsResult> = {}) =>
  ({
    refunds,
    pagination: { nextCursor: null, total: refunds.length, limit: 20 },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    error: null,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    bulkMarkReviewed: jest.fn().mockResolvedValue({ successCount: 1, errorCount: 0 }),
    isBulkLoading: false,
    exportSelectedToCsv: jest.fn().mockReturnValue(1),
    ...overrides,
  }) as UseAdminRefundsResult;

const refunds = [
  makeRefund(1),
  makeRefund(2, { status: 'approved' }),
  makeRefund(3, { status: 'rejected' }),
];

beforeAll(() => {
  // jsdom has no layout; give the virtualized scroll container a size.
  // Different virtual-core versions measure offset* or client* sizes; mock both.
  for (const prop of ['offsetHeight', 'clientHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 400 });
  }
  for (const prop of ['offsetWidth', 'clientWidth'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 800 });
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedHook.mockReturnValue(baseResult(refunds));
});

const views = [
  ['List', RefundListView],
  ['Grid', RefundGridView],
  ['Table', RefundTableView],
] as const;

describe('List View', () => {
  it('renders refund cards with correct metadata', () => {
    render(<RefundListView />);
    expect(screen.getByText('RF-1')).toBeInTheDocument();
    expect(screen.getByText('10.00 XLM')).toBeInTheDocument();
    expect(screen.getByText('Shipment SH-1')).toBeInTheDocument();
    expect(screen.getByText('Reason 1')).toBeInTheDocument();
    const card = screen.getByText('RF-2').closest('li') as HTMLElement;
    expect(within(card).getByText('approved')).toBeInTheDocument();
  });

  it('calls onSelectRefund when a card is clicked', async () => {
    const onSelect = jest.fn();
    render(<RefundListView onSelectRefund={onSelect} />);
    await userEvent.click(screen.getByText('Reason 2'));
    expect(onSelect).toHaveBeenCalledWith('RF-2');
  });

  it('shows a load more button when another page exists and fetches it', async () => {
    const result = baseResult(refunds, { hasNextPage: true });
    mockedHook.mockReturnValue(result);
    render(<RefundListView />);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(result.fetchNextPage).toHaveBeenCalled();
  });
});

describe('Grid View', () => {
  it('renders a card per refund', () => {
    render(<RefundGridView />);
    expect(screen.getByRole('button', { name: 'RF-1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RF-3' })).toBeInTheDocument();
  });

  it('hides and restores a column via the visibility toggle', async () => {
    render(<RefundGridView />);
    expect(screen.getAllByText('Reason')).toHaveLength(4); // toggle label + 3 cards
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reason' }));
    expect(screen.getAllByText('Reason')).toHaveLength(1);
    expect(screen.queryByText('Reason 1')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reason' }));
    expect(screen.getByText('Reason 1')).toBeInTheDocument();
  });

  it('keeps other columns visible when one is hidden', async () => {
    render(<RefundGridView />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Customer' }));
    expect(screen.queryByText('CU-1')).not.toBeInTheDocument();
    expect(screen.getByText('SH-1')).toBeInTheDocument();
  });
});

describe('Table View', () => {
  it('renders virtualized rows with cell data', () => {
    render(<RefundTableView />);
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1); // header + data rows
    expect(screen.getByText('SH-1')).toBeInTheDocument();
  });

  it('renders only a window of rows for large datasets', () => {
    const many = Array.from({ length: 500 }, (_, i) => makeRefund(i + 1));
    mockedHook.mockReturnValue(baseResult(many));
    render(<RefundTableView />);
    const dataRows = screen.getAllByRole('row').filter((r) => r.hasAttribute('data-index'));
    expect(dataRows.length).toBeGreaterThan(0);
    expect(dataRows.length).toBeLessThan(100);
  });

  it('selects all rows from the header checkbox', async () => {
    render(<RefundTableView />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all refunds' }));
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('calls onSelectRefund when a row is clicked but not when its checkbox is', async () => {
    const onSelect = jest.fn();
    render(<RefundTableView onSelectRefund={onSelect} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select refund RF-1' }));
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText('SH-2'));
    expect(onSelect).toHaveBeenCalledWith('RF-2');
  });
});

describe.each(views)('%s View shared behavior', (_name, View) => {
  it('passes the chosen status filter to the data hook', async () => {
    render(<View />);
    expect(mockedHook).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'all' }));
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'approved');
    expect(mockedHook).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'approved' }));
  });

  it('passes the search term to the data hook', async () => {
    render(<View />);
    await userEvent.type(screen.getByLabelText('Search refunds'), 'abc');
    expect(mockedHook).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'abc' }));
  });

  it('shows the empty state when there are no refunds', () => {
    mockedHook.mockReturnValue(baseResult([]));
    render(<View />);
    expect(screen.getByText('No refunds found')).toBeInTheDocument();
  });

  it('shows the loading state without the empty state', () => {
    mockedHook.mockReturnValue(baseResult([], { isLoading: true }));
    render(<View />);
    expect(screen.getByText('Loading refunds...')).toBeInTheDocument();
    expect(screen.queryByText('No refunds found')).not.toBeInTheDocument();
  });

  it('shows an error message when loading fails', () => {
    mockedHook.mockReturnValue(baseResult([], { error: 'Network down' }));
    render(<View />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network down');
  });

  it('disables bulk actions until a refund is selected', () => {
    render(<View />);
    expect(screen.getByRole('button', { name: 'Mark reviewed' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('selects a refund and runs bulk mark reviewed with its id', async () => {
    const result = baseResult(refunds);
    mockedHook.mockReturnValue(result);
    render(<View />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select refund RF-2' }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }));
    expect(result.bulkMarkReviewed).toHaveBeenCalledWith(['RF-2']);
    expect(await screen.findByText('0 selected')).toBeInTheDocument();
  });

  it('exports only the selected refunds to CSV', async () => {
    const result = baseResult(refunds);
    mockedHook.mockReturnValue(result);
    render(<View />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select refund RF-1' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select refund RF-3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(result.exportSelectedToCsv).toHaveBeenCalledWith(['RF-1', 'RF-3']);
  });

  it('clears the selection when the status filter changes', async () => {
    render(<View />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select refund RF-1' }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'pending');
    expect(screen.getByText('0 selected')).toBeInTheDocument();
  });

  it('renders every status filter option', () => {
    render(<View />);
    const options = within(screen.getByLabelText('Filter by status')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'all',
      'pending',
      'reviewed',
      'approved',
      'rejected',
      'completed',
    ]);
  });
});
