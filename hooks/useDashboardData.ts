export interface DashboardShipment {
  id: string;
  route: string;
  status: string;
  eta: string;
}

export interface DashboardOverviewData {
  totalDeliveries: number;
  activeDrivers: number;
  metrics: Array<{ label: string; value: string | number }>;
  shipments: DashboardShipment[];
  quickActions: string[];
}

export function useDashboardData() {
  const data: DashboardOverviewData = {
    totalDeliveries: 1450,
    activeDrivers: 32,
    metrics: [
      { label: 'Completed', value: '1284' },
      { label: 'Pending', value: '96' },
      { label: 'Escrowed', value: '$245k' },
    ],
    shipments: [
      {
        id: 'SC-1048',
        route: 'Lagos → Abuja',
        status: 'In transit',
        eta: '18 min',
      },
      {
        id: 'SC-1021',
        route: 'Accra → Kumasi',
        status: 'Assigned',
        eta: '32 min',
      },
      {
        id: 'SC-1007',
        route: 'Nairobi → Mombasa',
        status: 'Delayed',
        eta: 'Requires review',
      },
    ],
    quickActions: [
      'Create delivery',
      'Assign driver',
      'View analytics',
      'Review escrow',
    ],
  };

  return {
    data,
    isLoading: false,
    error: null,
  };
}
