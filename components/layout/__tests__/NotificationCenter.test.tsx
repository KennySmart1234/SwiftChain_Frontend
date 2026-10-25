import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationCenter } from '@/components/layout/NotificationCenter';

// Mock Headless UI Popover to avoid portal/floating issues in jsdom
jest.mock('@headlessui/react', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
  PopoverPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockMarkAllAsRead = jest.fn();
const mockUseNotifications = jest.fn();

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => mockUseNotifications(),
}));

const baseReturn = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isError: false,
  markAllAsRead: mockMarkAllAsRead,
};

describe('NotificationCenter', () => {
  beforeEach(() => {
    mockUseNotifications.mockReturnValue(baseReturn);
  });

  afterEach(() => jest.clearAllMocks());

  it('should render the bell icon button', () => {
    render(<NotificationCenter />);
    expect(
      screen.getByRole('button', { name: /notifications/i })
    ).toBeInTheDocument();
  });

  it('should not show unread badge when unreadCount is 0', () => {
    render(<NotificationCenter />);
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
  });

  it('should show unread badge with correct count', () => {
    mockUseNotifications.mockReturnValue({ ...baseReturn, unreadCount: 5 });
    render(<NotificationCenter />);
    const badge = screen.getByTestId('unread-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('5');
  });

  it('should show 99+ when unread count exceeds 99', () => {
    mockUseNotifications.mockReturnValue({ ...baseReturn, unreadCount: 150 });
    render(<NotificationCenter />);
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('99+');
  });

  it('should render empty state when no notifications', () => {
    render(<NotificationCenter />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('should render notification items', () => {
    mockUseNotifications.mockReturnValue({
      ...baseReturn,
      notifications: [
        {
          id: '1',
          title: 'Delivery Update',
          message: 'Your package is out for delivery.',
          type: 'delivery',
          read: false,
          createdAt: '2026-04-28T10:00:00Z',
        },
      ],
      unreadCount: 1,
    });
    render(<NotificationCenter />);
    expect(screen.getByText('Delivery Update')).toBeInTheDocument();
    expect(
      screen.getByText('Your package is out for delivery.')
    ).toBeInTheDocument();
  });

  it('prepends newer shipment status updates before older notifications', () => {
    mockUseNotifications.mockReturnValue({
      ...baseReturn,
      notifications: [
        {
          id: 'older',
          title: 'Shipment picked up',
          message: 'Driver has collected your package.',
          type: 'delivery',
          read: false,
          createdAt: '2026-04-28T09:30:00Z',
        },
        {
          id: 'newer',
          title: 'Shipment in transit',
          message: 'Package is now moving to the destination.',
          type: 'delivery',
          read: false,
          createdAt: '2026-04-28T10:15:00Z',
        },
      ],
      unreadCount: 2,
    });

    const { container } = render(<NotificationCenter />);

    const older = screen.getByText('Shipment picked up');
    const newer = screen.getByText('Shipment in transit');

    expect(
      newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(container.textContent).toContain('Shipment in transit');
    expect(container.textContent).toContain('Shipment picked up');
  });

  it('should show "Mark all as read" button when unread count > 0', () => {
    mockUseNotifications.mockReturnValue({ ...baseReturn, unreadCount: 3 });
    render(<NotificationCenter />);
    expect(
      screen.getByRole('button', { name: /mark all as read/i })
    ).toBeInTheDocument();
  });

  it('should call markAllAsRead when button is clicked', () => {
    mockUseNotifications.mockReturnValue({ ...baseReturn, unreadCount: 3 });
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }));
    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  it('should show loading state', () => {
    mockUseNotifications.mockReturnValue({ ...baseReturn, isLoading: true });
    render(<NotificationCenter />);
    expect(screen.getByText(/loading notifications/i)).toBeInTheDocument();
  });
});
