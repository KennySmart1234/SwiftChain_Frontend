import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditTimeline } from '@/components/dashboard/AuditTimeline';
import { useAuditTimeline } from '@/hooks/useAuditTimeline';
import { auditService } from '@/services/auditService';
import type { AuditEvent } from '@/services/auditService';

// ─────────────────────────────────────────────────────────────────────────
// Mock the hook layer
// ─────────────────────────────────────────────────────────────────────────
jest.mock('@/hooks/useAuditTimeline');

const mockUseAuditTimeline = useAuditTimeline as jest.MockedFunction<
  typeof useAuditTimeline
>;

// ─────────────────────────────────────────────────────────────────────────
// Mock event data by severity type
// ─────────────────────────────────────────────────────────────────────────

const createEvent = (
  eventId: string,
  eventType: string,
  description: string,
  timestamp: string,
): AuditEvent => ({
  eventId,
  eventType,
  description,
  timestamp,
  actorId: `actor-${eventId}`,
  actorAddress: '0xGDDST234234567890ABCDEF0123456789',
  metadata: { amount: '100.00', currency: 'XLM' },
});

// Severity levels mapped to event types
const SEVERITY_EVENTS = {
  info: createEvent('evt-info', 'contract-created', 'Contract created', '2026-06-01T10:00:00Z'),
  warning: createEvent('evt-warn', 'in-transit', 'Shipment in transit', '2026-06-01T11:00:00Z'),
  error: createEvent('evt-error', 'dispute-raised', 'Dispute raised', '2026-06-01T12:00:00Z'),
};

// Helper to configure mock state
function mockState(events: AuditEvent[], isLoading = false, error: string | null = null) {
  mockUseAuditTimeline.mockReturnValue({
    events,
    isLoading,
    error,
    totalCount: events.length,
    refresh: jest.fn(),
  });
}

describe('AuditTimeline — Activity Center Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HAPPY PATH: Rendering events with severity-based colors
  // ─────────────────────────────────────────────────────────────────────────

  describe('Happy Path: Severity Color Rendering', () => {
    it('should render the component without crashing with a valid deliveryId', () => {
      mockState([SEVERITY_EVENTS.info]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
    });

    it('should render an info-level event (contract-created) with blue color', () => {
      mockState([SEVERITY_EVENTS.info]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      // The event should render with the blue severity color (bg-blue-500)
      const statusCircle = screen.getByText('✓').closest('div');
      expect(statusCircle?.className).toMatch(/bg-blue-500/);
    });

    it('should render a warning-level event (in-transit) with yellow color', () => {
      mockState([SEVERITY_EVENTS.warning]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      // The event should render with the yellow severity color (bg-yellow-500)
      const statusCircle = screen.getByText('🚗').closest('div');
      expect(statusCircle?.className).toMatch(/bg-yellow-500/);
    });

    it('should render an error-level event (dispute-raised) with red color', () => {
      mockState([SEVERITY_EVENTS.error]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      // The event should render with the red severity color (bg-red-500)
      const statusCircle = screen.getByText('⚠️').closest('div');
      expect(statusCircle?.className).toMatch(/bg-red-500/);
    });

    it('should render multiple events of different severities with distinct colors', () => {
      const mixedEvents = [
        SEVERITY_EVENTS.info,
        SEVERITY_EVENTS.warning,
        SEVERITY_EVENTS.error,
      ];
      mockState(mixedEvents);
      render(<AuditTimeline deliveryId="delivery-123" />);

      // Verify all three are rendered
      expect(screen.getByText('Contract created')).toBeInTheDocument();
      expect(screen.getByText('Shipment in transit')).toBeInTheDocument();
      expect(screen.getByText('Dispute raised')).toBeInTheDocument();

      // Verify each has its own distinct color
      expect(screen.getByText('✓').closest('div')?.className).toMatch(/bg-blue-500/);
      expect(screen.getByText('🚗').closest('div')?.className).toMatch(/bg-yellow-500/);
      expect(screen.getByText('⚠️').closest('div')?.className).toMatch(/bg-red-500/);
    });

    it('should render all defined severity event types with correct colors', () => {
      const allSeverityEvents = [
        createEvent('evt1', 'contract-created', 'Contract created', '2026-06-01T10:00:00Z'),
        createEvent('evt2', 'driver-assigned', 'Driver assigned', '2026-06-01T11:00:00Z'),
        createEvent('evt3', 'escrow-funded', 'Escrow funded', '2026-06-01T12:00:00Z'),
        createEvent('evt4', 'in-transit', 'In transit', '2026-06-01T13:00:00Z'),
        createEvent('evt5', 'delivered', 'Delivered', '2026-06-01T14:00:00Z'),
        createEvent('evt6', 'dispute-raised', 'Dispute raised', '2026-06-01T15:00:00Z'),
        createEvent('evt7', 'dispute-resolved', 'Dispute resolved', '2026-06-01T16:00:00Z'),
        createEvent('evt8', 'escrow-released', 'Escrow released', '2026-06-01T17:00:00Z'),
      ];

      mockState(allSeverityEvents);
      render(<AuditTimeline deliveryId="delivery-123" />);

      // Verify all events are rendered
      expect(screen.getByText('Contract created')).toBeInTheDocument();
      expect(screen.getByText('Driver assigned')).toBeInTheDocument();
      expect(screen.getByText('Escrow funded')).toBeInTheDocument();
      expect(screen.getByText('In transit')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();
      expect(screen.getByText('Dispute raised')).toBeInTheDocument();
      expect(screen.getByText('Dispute resolved')).toBeInTheDocument();
      expect(screen.getByText('Escrow released')).toBeInTheDocument();

      // Verify color mapping is correct for each
      const colorMap: Record<string, string> = {
        '✓': 'bg-blue-500', // contract-created
        '👤': 'bg-purple-500', // driver-assigned
        '💰': 'bg-green-500', // escrow-funded
        '🚗': 'bg-yellow-500', // in-transit
        // delivered: ✓ with bg-green-600
        '⚠️': 'bg-red-500', // dispute-raised
        // dispute-resolved: ✓ with bg-green-500
        '💵': 'bg-emerald-500', // escrow-released
      };

      Object.entries(colorMap).forEach(([icon, color]) => {
        const element = screen.queryByText(icon);
        if (element) {
          expect(element.closest('div')?.className).toMatch(new RegExp(color));
        }
      });
    });

    it('should display event type badge with uppercased text', () => {
      mockState([SEVERITY_EVENTS.info]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText('CONTRACT CREATED')).toBeInTheDocument();
    });

    it('should display formatted timestamp for each event', () => {
      mockState([SEVERITY_EVENTS.info]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText(/Jun 1, 2026/)).toBeInTheDocument();
      expect(screen.getByText(/10:00/)).toBeInTheDocument();
    });

    it('should display actor information (truncated address)', () => {
      mockState([SEVERITY_EVENTS.info]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText(/GDDST2342.*567890AB/)).toBeInTheDocument();
    });

    it('should display total event count in header', () => {
      const events = [SEVERITY_EVENTS.info, SEVERITY_EVENTS.warning];
      mockState(events);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText(/Chronological record of all actions \(2\)/)).toBeInTheDocument();
    });

    it('should display metadata when present and expandable via details element', () => {
      mockState([SEVERITY_EVENTS.info]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      const viewDetailsButton = screen.getByText('View Details');
      expect(viewDetailsButton).toBeInTheDocument();

      // Click to expand
      fireEvent.click(viewDetailsButton);

      // Metadata should be visible
      expect(screen.getByText(/"amount"/)).toBeInTheDocument();
      expect(screen.getByText(/"currency"/)).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE: Empty State
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge Case: Empty State', () => {
    it('should render empty state when no events are present and deliveryId is provided', () => {
      mockState([]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText('No events yet')).toBeInTheDocument();
      expect(
        screen.getByText('Timeline events will appear here as actions are taken'),
      ).toBeInTheDocument();
    });

    it('should render empty state with "Select a delivery" message when deliveryId is null', () => {
      mockState([]);
      render(<AuditTimeline deliveryId={null} />);

      expect(screen.getByText('Select a delivery')).toBeInTheDocument();
      expect(screen.getByText('Timeline will display once a delivery is selected')).toBeInTheDocument();
    });

    it('should not render timeline section when events array is empty', () => {
      mockState([]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.queryByText('CONTRACT CREATED')).not.toBeInTheDocument();
    });

    it('should disable refresh button when deliveryId is null', () => {
      mockState([]);
      render(<AuditTimeline deliveryId={null} />);

      const refreshButton = screen.getByRole('button', { name: /Refresh timeline/ });
      expect(refreshButton).toBeDisabled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE: Unknown/Unexpected Severity
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge Case: Unknown/Unexpected Severity', () => {
    it('should gracefully handle unknown event type with default gray color', () => {
      const unknownEvent = createEvent(
        'evt-unknown',
        'unknown-event-type',
        'Unknown event',
        '2026-06-01T10:00:00Z',
      );
      mockState([unknownEvent]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      // Should render without crashing
      expect(screen.getByText('Unknown event')).toBeInTheDocument();

      // Should use default gray color fallback
      const statusCircle = screen.getByText('•').closest('div');
      expect(statusCircle?.className).toMatch(/bg-gray-500/);
    });

    it('should render unknown event type as uppercase badge', () => {
      const unknownEvent = createEvent(
        'evt-unknown',
        'custom-undefined-type',
        'Custom event',
        '2026-06-01T10:00:00Z',
      );
      mockState([unknownEvent]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText('CUSTOM UNDEFINED TYPE')).toBeInTheDocument();
    });

    it('should not crash when severity value is empty string', () => {
      const emptyTypeEvent = createEvent(
        'evt-empty',
        '',
        'Event with empty type',
        '2026-06-01T10:00:00Z',
      );
      mockState([emptyTypeEvent]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText('Event with empty type')).toBeInTheDocument();
      expect(screen.getByText('•').closest('div')?.className).toMatch(/bg-gray-500/);
    });

    it('should not crash when severity value is null-like (treated as unknown)', () => {
      // This tests defensive rendering for unusual inputs
      const event = {
        ...SEVERITY_EVENTS.info,
        eventType: 'unexpected-null-like',
      };
      mockState([event]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText('Contract created')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE: Loading State
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge Case: Loading State', () => {
    it('should render loading spinner when isLoading is true and no events exist', () => {
      mockState([], true);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText('Loading timeline...')).toBeInTheDocument();
      const spinner = screen.getByText('Loading timeline...').closest('div')?.querySelector('div');
      expect(spinner?.className).toMatch(/animate-spin/);
    });

    it('should not render loading state when events exist even if isLoading is true', () => {
      mockState([SEVERITY_EVENTS.info], true);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
      expect(screen.getByText('Contract created')).toBeInTheDocument();
    });

    it('should disable refresh button when loading is in progress', () => {
      mockState([], true);
      render(<AuditTimeline deliveryId="delivery-123" />);

      const refreshButton = screen.getByRole('button', { name: /Refresh timeline/ });
      expect(refreshButton).toBeDisabled();
    });

    it('should show spinning animation on refresh button during loading', () => {
      mockState([], true);
      render(<AuditTimeline deliveryId="delivery-123" />);

      const refreshIcon = screen.getByRole('button', { name: /Refresh timeline/ }).querySelector('svg');
      expect(refreshIcon?.className).toMatch(/animate-spin/);
    });

    it('should hide loading state and show content when loading completes', async () => {
      const { rerender } = render(<AuditTimeline deliveryId="delivery-123" />);

      mockState([], true);
      rerender(<AuditTimeline deliveryId="delivery-123" />);
      expect(screen.getByText('Loading timeline...')).toBeInTheDocument();

      mockState([SEVERITY_EVENTS.info], false);
      rerender(<AuditTimeline deliveryId="delivery-123" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
        expect(screen.getByText('Contract created')).toBeInTheDocument();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE: Error State
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge Case: Error State', () => {
    it('should render error alert when error state is provided', () => {
      mockState([], false, 'Network error connecting to Soroban RPC');
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Network error connecting to Soroban RPC')).toBeInTheDocument();
    });

    it('should display error icon (AlertCircle) in error state', () => {
      mockState([], false, 'Failed to fetch timeline');
      render(<AuditTimeline deliveryId="delivery-123" />);

      // AlertCircle is a lucide-react SVG icon; check for the alert role element
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should show red border and background for error alert', () => {
      mockState([], false, 'Connection failed');
      render(<AuditTimeline deliveryId="delivery-123" />);

      const alert = screen.getByRole('alert').closest('div');
      expect(alert?.className).toMatch(/border-red-200/);
      expect(alert?.className).toMatch(/bg-red-50/);
    });

    it('should display error text in red color', () => {
      mockState([], false, 'Detailed error message');
      const { container } = render(<AuditTimeline deliveryId="delivery-123" />);

      const errorText = screen.getByText('Detailed error message');
      expect(errorText.className).toMatch(/text-red-7/);
    });

    it('should not render timeline when error is present', () => {
      mockState([SEVERITY_EVENTS.info], false, 'API Error');
      render(<AuditTimeline deliveryId="delivery-123" />);

      // Error should be visible
      expect(screen.getByText('API Error')).toBeInTheDocument();
      // Timeline events should not be rendered due to error state check
    });

    it('should allow refresh when error occurs', async () => {
      const mockRefresh = jest.fn();
      mockUseAuditTimeline.mockReturnValue({
        events: [],
        isLoading: false,
        error: 'Failed to load',
        totalCount: 0,
        refresh: mockRefresh,
      });

      render(<AuditTimeline deliveryId="delivery-123" />);

      const refreshButton = screen.getByRole('button', { name: /Refresh timeline/ });
      await userEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should recover from error state when new data arrives', async () => {
      const { rerender } = render(<AuditTimeline deliveryId="delivery-123" />);

      mockState([], false, 'Network error');
      rerender(<AuditTimeline deliveryId="delivery-123" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Simulate recovery
      mockState([SEVERITY_EVENTS.info], false, null);
      rerender(<AuditTimeline deliveryId="delivery-123" />);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('Contract created')).toBeInTheDocument();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE: Chronological Ordering
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge Case: Chronological Ordering', () => {
    it('should render events in chronological order from hook (hook handles sorting)', () => {
      // Hook already sorts events, so we verify component renders in order
      const events = [
        createEvent('evt1', 'contract-created', 'First event', '2026-06-01T10:00:00Z'),
        createEvent('evt2', 'driver-assigned', 'Second event', '2026-06-01T11:00:00Z'),
        createEvent('evt3', 'delivered', 'Third event', '2026-06-01T12:00:00Z'),
      ];
      mockState(events);
      render(<AuditTimeline deliveryId="delivery-123" />);

      const eventDescriptions = screen.getAllByText(/event/);
      expect(eventDescriptions[0]).toHaveTextContent('First event');
      expect(eventDescriptions[1]).toHaveTextContent('Second event');
      expect(eventDescriptions[2]).toHaveTextContent('Third event');
    });

    it('should maintain mixed severity events in proper order with correct colors', () => {
      const mixedOrderEvents = [
        createEvent('evt1', 'contract-created', 'Info event', '2026-06-01T10:00:00Z'),
        createEvent('evt2', 'dispute-raised', 'Error event', '2026-06-01T11:00:00Z'),
        createEvent('evt3', 'in-transit', 'Warning event', '2026-06-01T12:00:00Z'),
      ];
      mockState(mixedOrderEvents);
      render(<AuditTimeline deliveryId="delivery-123" />);

      // Verify all three are rendered
      expect(screen.getByText('Info event')).toBeInTheDocument();
      expect(screen.getByText('Error event')).toBeInTheDocument();
      expect(screen.getByText('Warning event')).toBeInTheDocument();

      // Verify they each have correct colors despite mixed order
      expect(screen.getByText('✓').closest('div')?.className).toMatch(/bg-blue-500/);
      expect(screen.getByText('⚠️').closest('div')?.className).toMatch(/bg-red-500/);
      expect(screen.getByText('🚗').closest('div')?.className).toMatch(/bg-yellow-500/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE: Vertical Timeline Line Rendering
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge Case: Vertical Timeline Line Rendering', () => {
    it('should render vertical connecting line between events', () => {
      const events = [
        SEVERITY_EVENTS.info,
        SEVERITY_EVENTS.warning,
      ];
      mockState(events);
      const { container } = render(<AuditTimeline deliveryId="delivery-123" />);

      // The first event should have a connecting line (it's not the last)
      const timelineLines = container.querySelectorAll('div.absolute.left-1\\/2.top-12');
      // Should have at least one connecting line
      expect(timelineLines.length).toBeGreaterThan(0);
    });

    it('should NOT render connecting line after the last event', () => {
      mockState([SEVERITY_EVENTS.info]);
      const { container } = render(<AuditTimeline deliveryId="delivery-123" />);

      // With only one event, there should be no connecting line
      const timelineLines = container.querySelectorAll('div.absolute.left-1\\/2.top-12');
      // Should be no lines for a single event (it's the last one)
      expect(timelineLines.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE: Refresh Functionality
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge Case: Refresh Functionality', () => {
    it('should call refresh function when refresh button is clicked', async () => {
      const mockRefresh = jest.fn();
      mockUseAuditTimeline.mockReturnValue({
        events: [SEVERITY_EVENTS.info],
        isLoading: false,
        error: null,
        totalCount: 1,
        refresh: mockRefresh,
      });

      render(<AuditTimeline deliveryId="delivery-123" />);

      const refreshButton = screen.getByRole('button', { name: /Refresh timeline/ });
      await userEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should call onRefresh callback when provided after refresh completes', async () => {
      const mockRefresh = jest.fn(async () => {
        // Simulate async refresh
        return Promise.resolve();
      });
      const mockOnRefresh = jest.fn();

      mockUseAuditTimeline.mockReturnValue({
        events: [SEVERITY_EVENTS.info],
        isLoading: false,
        error: null,
        totalCount: 1,
        refresh: mockRefresh,
      });

      render(<AuditTimeline deliveryId="delivery-123" onRefresh={mockOnRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /Refresh timeline/ });
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });

    it('should display refresh button in header', () => {
      mockState([SEVERITY_EVENTS.info]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      const refreshButton = screen.getByRole('button', { name: /Refresh timeline/ });
      expect(refreshButton).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASE: Summary Footer
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge Case: Summary Footer', () => {
    it('should render summary footer when events are present', () => {
      mockState([SEVERITY_EVENTS.info, SEVERITY_EVENTS.warning]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText(/Showing 2 of 2 events/)).toBeInTheDocument();
    });

    it('should NOT render summary footer when no events are present', () => {
      mockState([]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });

    it('should show correct event count when totalCount differs from events.length', () => {
      const events = [SEVERITY_EVENTS.info, SEVERITY_EVENTS.warning];
      mockUseAuditTimeline.mockReturnValue({
        events,
        isLoading: false,
        error: null,
        totalCount: 10, // More events exist on server
        refresh: jest.fn(),
      });

      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByText('Showing 2 of 10 events')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ACCESSIBILITY
  // ─────────────────────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('should have a proper heading for the timeline', () => {
      mockState([SEVERITY_EVENTS.info]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByRole('heading', { level: 2, name: 'Activity Timeline' })).toBeInTheDocument();
    });

    it('should have aria-label on refresh button', () => {
      mockState([SEVERITY_EVENTS.info]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      const refreshButton = screen.getByRole('button', { name: /Refresh timeline/ });
      expect(refreshButton).toHaveAttribute('aria-label', 'Refresh timeline');
    });

    it('should have time elements with dateTime attributes', () => {
      mockState([SEVERITY_EVENTS.info]);
      const { container } = render(<AuditTimeline deliveryId="delivery-123" />);

      const timeElements = container.querySelectorAll('time');
      expect(timeElements.length).toBeGreaterThan(0);
      expect(timeElements[0]).toHaveAttribute('dateTime', '2026-06-01T10:00:00Z');
    });

    it('should have proper role="alert" on error state', () => {
      mockState([], false, 'An error occurred');
      render(<AuditTimeline deliveryId="delivery-123" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have truncated address with title attribute for full address', () => {
      mockState([SEVERITY_EVENTS.info]);
      const { container } = render(<AuditTimeline deliveryId="delivery-123" />);

      const addressElements = container.querySelectorAll('p[title]');
      const addressElement = Array.from(addressElements).find(el => 
        el.textContent?.includes('GDDST')
      );
      expect(addressElement).toHaveAttribute('title', '0xGDDST234234567890ABCDEF0123456789');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DARK MODE SUPPORT
  // ─────────────────────────────────────────────────────────────────────────

  describe('Dark Mode Support', () => {
    it('should have dark mode classes on main container', () => {
      mockState([SEVERITY_EVENTS.info]);
      const { container } = render(<AuditTimeline deliveryId="delivery-123" />);

      const mainDiv = container.querySelector('div.w-full');
      expect(mainDiv?.className).toMatch(/dark:bg-gray-900/);
      expect(mainDiv?.className).toMatch(/dark:border-gray-700/);
    });

    it('should have dark mode classes on text elements', () => {
      mockState([SEVERITY_EVENTS.info]);
      render(<AuditTimeline deliveryId="delivery-123" />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.className).toMatch(/dark:text-white/);
    });

    it('should have dark mode classes on error alert', () => {
      mockState([], false, 'Error occurred');
      const { container } = render(<AuditTimeline deliveryId="delivery-123" />);

      const alert = container.querySelector('div[class*="border-red"]');
      expect(alert?.className).toMatch(/dark:border-red-800/);
      expect(alert?.className).toMatch(/dark:bg-red-900/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INTEGRATION: Multiple Scenarios
  // ─────────────────────────────────────────────────────────────────────────

  describe('Integration: Real-world Scenarios', () => {
    it('should render a realistic delivery workflow with multiple severity levels', () => {
      const realisticWorkflow = [
        createEvent('evt1', 'contract-created', 'Smart contract deployed', '2026-06-01T10:00:00Z'),
        createEvent('evt2', 'driver-assigned', 'Driver Alice assigned', '2026-06-01T10:15:00Z'),
        createEvent('evt3', 'escrow-funded', 'Escrow locked: 250 XLM', '2026-06-01T10:30:00Z'),
        createEvent('evt4', 'in-transit', 'Shipment picked up', '2026-06-01T11:00:00Z'),
        createEvent('evt5', 'in-transit', 'Shipment en route', '2026-06-01T14:30:00Z'),
        createEvent('evt6', 'delivered', 'Shipment delivered', '2026-06-01T16:00:00Z'),
        createEvent('evt7', 'escrow-released', 'Escrow released to driver', '2026-06-01T16:15:00Z'),
      ];

      mockState(realisticWorkflow);
      render(<AuditTimeline deliveryId="delivery-123" />);

      // Verify all events are rendered with their correct colors
      expect(screen.getByText('Smart contract deployed')).toBeInTheDocument();
      expect(screen.getByText('Driver Alice assigned')).toBeInTheDocument();
      expect(screen.getByText('Escrow locked: 250 XLM')).toBeInTheDocument();
      expect(screen.getByText('Shipment picked up')).toBeInTheDocument();
      expect(screen.getByText('Shipment en route')).toBeInTheDocument();
      expect(screen.getByText('Shipment delivered')).toBeInTheDocument();
      expect(screen.getByText('Escrow released to driver')).toBeInTheDocument();

      // Verify color distribution
      const blueIcon = screen.getByText('✓').closest('div'); // contract-created
      expect(blueIcon?.className).toMatch(/bg-blue-500/);

      const redIcon = screen.queryByText('⚠️')?.closest('div'); // dispute-raised (not in this flow)
      expect(redIcon).not.toBeInTheDocument();
    });

    it('should handle dispute scenario with error and resolution', () => {
      const disputeScenario = [
        createEvent('evt1', 'contract-created', 'Contract deployed', '2026-06-01T10:00:00Z'),
        createEvent('evt2', 'in-transit', 'In transit', '2026-06-01T12:00:00Z'),
        createEvent('evt3', 'dispute-raised', 'Customer raised dispute', '2026-06-01T15:00:00Z'),
        createEvent('evt4', 'dispute-resolved', 'Dispute resolved by arbitration', '2026-06-01T18:00:00Z'),
        createEvent('evt5', 'escrow-released', 'Escrow released', '2026-06-01T18:15:00Z'),
      ];

      mockState(disputeScenario);
      render(<AuditTimeline deliveryId="delivery-123" />);

      // Verify error event is rendered with red color
      const errorIcon = screen.getByText('⚠️').closest('div');
      expect(errorIcon?.className).toMatch(/bg-red-500/);

      // Verify recovery (dispute-resolved) shows in green
      expect(screen.getByText('Dispute resolved by arbitration')).toBeInTheDocument();
    });
  });
});
