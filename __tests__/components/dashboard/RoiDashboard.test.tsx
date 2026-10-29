import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoiDashboard } from '@/components/dashboard/RoiDashboard';
import { useRoiMetrics } from '@/hooks/useRoiMetrics';
import api from '@/lib/api';

jest.mock('@/lib/api', () => ({ __esModule: true, default: { get: jest.fn() } }));

const mockApi = api as jest.Mocked<typeof api>;
const metrics = {
  totalRevenue: 12000,
  totalCost: 8000,
  totalProfit: 4000,
  roi: 50,
  returnTrends: [{ date: '2026-01', revenue: 12000, cost: 8000, roi: 50 }],
  costBreakdown: [{ category: 'Fuel', amount: 3000, percentage: 37.5 }],
  driverProfitability: [{ driverId: 'd1', driverName: 'Ada', revenue: 5000, cost: 3000, profit: 2000, roi: 66.7 }],
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

describe('useRoiMetrics and RoiDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: metrics } as never);
  });

  it('fetches ROI data from the analytics API and unwraps the response', async () => {
    const { result } = renderHookWithRoi();
    await waitFor(() => expect(result.current.metrics).toEqual(metrics));
    expect(mockApi.get).toHaveBeenCalledWith('/analytics/roi', { params: {} });
    expect(result.current.isError).toBe(false);
  });

  it('renders KPI, trend, cost, and driver widgets', async () => {
    render(<RoiDashboard />, { wrapper });
    expect(screen.getByRole('status')).toHaveTextContent('Loading ROI metrics');
    expect(await screen.findByRole('heading', { name: 'ROI analytics' })).toBeInTheDocument();
    expect(screen.getByText('Total revenue')).toBeInTheDocument();
    expect(screen.getByText('Return trends')).toBeInTheDocument();
    expect(screen.getByText('Cost breakdown')).toBeInTheDocument();
    expect(screen.getByText('Driver profitability')).toBeInTheDocument();
    expect(screen.getByText(/Ada/)).toBeInTheDocument();
  });

  it('shows an error and retries the request', async () => {
    mockApi.get
      .mockRejectedValueOnce(new Error('Analytics unavailable'))
      .mockRejectedValueOnce(new Error('Analytics unavailable'))
      .mockResolvedValueOnce({ data: metrics } as never);
    render(<RoiDashboard />, { wrapper });
    expect(await screen.findByRole('alert', {}, { timeout: 4_000 })).toHaveTextContent('Analytics unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Ada/)).toBeInTheDocument();
  });
});

function renderHookWithRoi() {
  // Kept local to avoid a second test dependency while retaining QueryClient isolation.
  const { renderHook } = require('@testing-library/react') as typeof import('@testing-library/react');
  return renderHook(() => useRoiMetrics(), { wrapper });
}
