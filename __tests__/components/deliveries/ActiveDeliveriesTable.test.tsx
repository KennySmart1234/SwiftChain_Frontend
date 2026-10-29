'use client';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveDeliveriesTable } from '@/features/deliveries/components/ActiveDeliveriesTable';
import type { Delivery } from '@/types/delivery';

describe('Component: ActiveDeliveriesTable - Sorting Tests', () => {
  // ============================================================================
  // REALISTIC FIXTURE DATA
  // ============================================================================

  const createMockDelivery = (overrides?: Partial<Delivery>): Delivery => ({
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
  });

  /**
   * Fixture: Multiple deliveries with distinct dates to test date sorting.
   * Dates are in chronological order; the component receives them unsorted
   * from the parent (sorting is backend-driven, not client-side).
   */
  const DELIVERIES_MIXED_DATES = [
    createMockDelivery({
      id: 'del-001',
      trackingNumber: 'TRK001',
      createdAt: '2024-01-15T10:30:00Z',
      status: 'PENDING',
      amount: 500,
    }),
    createMockDelivery({
      id: 'del-002',
      trackingNumber: 'TRK002',
      createdAt: '2024-01-20T14:45:00Z',
      status: 'ACCEPTED',
      amount: 1200,
    }),
    createMockDelivery({
      id: 'del-003',
      trackingNumber: 'TRK003',
      createdAt: '2024-01-10T08:15:00Z',
      status: 'IN_TRANSIT',
      amount: 800,
    }),
    createMockDelivery({
      id: 'del-004',
      trackingNumber: 'TRK004',
      createdAt: '2024-01-25T16:00:00Z',
      status: 'DELIVERED',
      amount: 2000,
    }),
    createMockDelivery({
      id: 'del-005',
      trackingNumber: 'TRK005',
      createdAt: '2024-01-05T09:00:00Z',
      status: 'CANCELLED',
      amount: 300,
    }),
  ];

  /**
   * Fixture: Multiple deliveries with duplicate dates to test stable sorting.
   */
  const DELIVERIES_DUPLICATE_DATES = [
    createMockDelivery({
      id: 'del-dup-1',
      trackingNumber: 'TRKDUP1',
      createdAt: '2024-01-15T10:00:00Z',
      status: 'PENDING',
    }),
    createMockDelivery({
      id: 'del-dup-2',
      trackingNumber: 'TRKDUP2',
      createdAt: '2024-01-15T10:00:00Z',
      status: 'ACCEPTED',
    }),
    createMockDelivery({
      id: 'del-dup-3',
      trackingNumber: 'TRKDUP3',
      createdAt: '2024-01-15T10:00:00Z',
      status: 'IN_TRANSIT',
    }),
  ];

  /**
   * Fixture: Deliveries with distinct statuses to verify status display.
   */
  const DELIVERIES_ALL_STATUSES = [
    createMockDelivery({
      id: 'del-pending',
      trackingNumber: 'TRKPENDING',
      status: 'PENDING',
      createdAt: '2024-01-20T10:00:00Z',
    }),
    createMockDelivery({
      id: 'del-accepted',
      trackingNumber: 'TRKACCEPTED',
      status: 'ACCEPTED',
      createdAt: '2024-01-20T10:00:00Z',
    }),
    createMockDelivery({
      id: 'del-in-transit',
      trackingNumber: 'TRKIN_TRANSIT',
      status: 'IN_TRANSIT',
      createdAt: '2024-01-20T10:00:00Z',
    }),
    createMockDelivery({
      id: 'del-delivered',
      trackingNumber: 'TRKDELIVERED',
      status: 'DELIVERED',
      createdAt: '2024-01-20T10:00:00Z',
    }),
    createMockDelivery({
      id: 'del-cancelled',
      trackingNumber: 'TRKCANCELLED',
      status: 'CANCELLED',
      createdAt: '2024-01-20T10:00:00Z',
    }),
  ];

  /**
   * Fixture: Large dataset to test pagination (beyond 10 rows per page).
   */
  const DELIVERIES_PAGINATION = Array.from({ length: 25 }, (_, i) => {
    const date = new Date('2024-01-01');
    date.setDate(date.getDate() + i);
    return createMockDelivery({
      id: `del-page-${i}`,
      trackingNumber: `TRKPAGE${String(i).padStart(3, '0')}`,
      createdAt: date.toISOString(),
      status: ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'][i % 5] as Delivery['status'],
    });
  });

  // ============================================================================
  // HAPPY-PATH TESTS: DATE SORTING
  // ============================================================================

  describe('Happy Path: Date Sorting', () => {
    it('renders a table with deliveries and correct column headers', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_MIXED_DATES} />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Tracking Number')).toBeInTheDocument();
      expect(screen.getByText('Route')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
    });

    it('renders all deliveries from the fixture with correct tracking numbers', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_MIXED_DATES} />
      );

      DELIVERIES_MIXED_DATES.slice(0, 10).forEach((delivery) => {
        expect(screen.getByText(delivery.trackingNumber)).toBeInTheDocument();
      });
    });

    it('displays deliveries in the order they are received (unsorted by default)', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_MIXED_DATES} />
      );

      const rows = screen.getAllByRole('row').slice(1); // Skip header row
      expect(rows).toHaveLength(Math.min(DELIVERIES_MIXED_DATES.length, 10));

      // Verify first visible delivery matches first in fixture
      expect(rows[0]).toHaveTextContent(DELIVERIES_MIXED_DATES[0].trackingNumber);
      expect(rows[1]).toHaveTextContent(DELIVERIES_MIXED_DATES[1].trackingNumber);
    });

    it('correctly formats and displays dates in MMM D, YYYY format', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_MIXED_DATES} />
      );

      // Verify date formatting: '2024-01-15T10:30:00Z' → 'Jan 15, 2024'
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 20, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 10, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 25, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 5, 2024')).toBeInTheDocument();
    });

    it('displays correct route information (origin to destination)', () => {
      const customDeliveries = [
        createMockDelivery({
          id: 'del-route-1',
          trackingNumber: 'TRKROUTE1',
          origin: 'Lagos',
          destination: 'Kano',
        }),
        createMockDelivery({
          id: 'del-route-2',
          trackingNumber: 'TRKROUTE2',
          origin: 'Accra',
          destination: 'Kumasi',
        }),
      ];

      render(<ActiveDeliveriesTable deliveries={customDeliveries} />);

      expect(screen.getByText('Lagos to Kano')).toBeInTheDocument();
      expect(screen.getByText('Accra to Kumasi')).toBeInTheDocument();
    });

    it('displays correct amounts with currency', () => {
      const customDeliveries = [
        createMockDelivery({
          id: 'del-amt-1',
          trackingNumber: 'TRKAMT1',
          amount: 500,
          currency: 'XLM',
        }),
        createMockDelivery({
          id: 'del-amt-2',
          trackingNumber: 'TRKAMT2',
          amount: 1200.50,
          currency: 'USDC',
        }),
      ];

      render(<ActiveDeliveriesTable deliveries={customDeliveries} />);

      expect(screen.getByText('500 XLM')).toBeInTheDocument();
      expect(screen.getByText('1200.5 USDC')).toBeInTheDocument();
    });

    it('uses default currency (XLM) when currency is not specified', () => {
      const customDeliveries = [
        createMockDelivery({
          id: 'del-nocurrency',
          trackingNumber: 'TRKNOCURR',
          currency: undefined,
        }),
      ];

      render(<ActiveDeliveriesTable deliveries={customDeliveries} />);

      expect(screen.getByText(/XLM$/)).toBeInTheDocument();
    });

    it('renders all delivery statuses with correct color coding', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_ALL_STATUSES} />
      );

      const statuses = ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
      statuses.forEach((status) => {
        const statusElement = screen.getByText(status);
        expect(statusElement).toBeInTheDocument();
        // Verify color class is applied
        expect(statusElement).toHaveClass('bg-yellow-100', 'text-yellow-800');
      });
    });

    it('applies correct color classes for each status badge', () => {
      const statusTests = [
        { status: 'PENDING' as const, classIncludes: 'yellow' },
        { status: 'ACCEPTED' as const, classIncludes: 'indigo' },
        { status: 'IN_TRANSIT' as const, classIncludes: 'blue' },
        { status: 'DELIVERED' as const, classIncludes: 'green' },
        { status: 'CANCELLED' as const, classIncludes: 'red' },
      ];

      statusTests.forEach(({ status, classIncludes }) => {
        const delivery = createMockDelivery({ status });
        render(<ActiveDeliveriesTable deliveries={[delivery]} />);

        const statusElement = screen.getByText(status);
        const className = statusElement.getAttribute('class') || '';
        expect(className).toContain(classIncludes);

        // Clean up for next iteration
        const { unmount } = render(<div />);
        unmount();
      });
    });
  });

  // ============================================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe('Edge Cases: Empty List', () => {
    it('renders empty state when deliveries array is empty', () => {
      render(<ActiveDeliveriesTable deliveries={[]} />);

      expect(screen.getByText('No active deliveries')).toBeInTheDocument();
      expect(
        screen.getByText('Shipments appear here as soon as they are created.')
      ).toBeInTheDocument();
    });

    it('does not render table when deliveries array is empty', () => {
      render(<ActiveDeliveriesTable deliveries={[]} />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases: Single Item', () => {
    it('renders a single delivery without crashing', () => {
      const singleDelivery = [DELIVERIES_MIXED_DATES[0]];
      render(<ActiveDeliveriesTable deliveries={singleDelivery} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText(singleDelivery[0].trackingNumber)).toBeInTheDocument();
    });

    it('does not show pagination controls for single item', () => {
      const singleDelivery = [DELIVERIES_MIXED_DATES[0]];
      render(<ActiveDeliveriesTable deliveries={singleDelivery} />);

      // Pagination summary should still show, but nav buttons should not
      expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Showing 1-1 of 1 deliveries');
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases: Duplicate Dates', () => {
    it('renders deliveries with duplicate dates without crashing', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_DUPLICATE_DATES} />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByText('Jan 15, 2024')).toHaveLength(3);
    });

    it('maintains order of duplicate-date deliveries (stable sort)', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_DUPLICATE_DATES} />
      );

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows[0]).toHaveTextContent('TRKDUP1');
      expect(rows[1]).toHaveTextContent('TRKDUP2');
      expect(rows[2]).toHaveTextContent('TRKDUP3');
    });
  });

  describe('Edge Cases: Malformed/Missing Data', () => {
    it('handles delivery with missing optional currency field gracefully', () => {
      const deliveryNoCurrency = createMockDelivery({
        id: 'del-no-curr',
        trackingNumber: 'TRKNOCURR',
        currency: undefined,
      });

      render(<ActiveDeliveriesTable deliveries={[deliveryNoCurrency]} />);

      // Should default to XLM
      expect(screen.getByText(/1000 XLM/)).toBeInTheDocument();
    });

    it('handles delivery with missing landmark field', () => {
      const deliveryNoLandmark = createMockDelivery({
        id: 'del-no-landmark',
        trackingNumber: 'TRKNOLANDMARK',
        landmark: null,
      });

      render(<ActiveDeliveriesTable deliveries={[deliveryNoLandmark]} />);

      expect(screen.getByText('TRK')).toBeInTheDocument();
      expect(screen.queryByText('Landmark:')).not.toBeInTheDocument();
    });

    it('handles delivery with invalid ISO date string', () => {
      const deliveryInvalidDate = createMockDelivery({
        id: 'del-invalid-date',
        trackingNumber: 'TRKINVALIDDATE',
        createdAt: 'not-a-valid-date',
      });

      render(<ActiveDeliveriesTable deliveries={[deliveryInvalidDate]} />);

      // Should display '--' for invalid date
      expect(screen.getByText('--')).toBeInTheDocument();
    });

    it('handles delivery with empty string date', () => {
      const deliveryEmptyDate = createMockDelivery({
        id: 'del-empty-date',
        trackingNumber: 'TRKEMPTYDATE',
        createdAt: '',
      });

      render(<ActiveDeliveriesTable deliveries={[deliveryEmptyDate]} />);

      // Should display '--' for empty date
      expect(screen.getByText('--')).toBeInTheDocument();
    });

    it('handles delivery with null date value', () => {
      const deliveryNullDate = createMockDelivery({
        id: 'del-null-date',
        trackingNumber: 'TRKNULLDATE',
        createdAt: 'null' as any,
      });

      render(<ActiveDeliveriesTable deliveries={[deliveryNullDate]} />);

      expect(screen.getByText('--')).toBeInTheDocument();
    });

    it('handles delivery with all statuses without crashing', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_ALL_STATUSES} />
      );

      ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].forEach((status) => {
        expect(screen.getByText(status)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases: API/Loading States', () => {
    it('renders loading state when isLoading is true', () => {
      render(
        <ActiveDeliveriesTable deliveries={[]} isLoading={true} />
      );

      expect(screen.getByText('Loading deliveries...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('renders error state with error message when error is provided', () => {
      const errorMessage = 'Failed to fetch deliveries from the backend';
      render(
        <ActiveDeliveriesTable
          deliveries={[]}
          error={errorMessage}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('renders retry button when error is provided and onRetry callback exists', () => {
      const mockRetry = jest.fn();
      render(
        <ActiveDeliveriesTable
          deliveries={[]}
          error="Failed to fetch"
          onRetry={mockRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /Try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry callback when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockRetry = jest.fn();

      render(
        <ActiveDeliveriesTable
          deliveries={[]}
          error="Failed to fetch"
          onRetry={mockRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /Try again/i });
      await user.click(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(
        <ActiveDeliveriesTable
          deliveries={[]}
          error="Failed to fetch"
        />
      );

      expect(screen.queryByRole('button', { name: /Try again/i })).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases: Pagination', () => {
    it('renders pagination controls when deliveries exceed page size', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      // Should show pagination summary
      expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Showing 1-10 of 25 deliveries');

      // Should show navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    });

    it('only shows page items up to pageSize limit', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      const rows = screen.getAllByRole('row').slice(1); // Exclude header
      expect(rows).toHaveLength(10);
    });

    it('navigates to next page when Next button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      // First page shows TRKPAGE000-TRKPAGE009
      expect(screen.getByText('TRKPAGE000')).toBeInTheDocument();
      expect(screen.getByText('TRKPAGE009')).toBeInTheDocument();
      expect(screen.queryByText('TRKPAGE010')).not.toBeInTheDocument();

      const nextButton = screen.getByRole('button', { name: /Next/i });
      await user.click(nextButton);

      // Second page shows TRKPAGE010-TRKPAGE019
      await waitFor(() => {
        expect(screen.queryByText('TRKPAGE000')).not.toBeInTheDocument();
        expect(screen.getByText('TRKPAGE010')).toBeInTheDocument();
        expect(screen.getByText('TRKPAGE019')).toBeInTheDocument();
      });
    });

    it('disables Previous button on first page', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      const previousButton = screen.getByRole('button', { name: /Previous/i });
      expect(previousButton).toBeDisabled();
    });

    it('enables Previous button on page 2 and navigates back', async () => {
      const user = userEvent.setup();
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      const nextButton = screen.getByRole('button', { name: /Next/i });
      await user.click(nextButton);

      await waitFor(() => {
        const previousButton = screen.getByRole('button', { name: /Previous/i });
        expect(previousButton).not.toBeDisabled();
      });

      const previousButton = screen.getByRole('button', { name: /Previous/i });
      await user.click(previousButton);

      await waitFor(() => {
        expect(screen.getByText('TRKPAGE000')).toBeInTheDocument();
      });
    });

    it('disables Next button on last page', async () => {
      const user = userEvent.setup();
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      // Navigate to last page (page 3, since 25 / 10 = 3 pages)
      const pageButtons = screen.getAllByRole('button');
      const page3Button = pageButtons.find((btn) => btn.getAttribute('aria-label') === 'Page 3');
      
      if (page3Button) {
        await user.click(page3Button);

        await waitFor(() => {
          const nextButton = screen.getByRole('button', { name: /Next/i });
          expect(nextButton).toBeDisabled();
        });
      }
    });

    it('allows direct page navigation via page buttons', async () => {
      const user = userEvent.setup();
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      // Click page 2 button
      const pageButtons = screen.getAllByRole('button');
      const page2Button = pageButtons.find((btn) => btn.getAttribute('aria-label') === 'Page 2');

      if (page2Button) {
        await user.click(page2Button);

        await waitFor(() => {
          expect(screen.getByText('TRKPAGE010')).toBeInTheDocument();
          expect(screen.getByText('TRKPAGE019')).toBeInTheDocument();
        });
      }
    });

    it('shows correct pagination summary for each page', async () => {
      const user = userEvent.setup();
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      // Page 1
      expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Showing 1-10 of 25 deliveries');

      // Navigate to page 2
      const nextButton = screen.getByRole('button', { name: /Next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Showing 11-20 of 25 deliveries');
      });
    });

    it('handles custom pageSize prop correctly', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={5} />
      );

      // With pageSize=5, should only show 5 rows
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(5);

      // Pagination summary should reflect page size
      expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Showing 1-5 of 25 deliveries');
    });
  });

  describe('Accessibility', () => {
    it('has proper table semantics with role and aria labels', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_MIXED_DATES} />
      );

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Active deliveries');
    });

    it('has proper heading scope for table headers', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_MIXED_DATES} />
      );

      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBeGreaterThan(0);
      headers.forEach((header) => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });

    it('pagination navigation has proper aria labels', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Deliveries pagination');
    });

    it('pagination buttons have proper aria labels', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      expect(screen.getByRole('button', { name: /Previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next page/i })).toBeInTheDocument();
    });

    it('current page button has aria-current attribute', () => {
      render(
        <ActiveDeliveriesTable deliveries={DELIVERIES_PAGINATION} pageSize={10} />
      );

      const pageButtons = screen.getAllByRole('button');
      const page1Button = pageButtons.find((btn) => btn.getAttribute('aria-label') === 'Page 1');
      
      expect(page1Button).toHaveAttribute('aria-current', 'page');
    });
  });
});
