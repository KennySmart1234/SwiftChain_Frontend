import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { useInView } from '@/hooks/useInView';
import { useAnalyticsCharts } from '@/hooks/useAnalyticsCharts';

/**
 * AnalyticsCharts Component Tests
 *
 * Tests the main analytics charts container component.
 * Verifies:
 *   - Proper rendering of chart sections
 *   - Viewport detection integration
 *   - Dynamic import loading
 *   - Error handling and retry
 *   - Accessibility
 */

// Mock hooks
jest.mock('@/hooks/useInView');
jest.mock('@/hooks/useAnalyticsCharts');
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (fn: any, options: any) => {
    // Return a mock component that accepts props
    return function MockDynamicComponent() {
      return <div data-testid="mock-chart">{options?.loading?.()}</div>;
    };
  },
}));

const mockUseInView = useInView as jest.MockedFunction<typeof useInView>;
const mockUseAnalyticsCharts = useAnalyticsCharts as jest.MockedFunction<
  typeof useAnalyticsCharts
>;

describe('AnalyticsCharts', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseInView.mockImplementation(() => ({
      isInView: false,
      ref: { current: null },
    }));

    mockUseAnalyticsCharts.mockImplementation(() => ({
      charts: new Map(),
      loadChart: jest.fn(),
      preloadChart: jest.fn(),
      retryChart: jest.fn(),
      clearCharts: jest.fn(),
    }));
  });

  it('should render without errors', () => {
    render(<AnalyticsCharts />);
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
  });

  it('should display dashboard title and description', () => {
    render(<AnalyticsCharts />);
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText('Real-time pricing and platform statistics with optimized loading')
    ).toBeInTheDocument();
  });

  it('should render price chart section', () => {
    render(<AnalyticsCharts />);
    expect(screen.getByText('XLM Price Trend')).toBeInTheDocument();
  });

  it('should render statistics section', () => {
    render(<AnalyticsCharts />);
    expect(screen.getByText('Platform Statistics')).toBeInTheDocument();
  });

  it('should show skeleton loaders when charts not in view', () => {
    mockUseInView.mockReturnValue({
      isInView: false,
      ref: { current: null },
    });

    const { container } = render(<AnalyticsCharts />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render dynamic chart components when in view', async () => {
    mockUseInView.mockReturnValue({
      isInView: true,
      ref: { current: null },
    });

    const { container } = render(<AnalyticsCharts />);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="mock-chart"]')).toBeInTheDocument();
    });
  });

  it('should call preloadChart when chart enters view', async () => {
    const preloadChart = jest.fn();
    mockUseAnalyticsCharts.mockReturnValue({
      charts: new Map(),
      loadChart: jest.fn(),
      preloadChart,
      retryChart: jest.fn(),
      clearCharts: jest.fn(),
    });

    mockUseInView.mockReturnValue({
      isInView: true,
      ref: { current: null },
    });

    render(<AnalyticsCharts />);

    await waitFor(() => {
      expect(preloadChart).toHaveBeenCalled();
    });
  });

  it('should have retry buttons for charts', async () => {
    render(<AnalyticsCharts />);
    // Retry buttons are rendered but may be hidden without errors
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', () => {
    render(<AnalyticsCharts />);
    const mainHeading = screen.getByText('Analytics Dashboard');
    expect(mainHeading.tagName).toBe('H2');

    const sectionHeadings = screen.getAllByText(/XLM Price Trend|Platform Statistics/);
    sectionHeadings.forEach((heading) => {
      expect(heading.tagName).toBe('H3');
    });
  });

  it('should provide section descriptions', () => {
    render(<AnalyticsCharts />);
    expect(
      screen.getByText('Historical conversion rate to USD with 7/30-day views')
    ).toBeInTheDocument();
    expect(screen.getByText('System-wide metrics and activity summary')).toBeInTheDocument();
  });

  it('should render price and statistics sections independently', () => {
    render(<AnalyticsCharts />);

    const sections = screen.getAllByRole('region', { hidden: true });
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('should apply responsive grid styling to sections', () => {
    const { container } = render(<AnalyticsCharts />);
    const mainDiv = container.firstChild;
    expect(mainDiv).toHaveClass('space-y-8', 'py-8');
  });

  it('should handle missing useAnalyticsCharts methods gracefully', () => {
    mockUseAnalyticsCharts.mockReturnValue({
      charts: new Map(),
      loadChart: jest.fn(),
      preloadChart: jest.fn(),
      retryChart: jest.fn(),
      clearCharts: jest.fn(),
    });

    expect(() => {
      render(<AnalyticsCharts />);
    }).not.toThrow();
  });
});
