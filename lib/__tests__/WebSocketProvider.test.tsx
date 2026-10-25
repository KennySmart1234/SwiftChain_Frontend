import React from 'react';
import { render, screen, act } from '@testing-library/react';
import {
  WebSocketProvider,
  useWebSocketContext,
} from '@/lib/WebSocketProvider';
import { socketService } from '@/lib/websocket';

jest.mock('@/lib/websocket', () => {
  let listeners: Function[] = [];
  return {
    socketService: {
      status: 'disconnected',
      lastError: null,
      reconnectAttempts: 0,
      connectSocket: jest.fn(),
      disconnectSocket: jest.fn(),
      reconnect: jest.fn(),
      onStatusChange: jest.fn((cb: Function) => {
        listeners.push(cb);
        cb(socketService.status, socketService.lastError, socketService.reconnectAttempts);
        return () => {
          listeners = listeners.filter((l) => l !== cb);
        };
      }),
      _triggerStatus(status: string, error: any = null, attempts = 0) {
        (socketService as any).status = status;
        (socketService as any).lastError = error;
        (socketService as any).reconnectAttempts = attempts;
        listeners.forEach((cb) => cb(status, error, attempts));
      },
    },
    DEFAULT_SOCKET_RECONNECT_CONFIG: {},
  };
});

function TestConsumer() {
  const { isConnected, status, error, reconnectAttempts, reconnect } =
    useWebSocketContext();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="connected">{String(isConnected)}</div>
      <div data-testid="attempts">{reconnectAttempts}</div>
      <div data-testid="error">{error ? error.message : 'none'}</div>
      <button onClick={reconnect}>Manual Reconnect</button>
    </div>
  );
}

describe('WebSocketProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (socketService as any).status = 'disconnected';
    (socketService as any).lastError = null;
    (socketService as any).reconnectAttempts = 0;
  });

  it('stays disconnected when token is null', () => {
    render(
      <WebSocketProvider token={null}>
        <TestConsumer />
      </WebSocketProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
    expect(socketService.connectSocket).not.toHaveBeenCalled();
  });

  it('calls connectSocket when token is provided', () => {
    render(
      <WebSocketProvider token="jwt-token-abc">
        <TestConsumer />
      </WebSocketProvider>,
    );

    expect(socketService.connectSocket).toHaveBeenCalledWith(
      'jwt-token-abc',
      undefined,
    );
  });

  it('updates context when status changes to connected and reconnecting', () => {
    render(
      <WebSocketProvider token="jwt-token-abc">
        <TestConsumer />
      </WebSocketProvider>,
    );

    act(() => {
      (socketService as any)._triggerStatus('connected', null, 0);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('connected');
    expect(screen.getByTestId('connected')).toHaveTextContent('true');

    act(() => {
      (socketService as any)._triggerStatus('reconnecting', null, 2);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('reconnecting');
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
    expect(screen.getByTestId('attempts')).toHaveTextContent('2');
  });

  it('displays error in context when socket encounters error', () => {
    render(
      <WebSocketProvider token="jwt-token-abc">
        <TestConsumer />
      </WebSocketProvider>,
    );

    act(() => {
      (socketService as any)._triggerStatus(
        'error',
        new Error('Failed to connect'),
        5,
      );
    });

    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('error')).toHaveTextContent('Failed to connect');
  });

  it('calls socketService.reconnect on button click', () => {
    render(
      <WebSocketProvider token="jwt-token-abc">
        <TestConsumer />
      </WebSocketProvider>,
    );

    screen.getByRole('button', { name: 'Manual Reconnect' }).click();
    expect(socketService.reconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects on unmount', () => {
    const { unmount } = render(
      <WebSocketProvider token="jwt-token-abc">
        <TestConsumer />
      </WebSocketProvider>,
    );

    unmount();
    expect(socketService.disconnectSocket).toHaveBeenCalled();
  });
});
