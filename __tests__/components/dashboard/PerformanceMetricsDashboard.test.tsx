import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PerformanceMetricsDashboard } from '@/components/dashboard/PerformanceMetricsDashboard';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import api from '@/lib/api';

jest.mock('@/lib/api', () => ({ __esModule: true, default: { get: jest.fn() } }));

const mockApi = api as jest.Mocked<typeof api>;
const metrics = {
  totalDeliveries: 1250,
  completionRate: 96.4,
  averageDeliveryMinutes: 42,
  deliveryTimes: [{ date: '2026-01', averageMinutes: 42 }],
  completionRates: [{ date: '2026-01', completed: 1205, cancelled: 45, rate: 96.4 }],
  regionalVolume: [{ region: 'Lagos', volume: 700, percentage: 56 }],
  driverRankings: [{ driverId: 'd1', driverName: 'Bola', deliveries: 120, completionRate: 98, averageDeliveryMinutes: 38, score: 97.5 }],
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

describe('usePerformanceMetrics and PerformanceMetricsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: metrics } as never);
  });

  it('fetches performance metrics with filter parameters', async () => {
    const { result } = renderHook(() => usePerformanceMetrics({ region: 'Lagos', limit: 10 }), { wrapper });
    await waitFor(() => expect(result.current.metrics).toEqual(metrics));
    expect(mockApi.get).toHaveBeenCalledWith('/analytics/performance', { params: { region: 'Lagos', limit: 10 } });
  });

  it('renders KPI cards and all dashboard widget sections', async () => {
    render(<PerformanceMetricsDashboard />, { wrapper });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Performance metrics' })).toBeInTheDocument();
    expect(screen.getByText('Total deliveries')).toBeInTheDocument();
    expect(screen.getByText('Delivery times')).toBeInTheDocument();
    expect(screen.getByText('Completion rates')).toBeInTheDocument();
    expect(screen.getByText('Regional volume')).toBeInTheDocument();
    expect(screen.getByText('Driver rankings')).toBeInTheDocument();
    expect(screen.getByText(/Bola/)).toBeInTheDocument();
  });

  it('shows an error and supports retrying the dashboard request', async () => {
    mockApi.get
      .mockRejectedValueOnce(new Error('Metrics unavailable'))
      .mockRejectedValueOnce(new Error('Metrics unavailable'))
      .mockResolvedValueOnce({ data: metrics } as never);
    render(<PerformanceMetricsDashboard />, { wrapper });
    expect(await screen.findByRole('alert', {}, { timeout: 4_000 })).toHaveTextContent('Metrics unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Bola/)).toBeInTheDocument();
  });
});
