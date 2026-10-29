'use client';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryFilters } from '@/features/deliveries/components/DeliveryFilters';

describe('Component: DeliveryFilters - Sorting Dropdown Tests', () => {
  // ============================================================================
  // SHARED TEST SETUP
  // ============================================================================

  const mockCallbacks = {
    onSearchChange: jest.fn(),
    onStatusChange: jest.fn(),
    onSortChange: jest.fn(),
    onClearAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // HAPPY-PATH TESTS: SORT DROPDOWN BEHAVIOR
  // ============================================================================

  describe('Happy Path: Sort Dropdown Rendering', () => {
    it('renders the sort filter dropdown', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      expect(sortDropdown).toBeInTheDocument();
    });

    it('renders all sort options in the dropdown', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date') as HTMLSelectElement;

      // Verify options exist
      const options = sortDropdown.querySelectorAll('option');
      expect(options.length).toBeGreaterThanOrEqual(3);

      // Verify specific options
      expect(sortDropdown).toHaveDisplayValue('No Sort');
      const optionTexts = Array.from(options).map((opt) => opt.textContent);
      expect(optionTexts).toContain('No Sort');
      expect(optionTexts).toContain('Newest First');
      expect(optionTexts).toContain('Oldest First');
    });

    it('displays "No Sort" as default selection when sortBy is undefined', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date') as HTMLSelectElement;
      expect(sortDropdown.value).toBe('');
      expect(sortDropdown).toHaveDisplayValue('No Sort');
    });

    it('displays "Newest First" when sortBy is "date-desc"', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date') as HTMLSelectElement;
      expect(sortDropdown.value).toBe('date-desc');
      expect(sortDropdown).toHaveDisplayValue('Newest First');
    });

    it('displays "Oldest First" when sortBy is "date-asc"', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-asc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date') as HTMLSelectElement;
      expect(sortDropdown.value).toBe('date-asc');
      expect(sortDropdown).toHaveDisplayValue('Oldest First');
    });
  });

  // ============================================================================
  // HAPPY-PATH TESTS: SORT INTERACTIONS
  // ============================================================================

  describe('Happy Path: Sort Interactions', () => {
    it('calls onSortChange with "date-desc" when "Newest First" is selected', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      await user.selectOption(sortDropdown, 'date-desc');

      expect(mockCallbacks.onSortChange).toHaveBeenCalledWith('date-desc');
      expect(mockCallbacks.onSortChange).toHaveBeenCalledTimes(1);
    });

    it('calls onSortChange with "date-asc" when "Oldest First" is selected', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      await user.selectOption(sortDropdown, 'date-asc');

      expect(mockCallbacks.onSortChange).toHaveBeenCalledWith('date-asc');
      expect(mockCallbacks.onSortChange).toHaveBeenCalledTimes(1);
    });

    it('calls onSortChange with undefined when "No Sort" is selected', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      await user.selectOption(sortDropdown, 'No Sort');

      expect(mockCallbacks.onSortChange).toHaveBeenCalledWith(undefined);
    });

    it('allows switching from date-desc to date-asc without intermediate undefined', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      expect(sortDropdown).toHaveDisplayValue('Newest First');

      // Switch to Oldest First
      await user.selectOption(sortDropdown, 'date-asc');

      expect(mockCallbacks.onSortChange).toHaveBeenCalledWith('date-asc');

      // Simulate parent re-rendering with new sortBy value
      rerender(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-asc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const updatedDropdown = screen.getByLabelText('Sort by date') as HTMLSelectElement;
      expect(updatedDropdown).toHaveDisplayValue('Oldest First');
    });

    it('allows switching from date-asc to date-desc', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-asc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      await user.selectOption(sortDropdown, 'date-desc');

      expect(mockCallbacks.onSortChange).toHaveBeenCalledWith('date-desc');

      rerender(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const updatedDropdown = screen.getByLabelText('Sort by date') as HTMLSelectElement;
      expect(updatedDropdown).toHaveDisplayValue('Newest First');
    });
  });

  // ============================================================================
  // INTERACTION TESTS: SORT + OTHER FILTERS
  // ============================================================================

  describe('Filter Interactions: Sort with Search and Status', () => {
    it('does not affect search filter when sort is changed', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryFilters
          search="TRK123"
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      await user.selectOption(sortDropdown, 'date-desc');

      expect(mockCallbacks.onSortChange).toHaveBeenCalledWith('date-desc');
      expect(mockCallbacks.onSearchChange).not.toHaveBeenCalled();
    });

    it('does not affect status filter when sort is changed', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryFilters
          search=""
          status="PENDING"
          sortBy={undefined}
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      await user.selectOption(sortDropdown, 'date-asc');

      expect(mockCallbacks.onSortChange).toHaveBeenCalledWith('date-asc');
      expect(mockCallbacks.onStatusChange).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ACTIVE FILTERS DISPLAY
  // ============================================================================

  describe('Active Filters Display with Sort', () => {
    it('displays "Sort: Newest" in active filters when sortBy is "date-desc"', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Sort: Newest')).toBeInTheDocument();
    });

    it('displays "Sort: Oldest" in active filters when sortBy is "date-asc"', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-asc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Sort: Oldest')).toBeInTheDocument();
    });

    it('does not display sort in active filters when sortBy is undefined', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      expect(screen.queryByText(/Sort:/)).not.toBeInTheDocument();
    });

    it('displays combined filters when sort is combined with search', () => {
      render(
        <DeliveryFilters
          search="TRK123"
          status={undefined}
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Search: TRK123')).toBeInTheDocument();
      expect(screen.getByText('Sort: Newest')).toBeInTheDocument();
    });

    it('displays combined filters when sort is combined with status', () => {
      render(
        <DeliveryFilters
          search=""
          status="PENDING"
          sortBy="date-asc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Status: PENDING')).toBeInTheDocument();
      expect(screen.getByText('Sort: Oldest')).toBeInTheDocument();
    });

    it('displays all three filters combined', () => {
      render(
        <DeliveryFilters
          search="TRK456"
          status="ACCEPTED"
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText('Search: TRK456')).toBeInTheDocument();
      expect(screen.getByText('Status: ACCEPTED')).toBeInTheDocument();
      expect(screen.getByText('Sort: Newest')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // CLEAR ALL FUNCTIONALITY
  // ============================================================================

  describe('Clear All Filters including Sort', () => {
    it('shows "Clear All" button when hasActiveFilters is true and sort is active', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const clearButton = screen.getByRole('button', { name: /Clear All/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('calls onClearAll when "Clear All" button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const clearButton = screen.getByRole('button', { name: /Clear All/i });
      await user.click(clearButton);

      expect(mockCallbacks.onClearAll).toHaveBeenCalledTimes(1);
    });

    it('hides "Clear All" button when hasActiveFilters is false', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      expect(screen.queryByRole('button', { name: /Clear All/i })).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases & Error Handling', () => {
    it('handles undefined sortBy gracefully', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date') as HTMLSelectElement;
      expect(sortDropdown.value).toBe('');
    });

    it('renders with minimal props', () => {
      const minimalCallbacks = {
        onSearchChange: jest.fn(),
        onStatusChange: jest.fn(),
        onSortChange: jest.fn(),
        onClearAll: jest.fn(),
      };

      render(
        <DeliveryFilters
          hasActiveFilters={false}
          {...minimalCallbacks}
        />
      );

      expect(screen.getByLabelText('Sort by date')).toBeInTheDocument();
    });

    it('handles rapid sort changes', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');

      // Rapid changes
      await user.selectOption(sortDropdown, 'date-desc');
      await user.selectOption(sortDropdown, 'date-asc');
      await user.selectOption(sortDropdown, 'date-desc');

      expect(mockCallbacks.onSortChange).toHaveBeenCalledTimes(3);
      expect(mockCallbacks.onSortChange).toHaveBeenNthCalledWith(1, 'date-desc');
      expect(mockCallbacks.onSortChange).toHaveBeenNthCalledWith(2, 'date-asc');
      expect(mockCallbacks.onSortChange).toHaveBeenNthCalledWith(3, 'date-desc');
    });
  });

  // ============================================================================
  // ACCESSIBILITY
  // ============================================================================

  describe('Accessibility: Sort Controls', () => {
    it('has proper label for sort dropdown', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const label = screen.getByText('Sort by Date');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('text-sm', 'font-medium');
    });

    it('sort dropdown has aria-label', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      expect(sortDropdown).toHaveAttribute('aria-label', 'Sort by date');
    });

    it('sort dropdown is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');

      // Tab to dropdown and interact with keyboard
      sortDropdown.focus();
      expect(document.activeElement).toBe(sortDropdown);

      // Simulate keyboard navigation
      await user.keyboard('{ArrowDown}');
      // (Exact keyboard behavior depends on browser, but dropdown should be interactive)
    });

    it('active filters display is visually distinct', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const filterBadge = screen.getByText('Sort: Newest');
      expect(filterBadge).toHaveClass('inline-flex', 'items-center', 'px-3', 'py-1', 'rounded-full', 'text-sm', 'font-medium');
    });

    it('Clear All button is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy="date-desc"
          hasActiveFilters={true}
          {...mockCallbacks}
        />
      );

      const clearButton = screen.getByRole('button', { name: /Clear All/i });
      clearButton.focus();
      expect(document.activeElement).toBe(clearButton);

      await user.keyboard('{Enter}');
      expect(mockCallbacks.onClearAll).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // VISUAL STATE TESTS
  // ============================================================================

  describe('Visual States & Styling', () => {
    it('applies correct styling to sort dropdown', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      expect(sortDropdown).toHaveClass('w-full', 'px-3', 'py-2', 'border', 'border-gray-300', 'rounded-lg');
    });

    it('applies dark mode classes to sort dropdown', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      const sortDropdown = screen.getByLabelText('Sort by date');
      const className = sortDropdown.getAttribute('class') || '';
      expect(className).toContain('dark:bg-gray-700');
      expect(className).toContain('dark:border-gray-600');
      expect(className).toContain('dark:text-white');
    });

    it('displays ChevronDown icon in sort dropdown', () => {
      render(
        <DeliveryFilters
          search=""
          status={undefined}
          sortBy={undefined}
          hasActiveFilters={false}
          {...mockCallbacks}
        />
      );

      // The ChevronDown icon is positioned absolute and has specific classes
      const chevrons = document.querySelectorAll('svg[class*="chevron"]');
      expect(chevrons.length).toBeGreaterThan(0);
    });
  });
});
