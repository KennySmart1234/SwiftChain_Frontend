import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FleetAnalyticsDashboard } from '@/components/dashboard/FleetAnalyticsDashboard';
import { PerformanceMetricsDashboard } from '@/components/dashboard/PerformanceMetricsDashboard';
import { useAnalyticsMetrics } from '@/hooks/useAnalyticsMetrics';
import type { FleetAnalytics, PerformanceMetrics } from '@/types/analytics';

jest.mock('@/hooks/useAnalyticsMetrics');

const mockedUseAnalyticsMetrics = useAnalyticsMetrics as jest.MockedFunction<
  typeof useAnalyticsMetrics
>;

const fleet: FleetAnalytics = {
  period: '30d',
  utilizationRate: 84.5,
  onTimeRate: 92.1,
  totalMiles: 12540,
  fuelEfficiency: 8.4,
  costPerMile: 1.28,
  activeVehicles: 42,
  totalVehicles: 50,
  utilizationTrend: [
    { label: 'Mon', value: 80 },
    { label: 'Tue', value: 84 },
  ],
  deliveryTrend: [
    { label: 'Mon', value: 24 },
    { label: 'Tue', value: 31 },
  ],
  statusBreakdown: [
    { label: 'Active', value: 42 },
    { label: 'Idle', value: 8 },
  ],
  recentEvents: [],
};

const performance: PerformanceMetrics = {
  averageDeliveryTime: 3.4,
  deliverySuccessRate: 97.2,
  customerSatisfaction: 4.8,
  operatingCost: 18420,
  activeDeliveries: 12,
  completedDeliveries: 248,
  performanceTrend: [
    { label: 'Mon', value: 95 },
    { label: 'Tue', value: 97 },
  ],
  costTrend: [
    { label: 'Mon', value: 4200 },
    { label: 'Tue', value: 3980 },
  ],
};

function mockLoaded(
  overrides: Partial<ReturnType<typeof useAnalyticsMetrics>> = {}
) {
  mockedUseAnalyticsMetrics.mockReturnValue({
    fleet,
    performance,
    period: '30d',
    isLoading: false,
    error: null,
    setPeriod: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  });
}

describe('FleetAnalyticsDashboard', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders fleet KPIs and charts from the analytics hook', () => {
    mockLoaded();
    render(<FleetAnalyticsDashboard />);

    expect(
      screen.getByRole('heading', { name: 'Fleet analytics' })
    ).toBeInTheDocument();
    expect(screen.getByText('84.5%')).toBeInTheDocument();
    expect(screen.getByText('12,540 mi')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Fleet utilization trend chart' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Fleet status chart' })
    ).toBeInTheDocument();
  });

  it('changes the selected period through the hook', () => {
    const setPeriod = jest.fn();
    mockLoaded({ setPeriod });
    render(<FleetAnalyticsDashboard />);

    fireEvent.change(screen.getByLabelText('Analytics period'), {
      target: { value: '90d' },
    });
    expect(setPeriod).toHaveBeenCalledWith('90d');
  });

  it('renders loading and error states', () => {
    mockLoaded({ fleet: null, performance: null, isLoading: true });
    const { rerender } = render(<FleetAnalyticsDashboard />);
    expect(
      screen.getByLabelText('Loading fleet analytics')
    ).toBeInTheDocument();

    mockLoaded({
      fleet: null,
      performance: null,
      isLoading: false,
      error: 'Analytics unavailable',
    });
    rerender(<FleetAnalyticsDashboard />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Analytics unavailable'
    );
  });
});

describe('PerformanceMetricsDashboard', () => {
  it('renders performance KPI values and chart regions', () => {
    mockLoaded();
    render(<PerformanceMetricsDashboard />);

    expect(
      screen.getByRole('heading', { name: 'Performance metrics' })
    ).toBeInTheDocument();
    expect(screen.getByText('97.2%')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Service quality trend chart' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Operating cost trend chart' })
    ).toBeInTheDocument();
  });

  it('refreshes metrics when requested', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    mockLoaded({ refetch });
    render(<PerformanceMetricsDashboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });
});
