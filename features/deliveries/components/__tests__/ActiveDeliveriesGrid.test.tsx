/**
 * ActiveDeliveriesGrid Component Tests
 *
 * This test suite covers the grid view of active deliveries with responsive layout.
 *
 * IMPORTANT - RESPONSIVE LAYOUT TESTING LIMITATION:
 * This component uses pure CSS Tailwind breakpoints (grid-cols-1, sm:grid-cols-2, lg:grid-cols-3)
 * to achieve responsive behavior. Jest/jsdom does NOT evaluate media queries or compute actual
 * CSS grid layout — it cannot verify that the browser truly renders 3 columns at 1024px,
 * 2 columns at 640px, or 1 column on mobile.
 *
 * What CAN be tested in jsdom:
 * ✅ The correct Tailwind class names are present in the rendered output
 * ✅ Card rendering, content formatting, and data display
 * ✅ Error states, loading states, empty states
 * ✅ User interactions and accessibility attributes
 *
 * What CANNOT be reliably tested in jsdom:
 * ❌ Actual CSS breakpoint evaluation (would need a real browser engine)
 * ❌ Computed grid-template-columns at each viewport size
 * ❌ Visual layout breaking from 3 columns → 2 columns → 1 column
 *
 * For true end-to-end responsive testing, a tool like Cypress or Playwright with a real
 * browser engine would be needed. See the PR description for details.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveDeliveriesGrid } from '@/features/deliveries/components/ActiveDeliveriesGrid';
import type { Delivery } from '@/types/delivery';

/**
 * Mock factory for creating realistic delivery fixtures.
 */
function createMockDelivery(overrides?: Partial<Delivery>): Delivery {
  return {
    id: 'del-' + Math.random().toString(36).slice(2, 9),
    trackingNumber: 'TRK' + Math.random().toString(36).slice(2, 9).toUpperCase(),
    senderId: 'sender-1',
    status: 'PENDING',
    origin: 'Lagos',
    destination: 'Abuja',
    escrowStatus: 'pending',
    amount: 1000,
    currency: 'XLM',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Component: ActiveDeliveriesGrid', () => {
  // ============================================================================
  // FIXTURE DATA
  // ============================================================================

  const DELIVERY_SAMPLE = createMockDelivery({
    id: 'del-001',
    trackingNumber: 'TRK001',
    status: 'PENDING',
    origin: 'Lagos',
    destination: 'Kano',
    amount: 500,
    currency: 'XLM',
    createdAt: '2026-01-15T10:30:00Z',
  });

  const DELIVERIES_MULTIPLE = [
    createMockDelivery({
      id: 'del-001',
      trackingNumber: 'TRK001',
      status: 'PENDING',
      origin: 'Lagos',
      destination: 'Kano',
      amount: 500,
      currency: 'XLM',
      createdAt: '2026-01-15T10:30:00Z',
    }),
    createMockDelivery({
      id: 'del-002',
      trackingNumber: 'TRK002',
      status: 'IN_TRANSIT',
      origin: 'Abuja',
      destination: 'Enugu',
      amount: 1200,
      currency: 'XLM',
      createdAt: '2026-01-16T14:45:00Z',
    }),
    createMockDelivery({
      id: 'del-003',
      trackingNumber: 'TRK003',
      status: 'DELIVERED',
      origin: 'Port Harcourt',
      destination: 'Benin City',
      amount: 800,
      currency: 'XLM',
      createdAt: '2026-01-17T08:15:00Z',
    }),
    createMockDelivery({
      id: 'del-004',
      trackingNumber: 'TRK004',
      status: 'ACCEPTED',
      origin: 'Ibadan',
      destination: 'Ilorin',
      amount: 2000,
      currency: 'XLM',
      createdAt: '2026-01-18T16:00:00Z',
    }),
  ];

  const DELIVERIES_ALL_STATUSES = [
    createMockDelivery({ id: 'del-p', status: 'PENDING' }),
    createMockDelivery({ id: 'del-a', status: 'ACCEPTED' }),
    createMockDelivery({ id: 'del-it', status: 'IN_TRANSIT' }),
    createMockDelivery({ id: 'del-d', status: 'DELIVERED' }),
    createMockDelivery({ id: 'del-c', status: 'CANCELLED' }),
  ];

  // ============================================================================
  // BASIC RENDERING TESTS
  // ============================================================================

  describe('Basic Rendering', () => {
    it('renders a grid container with proper accessibility labels', () => {
      render(<ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />);

      const grid = screen.getByRole('list', { name: 'Active deliveries grid' });
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveAttribute('data-testid', 'deliveries-grid');
    });

    it('renders one card per delivery in the provided order', () => {
      render(<ActiveDeliveriesGrid deliveries={DELIVERIES_MULTIPLE} />);

      const cards = screen.getAllByTestId('delivery-card');
      expect(cards).toHaveLength(4);

      expect(within(cards[0]).getByTestId('tracking-number')).toHaveTextContent('TRK001');
      expect(within(cards[1]).getByTestId('tracking-number')).toHaveTextContent('TRK002');
      expect(within(cards[2]).getByTestId('tracking-number')).toHaveTextContent('TRK003');
      expect(within(cards[3]).getByTestId('tracking-number')).toHaveTextContent('TRK004');
    });

    it('renders all delivery information on each card', () => {
      render(<ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />);

      const card = screen.getByTestId('delivery-card');

      expect(within(card).getByTestId('tracking-number')).toHaveTextContent('TRK001');
      expect(within(card).getByTestId('route-info')).toHaveTextContent('Lagos to Kano');
      expect(within(card).getByTestId('status-badge')).toHaveTextContent('PENDING');
      expect(within(card).getByTestId('amount-info')).toHaveTextContent('500 XLM');
      expect(within(card).getByTestId('created-date')).toHaveTextContent('Jan 15, 2026');
    });

    it('defaults currency to XLM when not provided', () => {
      const deliveryNoCurrency = createMockDelivery({ currency: undefined });
      render(<ActiveDeliveriesGrid deliveries={[deliveryNoCurrency]} />);

      expect(screen.getByTestId('amount-info')).toHaveTextContent('XLM');
    });
  });

  // ============================================================================
  // RESPONSIVE LAYOUT CLASS TESTS (CSS CLASS VERIFICATION)
  // ============================================================================

  describe('Responsive Layout Classes', () => {
    it('includes responsive grid CSS classes (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3)', () => {
      const { container } = render(<ActiveDeliveriesGrid deliveries={DELIVERIES_MULTIPLE} />);

      const grid = container.querySelector('[data-testid="deliveries-grid"]');
      const classList = grid?.className || '';

      // Verify the class names are present in the rendered output
      // Note: Tailwind class presence does NOT verify actual computed layout in jsdom
      expect(classList).toContain('grid-cols-1');
      expect(classList).toContain('sm:grid-cols-2');
      expect(classList).toContain('lg:grid-cols-3');
    });

    it('includes gap-4 class for consistent spacing between cards', () => {
      const { container } = render(<ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />);

      const grid = container.querySelector('[data-testid="deliveries-grid"]');
      expect(grid?.className).toContain('gap-4');
    });
  });

  // ============================================================================
  // CARD CONTENT & FORMATTING TESTS
  // ============================================================================

  describe('Card Content & Formatting', () => {
    it('formats dates as MMM D, YYYY', () => {
      render(<ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />);

      expect(screen.getByTestId('created-date')).toHaveTextContent('Jan 15, 2026');
    });

    it('displays route as "Origin to Destination"', () => {
      render(<ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />);

      expect(screen.getByTestId('route-info')).toHaveTextContent('Lagos to Kano');
    });

    it('displays amount with currency code', () => {
      render(<ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />);

      expect(screen.getByTestId('amount-info')).toHaveTextContent('500 XLM');
    });

    it('handles invalid dates by displaying a placeholder', () => {
      const deliveryInvalidDate = createMockDelivery({ createdAt: 'not-a-date' });
      render(<ActiveDeliveriesGrid deliveries={[deliveryInvalidDate]} />);

      expect(screen.getByTestId('created-date')).toHaveTextContent('--');
    });

    it('handles empty date strings by displaying a placeholder', () => {
      const deliveryEmptyDate = createMockDelivery({ createdAt: '' });
      render(<ActiveDeliveriesGrid deliveries={[deliveryEmptyDate]} />);

      expect(screen.getByTestId('created-date')).toHaveTextContent('--');
    });

    it('renders tracking number with label', () => {
      render(<ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />);

      const trackingNumber = screen.getByTestId('tracking-number');
      expect(trackingNumber).toHaveTextContent('TRK001');

      // Check that label is present in the parent
      const parent = trackingNumber.parentElement;
      expect(parent?.textContent).toContain('Tracking ID');
    });
  });

  // ============================================================================
  // STATUS BADGE TESTS
  // ============================================================================

  describe('Status Badges & Styling', () => {
    it('renders all delivery statuses with correct labels', () => {
      render(<ActiveDeliveriesGrid deliveries={DELIVERIES_ALL_STATUSES} />);

      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('ACCEPTED')).toBeInTheDocument();
      expect(screen.getByText('IN_TRANSIT')).toBeInTheDocument();
      expect(screen.getByText('DELIVERED')).toBeInTheDocument();
      expect(screen.getByText('CANCELLED')).toBeInTheDocument();
    });

    it('applies distinct color classes for each status', () => {
      render(<ActiveDeliveriesGrid deliveries={DELIVERIES_ALL_STATUSES} />);

      const badges = screen.getAllByTestId('status-badge');
      const classNames = badges.map((badge) => badge.className);

      // Each badge should have unique styling
      const uniqueClasses = new Set(classNames);
      expect(uniqueClasses.size).toBeGreaterThan(1);

      // Verify some known status colors are present
      expect(classNames.join(' ')).toContain('yellow'); // PENDING
      expect(classNames.join(' ')).toContain('green'); // DELIVERED
      expect(classNames.join(' ')).toContain('red'); // CANCELLED
    });

    it('handles unknown status gracefully', () => {
      const deliveryUnknownStatus = createMockDelivery({
        status: 'UNKNOWN' as any,
      });

      // Should not crash
      expect(() => {
        render(<ActiveDeliveriesGrid deliveries={[deliveryUnknownStatus]} />);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // EMPTY STATE TEST
  // ============================================================================

  describe('Empty State', () => {
    it('renders empty state when no deliveries provided', () => {
      render(<ActiveDeliveriesGrid deliveries={[]} />);

      expect(screen.getByText('No active deliveries')).toBeInTheDocument();
      expect(
        screen.getByText('Shipments appear here as soon as they are created.'),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('delivery-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('deliveries-grid')).not.toBeInTheDocument();
    });

    it('does not render grid list when empty', () => {
      render(<ActiveDeliveriesGrid deliveries={[]} />);

      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('displays Package icon in empty state', () => {
      const { container } = render(<ActiveDeliveriesGrid deliveries={[]} />);

      // Icon should be present (lucide-react renders as SVG)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ============================================================================
  // LOADING STATE TEST
  // ============================================================================

  describe('Loading State', () => {
    it('renders loading state when isLoading is true', () => {
      render(<ActiveDeliveriesGrid deliveries={[]} isLoading={true} />);

      expect(screen.getByText('Loading deliveries...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('does not render cards when loading', () => {
      render(<ActiveDeliveriesGrid deliveries={DELIVERIES_MULTIPLE} isLoading={true} />);

      expect(screen.queryByTestId('delivery-card')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // ERROR STATE TESTS
  // ============================================================================

  describe('Error State', () => {
    it('renders error message when error prop is provided', () => {
      const errorMessage = 'Failed to fetch deliveries from the backend';
      render(<ActiveDeliveriesGrid deliveries={[]} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders retry button when onRetry callback is provided', () => {
      const mockRetry = jest.fn();
      render(
        <ActiveDeliveriesGrid
          deliveries={[]}
          error="Failed to fetch"
          onRetry={mockRetry}
        />,
      );

      const retryButton = screen.getByRole('button', { name: 'Try again' });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockRetry = jest.fn();

      render(
        <ActiveDeliveriesGrid
          deliveries={[]}
          error="Failed to fetch"
          onRetry={mockRetry}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Try again' }));

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(<ActiveDeliveriesGrid deliveries={[]} error="Failed to fetch" />);

      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });

    it('does not render cards when error is present', () => {
      render(
        <ActiveDeliveriesGrid
          deliveries={DELIVERIES_MULTIPLE}
          error="Failed to fetch"
        />,
      );

      expect(screen.queryByTestId('delivery-card')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // EDGE CASES & RESILIENCE TESTS
  // ============================================================================

  describe('Edge Cases & Resilience', () => {
    it('renders single delivery without crashing', () => {
      render(<ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />);

      const cards = screen.getAllByTestId('delivery-card');
      expect(cards).toHaveLength(1);
    });

    it('renders many deliveries without crashing', () => {
      const manyDeliveries = Array.from({ length: 20 }, (_, i) =>
        createMockDelivery({
          id: `del-${i}`,
          trackingNumber: `TRK${String(i).padStart(3, '0')}`,
        }),
      );

      render(<ActiveDeliveriesGrid deliveries={manyDeliveries} />);

      const cards = screen.getAllByTestId('delivery-card');
      expect(cards).toHaveLength(20);
    });

    it('handles deliveries with missing optional fields', () => {
      const deliveryMissing = createMockDelivery({
        currency: undefined,
        createdAt: '2026-01-15T10:30:00Z',
      });

      expect(() => {
        render(<ActiveDeliveriesGrid deliveries={[deliveryMissing]} />);
      }).not.toThrow();

      expect(screen.getByTestId('amount-info')).toHaveTextContent('XLM');
    });

    it('maintains order of deliveries from input', () => {
      const orderedDeliveries = [
        createMockDelivery({
          id: 'del-1',
          trackingNumber: 'FIRST',
          origin: 'Alpha',
        }),
        createMockDelivery({
          id: 'del-2',
          trackingNumber: 'SECOND',
          origin: 'Beta',
        }),
        createMockDelivery({
          id: 'del-3',
          trackingNumber: 'THIRD',
          origin: 'Gamma',
        }),
      ];

      render(<ActiveDeliveriesGrid deliveries={orderedDeliveries} />);

      const routeTexts = screen.getAllByTestId('route-info').map((el) => el.textContent);
      expect(routeTexts).toEqual(['Alpha to Abuja', 'Beta to Abuja', 'Gamma to Abuja']);
    });

    it('renders with extremely large amounts without scientific notation', () => {
      const deliveryLargeAmount = createMockDelivery({ amount: 999999999 });

      render(<ActiveDeliveriesGrid deliveries={[deliveryLargeAmount]} />);

      expect(screen.getByTestId('amount-info')).toHaveTextContent('999999999 XLM');
    });

    it('renders with zero amount', () => {
      const deliveryZeroAmount = createMockDelivery({ amount: 0 });

      render(<ActiveDeliveriesGrid deliveries={[deliveryZeroAmount]} />);

      expect(screen.getByTestId('amount-info')).toHaveTextContent('0 XLM');
    });

    it('renders with negative amount (edge case)', () => {
      const deliveryNegativeAmount = createMockDelivery({ amount: -500 });

      render(<ActiveDeliveriesGrid deliveries={[deliveryNegativeAmount]} />);

      expect(screen.getByTestId('amount-info')).toHaveTextContent('-500 XLM');
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility', () => {
    it('labels the grid container for screen readers', () => {
      render(<ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />);

      expect(
        screen.getByRole('list', { name: 'Active deliveries grid' }),
      ).toBeInTheDocument();
    });

    it('uses semantic HTML with article elements for cards', () => {
      const { container } = render(
        <ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />,
      );

      const articles = container.querySelectorAll('article');
      expect(articles.length).toBeGreaterThan(0);
    });

    it('uses list items (li) for each card', () => {
      const { container } = render(
        <ActiveDeliveriesGrid deliveries={DELIVERIES_MULTIPLE} />,
      );

      const listItems = container.querySelectorAll('li');
      expect(listItems).toHaveLength(4);
    });

    it('renders status badge with proper semantics', () => {
      render(<ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
      // Badge is a span with semantic meaning from context
    });

    it('includes header element for card heading structure', () => {
      const { container } = render(
        <ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />,
      );

      const headers = container.querySelectorAll('header');
      expect(headers.length).toBeGreaterThan(0);
    });

    it('includes footer element for card metadata', () => {
      const { container } = render(
        <ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />,
      );

      const footers = container.querySelectorAll('footer');
      expect(footers.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  describe('Interactions', () => {
    it('cards have hover effects (transition class present)', () => {
      const { container } = render(
        <ActiveDeliveriesGrid deliveries={[DELIVERY_SAMPLE]} />,
      );

      const article = container.querySelector('article');
      expect(article?.className).toContain('transition');
      expect(article?.className).toContain('hover:shadow-md');
    });
  });

  // ============================================================================
  // COMPREHENSIVE MULTI-VIEWPORT TEST (LIMITED BY JSDOM)
  // ============================================================================

  describe('Responsive Layout - Limited by jsdom', () => {
    /**
     * NOTE: This test demonstrates the limitation of jsdom for testing
     * responsive layouts driven by CSS media queries.
     *
     * This test verifies that:
     * 1. The correct Tailwind classes are present in the DOM
     * 2. The component renders at all (sanity check)
     *
     * What it CANNOT verify:
     * - The actual computed grid-template-columns at each breakpoint
     * - Whether the browser truly renders 3 columns at 1024px
     * - Whether it actually breaks to 2 columns at 640px
     * - Whether it collapses to 1 column on mobile
     *
     * These would require Cypress/Playwright with a real browser engine.
     */
    it('includes all responsive Tailwind grid classes in the output', () => {
      const { container } = render(
        <ActiveDeliveriesGrid deliveries={DELIVERIES_MULTIPLE} />,
      );

      const grid = container.querySelector('[data-testid="deliveries-grid"]');
      const className = grid?.className || '';

      // Verify classes are present
      expect(className).toContain('grid-cols-1');
      expect(className).toContain('sm:grid-cols-2');
      expect(className).toContain('lg:grid-cols-3');
      expect(className).toContain('gap-4');

      // Render multiple cards to verify they all render in the grid
      const cards = screen.getAllByTestId('delivery-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('renders grid with 3 cards to test multi-column scenario', () => {
      const threeDeliveries = DELIVERIES_MULTIPLE.slice(0, 3);
      render(<ActiveDeliveriesGrid deliveries={threeDeliveries} />);

      const cards = screen.getAllByTestId('delivery-card');
      expect(cards).toHaveLength(3);

      // Verify each card renders independently
      expect(screen.getByText('TRK001')).toBeInTheDocument();
      expect(screen.getByText('TRK002')).toBeInTheDocument();
      expect(screen.getByText('TRK003')).toBeInTheDocument();
    });

    it('renders grid with many cards (>3) to stress-test layout', () => {
      const manyDeliveries = Array.from({ length: 12 }, (_, i) =>
        createMockDelivery({
          id: `del-${i}`,
          trackingNumber: `TRK${String(i).padStart(3, '0')}`,
          origin: `City${i}`,
          destination: `City${i + 1}`,
        }),
      );

      render(<ActiveDeliveriesGrid deliveries={manyDeliveries} />);

      const cards = screen.getAllByTestId('delivery-card');
      expect(cards).toHaveLength(12);
    });
  });
});
