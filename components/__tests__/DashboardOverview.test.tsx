import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import { useDashboardData } from '@/hooks/useDashboardData';

jest.mock('@/hooks/useDashboardData');

describe('DashboardOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton placeholders while loading', () => {
    (useDashboardData as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<DashboardOverview />);

    expect(screen.getAllByTestId('skeleton-loader').length).toBeGreaterThan(0);
    expect(screen.queryByText(/dashboard overview/i)).not.toBeInTheDocument();
  });

  it('renders metrics, active shipments, and quick actions when data loads', () => {
    (useDashboardData as jest.Mock).mockReturnValue({
      data: {
        totalDeliveries: 1450,
        activeDrivers: 32,
        metrics: [
          { label: 'Completed', value: '1284' },
          { label: 'Escrowed', value: '$245k' },
        ],
        shipments: [
          {
            id: 'SC-1048',
            route: 'Lagos → Abuja',
            status: 'In transit',
            eta: '18 min',
          },
        ],
        quickActions: ['Create delivery', 'Assign driver'],
      },
      isLoading: false,
      error: null,
    });

    render(<DashboardOverview />);

    expect(
      screen.getByRole('heading', { name: /dashboard overview/i })
    ).toBeInTheDocument();
    expect(screen.getByText('1450')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText(/active shipments/i)).toBeInTheDocument();
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    expect(screen.getByText('SC-1048')).toBeInTheDocument();
    expect(screen.getByText('Create delivery')).toBeInTheDocument();
  });

  it('renders an error state if data fetching fails', () => {
    (useDashboardData as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch dashboard metrics'),
    });

    render(<DashboardOverview />);

    expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
    expect(
      screen.getByText(/failed to fetch dashboard metrics/i)
    ).toBeInTheDocument();
  });
});
