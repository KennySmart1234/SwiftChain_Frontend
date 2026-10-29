import { render, screen } from '@testing-library/react';
import { ChartSkeletonLoader } from '@/components/dashboard/ChartSkeletonLoader';

/**
 * ChartSkeletonLoader Component Tests
 *
 * Tests skeleton loader rendering and accessibility.
 * Verifies:
 *   - Proper rendering of skeleton elements
 *   - Accessibility attributes
 *   - Animation classes applied
 *   - Structure matches expected layout
 */

describe('ChartSkeletonLoader', () => {
  it('should render without errors', () => {
    render(<ChartSkeletonLoader />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have accessible loading status', () => {
    render(<ChartSkeletonLoader />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Loading chart data');
  });

  it('should include screen reader text', () => {
    render(<ChartSkeletonLoader />);
    const srText = screen.getByText('Chart data is being loaded');
    expect(srText).toHaveClass('sr-only');
  });

  it('should render header skeleton', () => {
    const { container } = render(<ChartSkeletonLoader />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render button skeletons', () => {
    const { container } = render(<ChartSkeletonLoader />);
    const buttonSkeletons = container.querySelectorAll('[style*="height"]');
    expect(buttonSkeletons.length).toBeGreaterThan(0);
  });

  it('should render chart area placeholder', () => {
    const { container } = render(<ChartSkeletonLoader />);
    const chartArea = container.querySelector('.bg-slate-50');
    expect(chartArea).toBeInTheDocument();
  });

  it('should have dark mode classes', () => {
    const { container } = render(<ChartSkeletonLoader />);
    const elements = container.querySelectorAll('[class*="dark:"]');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should render stat card skeletons grid', () => {
    const { container } = render(<ChartSkeletonLoader />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('gap-4');
  });

  it('should have proper spacing classes', () => {
    const { container } = render(<ChartSkeletonLoader />);
    const status = screen.getByRole('status');
    expect(status).toHaveClass('space-y-4');
  });

  it('should render bar chart visualization', () => {
    const { container } = render(<ChartSkeletonLoader />);
    const bars = container.querySelectorAll('[style*="flex"]');
    expect(bars.length).toBeGreaterThan(0);
  });

  it('should have responsive styling', () => {
    const { container } = render(<ChartSkeletonLoader />);
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('sm:grid-cols-2', 'lg:grid-cols-3');
  });

  it('should render multiple stat cards', () => {
    const { container } = render(<ChartSkeletonLoader />);
    const statCards = container.querySelectorAll('.border-slate-200');
    expect(statCards.length).toBeGreaterThanOrEqual(3);
  });
});
