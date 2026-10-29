import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { AuditTrailList } from '@/components/dashboard/AuditTrailList';
import { auditTrailService } from '@/services/auditTrailService';
import { auditTrailEventsFixture } from '@/hooks/__tests__/fixtures/auditTrailApiResponses';

// Only the network boundary is mocked; useAuditTrail runs for real so these
// tests exercise the Component -> Hook -> Service path.
jest.mock('@/services/auditTrailService', () => ({
  auditTrailService: { getDeliveryEvents: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const mockGetEvents = auditTrailService.getDeliveryEvents as jest.Mock;
const writeText = jest.fn();

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

async function renderLoaded() {
  const utils = renderWithClient(<AuditTrailList deliveryId="del-42" />);
  const list = await screen.findByRole('list', { name: /audit trail events/i });
  return { ...utils, list };
}

const cardTitles = (list: HTMLElement) =>
  within(list)
    .getAllByRole('article')
    .map((card) => within(card).getByRole('heading').textContent);

describe('AuditTrailList', () => {
  beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    mockGetEvents.mockResolvedValue(auditTrailEventsFixture);
  });

  describe('chronological ordering', () => {
    it('renders events newest first', async () => {
      const { list } = await renderLoaded();

      expect(cardTitles(list)).toEqual(['Escrow Funded', 'Driver Assigned', 'Contract Created']);
    });

    it('reverses to oldest first from the sort toggle', async () => {
      const { list } = await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: /sort order: newest first/i }));

      expect(cardTitles(list)).toEqual(['Contract Created', 'Driver Assigned', 'Escrow Funded']);
      expect(screen.getByRole('button', { name: /sort order: oldest first/i })).toBeInTheDocument();
    });
  });

  describe('event cards', () => {
    it('shows event type, timestamp, actor and metadata', async () => {
      const { list } = await renderLoaded();
      const card = within(list).getAllByRole('article')[0];

      expect(within(card).getByRole('heading')).toHaveTextContent('Escrow Funded');
      expect(card.querySelector('time')).toHaveAttribute('dateTime', '2026-09-20T11:30:00.000Z');
      expect(within(card).getByText('Acme Imports')).toBeInTheDocument();
      expect(within(card).getByTitle(auditTrailEventsFixture[1].actor.address)).toBeInTheDocument();
      expect(within(card).getByText('customer')).toBeInTheDocument();
      expect(within(card).getByText('51,235,002')).toBeInTheDocument();

      const metadata = within(card).getByLabelText('Event metadata');
      expect(within(metadata).getByText('Amount')).toBeInTheDocument();
      expect(within(metadata).getByText('1500')).toBeInTheDocument();
      expect(within(metadata).getByText('Insured')).toBeInTheDocument();
      expect(within(metadata).getByText('Yes')).toBeInTheDocument();
    });

    it('omits the metadata block when an event has none', async () => {
      const { list } = await renderLoaded();
      const contractCard = within(list).getAllByRole('article')[2];

      expect(within(contractCard).queryByLabelText('Event metadata')).not.toBeInTheDocument();
    });

    it('copies the event id to the clipboard', async () => {
      await renderLoaded();

      const button = screen.getByRole('button', { name: 'Copy event ID evt-0003' });
      await act(async () => {
        fireEvent.click(button);
      });

      expect(writeText).toHaveBeenCalledWith('evt-0003');
      expect(button).toHaveTextContent('Copied');
    });
  });

  describe('loading, empty and error states', () => {
    it('shows a skeleton card per placeholder while loading', async () => {
      let resolve: (_value: unknown) => void = () => undefined;
      mockGetEvents.mockReturnValue(new Promise((r) => (resolve = r)));
      renderWithClient(<AuditTrailList deliveryId="del-42" />);

      expect(screen.getByRole('status')).toHaveTextContent('Loading audit events');
      const skeleton = screen.getByTestId('audit-trail-skeleton');
      expect(skeleton.querySelectorAll('li')).toHaveLength(3);

      await act(async () => {
        resolve(auditTrailEventsFixture);
      });
      await waitFor(() =>
        expect(screen.queryByTestId('audit-trail-skeleton')).not.toBeInTheDocument(),
      );
      expect(screen.getAllByRole('article')).toHaveLength(3);
    });

    it('shows an empty state with a retry that refetches', async () => {
      mockGetEvents.mockResolvedValueOnce([]);
      renderWithClient(<AuditTrailList deliveryId="del-42" />);

      expect(await screen.findByText('No events recorded yet')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(await screen.findByRole('list', { name: /audit trail events/i })).toBeInTheDocument();
      expect(mockGetEvents).toHaveBeenCalledTimes(2);
    });

    it('shows the error with a retry option', async () => {
      mockGetEvents.mockRejectedValueOnce(new Error('Indexer unavailable'));
      renderWithClient(<AuditTrailList deliveryId="del-42" />);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Indexer unavailable');

      fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      expect(screen.getAllByRole('article')).toHaveLength(3);
    });

    it('prompts for a delivery when none is selected', () => {
      renderWithClient(<AuditTrailList deliveryId={null} />);

      expect(screen.getByText('Select a delivery to view its audit trail.')).toBeInTheDocument();
      expect(mockGetEvents).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('makes every card focusable', async () => {
      const { list } = await renderLoaded();

      within(list)
        .getAllByRole('article')
        .forEach((card) => expect(card).toHaveAttribute('tabIndex', '0'));
    });

    it('moves focus with Arrow keys, Home and End', async () => {
      const { list } = await renderLoaded();
      const cards = within(list).getAllByRole('article');

      cards[0].focus();
      fireEvent.keyDown(cards[0], { key: 'ArrowDown' });
      expect(cards[1]).toHaveFocus();

      fireEvent.keyDown(cards[1], { key: 'End' });
      expect(cards[2]).toHaveFocus();

      fireEvent.keyDown(cards[2], { key: 'ArrowDown' });
      expect(cards[2]).toHaveFocus();

      fireEvent.keyDown(cards[2], { key: 'ArrowUp' });
      expect(cards[1]).toHaveFocus();

      fireEvent.keyDown(cards[1], { key: 'Home' });
      expect(cards[0]).toHaveFocus();
    });

    it('leaves arrow keys alone when focus is on a button inside a card', async () => {
      const { list } = await renderLoaded();
      const copy = screen.getByRole('button', { name: 'Copy event ID evt-0003' });

      copy.focus();
      fireEvent.keyDown(copy, { key: 'ArrowDown' });

      expect(copy).toHaveFocus();
      expect(within(list).getAllByRole('article')[1]).not.toHaveFocus();
    });
  });
});
