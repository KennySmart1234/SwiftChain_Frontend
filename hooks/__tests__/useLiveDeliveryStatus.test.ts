import { renderHook, act } from '@testing-library/react';
import { useLiveDeliveryStatus } from '../useLiveDeliveryStatus';
import {
  deliverySocketService,
  DeliverySocketCallbacks,
} from '@/services/deliverySocketService';

jest.mock('@/services/deliverySocketService', () => ({
  deliverySocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    reconnect: jest.fn(),
    isConnected: false,
    isReconnecting: false,
  },
}));

describe('useLiveDeliveryStatus Hook', () => {
  const DELIVERY_ID = 'del-999';
  let capturedCallbacks: DeliverySocketCallbacks | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallbacks = null;

    (deliverySocketService.connect as jest.Mock).mockImplementation(
      (_id: string, callbacks: DeliverySocketCallbacks) => {
        capturedCallbacks = callbacks;
      },
    );
  });

  it('initializes with default status and connects on mount', () => {
    const { result } = renderHook(() => useLiveDeliveryStatus(DELIVERY_ID));

    expect(result.current.status).toBe('PENDING');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(deliverySocketService.connect).toHaveBeenCalledWith(
      DELIVERY_ID,
      expect.any(Object),
      undefined,
    );
  });

  it('updates isConnected to true when connection is established', () => {
    const { result } = renderHook(() => useLiveDeliveryStatus(DELIVERY_ID));

    act(() => {
      capturedCallbacks?.onConnected?.();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('updates status when status update is received', () => {
    const { result } = renderHook(() => useLiveDeliveryStatus(DELIVERY_ID));

    act(() => {
      capturedCallbacks?.onStatusUpdate('IN_TRANSIT');
    });

    expect(result.current.status).toBe('IN_TRANSIT');
  });

  it('reflects reconnecting state and attempt count on connection drop', () => {
    const { result } = renderHook(() => useLiveDeliveryStatus(DELIVERY_ID));

    act(() => {
      capturedCallbacks?.onConnected?.();
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      capturedCallbacks?.onReconnecting?.(2, 2000);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(true);
    expect(result.current.reconnectAttempts).toBe(2);
  });

  it('sets error when max retries are reached', () => {
    const { result } = renderHook(() => useLiveDeliveryStatus(DELIVERY_ID));

    act(() => {
      capturedCallbacks?.onMaxRetriesReached?.();
    });

    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toMatch(/Max reconnection attempts reached/);
  });

  it('calls deliverySocketService.reconnect when manual reconnect is invoked', () => {
    const { result } = renderHook(() => useLiveDeliveryStatus(DELIVERY_ID));

    act(() => {
      result.current.reconnect();
    });

    expect(deliverySocketService.reconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useLiveDeliveryStatus(DELIVERY_ID));

    unmount();

    expect(deliverySocketService.disconnect).toHaveBeenCalledTimes(1);
  });
});
