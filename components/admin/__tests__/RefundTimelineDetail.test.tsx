import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefundTimelineDetail } from '@/components/admin/RefundTimelineDetail';
import { adminRefundService } from '@/services/adminRefundService';

jest.mock('@/services/adminRefundService');
const svc = adminRefundService as jest.Mocked<typeof adminRefundService>;

const events = [
  {
    eventId: 'E2',
    action: 'refund-approved',
    description: 'Refund approved',
    timestamp: '2026-03-02T10:00:00Z',
    actorId: 'ADMIN-1',
    actorRole: 'Admin',
    transactionHash: 'TXHASH123',
  },
  {
    eventId: 'E1',
    action: 'refund-requested',
    description: 'Refund requested',
    timestamp: '2026-03-01T10:00:00Z',
    actorId: 'CUST-1',
  },
];

describe('RefundTimelineDetail', () => {
  let writeText: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('prompts to select a refund when none is chosen', () => {
    render(<RefundTimelineDetail refundId={null} />);
    expect(screen.getByText('Select a refund to view its timeline')).toBeInTheDocument();
    expect(svc.getRefundTimeline).not.toHaveBeenCalled();
  });

  it('renders events in chronological order with actors', async () => {
    svc.getRefundTimeline.mockResolvedValue(events);
    render(<RefundTimelineDetail refundId="RF-1" />);
    await screen.findByText('Refund requested');
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Refund requested', 'Refund approved']);
    expect(screen.getByText('CUST-1')).toBeInTheDocument();
    expect(screen.getByText('(Admin)')).toBeInTheDocument();
  });

  it('shows the transaction hash only for blockchain events', async () => {
    svc.getRefundTimeline.mockResolvedValue(events);
    render(<RefundTimelineDetail refundId="RF-1" />);
    await screen.findByText('TXHASH123');
    expect(screen.getAllByText('Tx hash:')).toHaveLength(1);
  });

  it('copies identifiers to the clipboard on click', async () => {
    svc.getRefundTimeline.mockResolvedValue(events);
    render(<RefundTimelineDetail refundId="RF-1" />);
    await userEvent.click(await screen.findByRole('button', { name: /Copy transaction hash/ }));
    expect(writeText).toHaveBeenCalledWith('TXHASH123');
    await userEvent.click(screen.getByRole('button', { name: /Copy actor ID CUST-1/ }));
    expect(writeText).toHaveBeenCalledWith('CUST-1');
    await userEvent.click(screen.getByRole('button', { name: /Copy event ID E2/ }));
    expect(writeText).toHaveBeenCalledWith('E2');
  });

  it('shows an error when loading fails', async () => {
    svc.getRefundTimeline.mockRejectedValue(new Error('timeline down'));
    render(<RefundTimelineDetail refundId="RF-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('timeline down');
  });

  it('shows an empty state when the refund has no events', async () => {
    svc.getRefundTimeline.mockResolvedValue([]);
    render(<RefundTimelineDetail refundId="RF-1" />);
    expect(await screen.findByText('No refund events yet')).toBeInTheDocument();
  });

  it('prints the timeline from the print button', async () => {
    svc.getRefundTimeline.mockResolvedValue(events);
    const print = jest.spyOn(window, 'print').mockImplementation(() => {});
    render(<RefundTimelineDetail refundId="RF-1" view="table" />);
    await waitFor(() => expect(svc.getRefundTimeline).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'Print timeline' }));
    expect(print).toHaveBeenCalled();
    expect(screen.getByLabelText('Refund timeline')).toHaveAttribute('data-view', 'table');
    print.mockRestore();
  });
});
