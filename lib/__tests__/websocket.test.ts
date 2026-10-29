import { io } from 'socket.io-client';
import {
  socketService,
  DEFAULT_SOCKET_RECONNECT_CONFIG,
} from '@/lib/websocket';

jest.mock('socket.io-client');

describe('SocketService', () => {
  let mockSocket: any;
  let mockIoManager: any;

  beforeEach(() => {
    socketService.disconnectSocket();
    jest.clearAllMocks();

    const socketListeners: Record<string, Function[]> = {};
    const ioListeners: Record<string, Function[]> = {};

    mockIoManager = {
      on: jest.fn((event: string, cb: Function) => {
        ioListeners[event] = ioListeners[event] || [];
        ioListeners[event].push(cb);
      }),
      emit: (event: string, ...args: any[]) => {
        ioListeners[event]?.forEach((cb) => cb(...args));
      },
    };

    mockSocket = {
      connected: false,
      connect: jest.fn(() => {
        mockSocket.connected = true;
      }),
      disconnect: jest.fn(() => {
        mockSocket.connected = false;
      }),
      on: jest.fn((event: string, cb: Function) => {
        socketListeners[event] = socketListeners[event] || [];
        socketListeners[event].push(cb);
      }),
      off: jest.fn((event: string, cb: Function) => {
        if (socketListeners[event]) {
          socketListeners[event] = socketListeners[event].filter((c) => c !== cb);
        }
      }),
      emitEvent: (event: string, ...args: any[]) => {
        if (event === 'connect') {
          mockSocket.connected = true;
        } else if (event === 'disconnect') {
          mockSocket.connected = false;
        }
        socketListeners[event]?.forEach((cb) => cb(...args));
      },
      io: mockIoManager,
    };

    (io as unknown as jest.Mock).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    socketService.disconnectSocket();
  });

  it('connects with token and default backoff configuration', () => {
    socketService.connectSocket('test-token');

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: 'test-token' },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: DEFAULT_SOCKET_RECONNECT_CONFIG.reconnectionAttempts,
        reconnectionDelay: DEFAULT_SOCKET_RECONNECT_CONFIG.reconnectionDelay,
        reconnectionDelayMax: DEFAULT_SOCKET_RECONNECT_CONFIG.reconnectionDelayMax,
      }),
    );
    expect(socketService.status).toBe('connecting');
  });

  it('updates status to connected when connect event fires', () => {
    socketService.connectSocket('test-token');
    mockSocket.emitEvent('connect');

    expect(socketService.status).toBe('connected');
    expect(socketService.isConnected).toBe(true);
    expect(socketService.reconnectAttempts).toBe(0);
  });

  it('transitions to reconnecting on unexpected disconnect', () => {
    socketService.connectSocket('test-token');
    mockSocket.emitEvent('connect');
    mockSocket.emitEvent('disconnect', 'transport close');

    expect(socketService.status).toBe('reconnecting');
    expect(socketService.isReconnecting).toBe(true);
    expect(socketService.isConnected).toBe(false);
  });

  it('transitions to disconnected on intentional client disconnect', () => {
    socketService.connectSocket('test-token');
    mockSocket.emitEvent('connect');
    mockSocket.emitEvent('disconnect', 'io client disconnect');

    expect(socketService.status).toBe('disconnected');
  });

  it('tracks reconnection attempts and errors from IO manager', () => {
    socketService.connectSocket('test-token');

    mockIoManager.emit('reconnect_attempt', 3);
    expect(socketService.reconnectAttempts).toBe(3);
    expect(socketService.status).toBe('reconnecting');

    const testError = new Error('Connection refused');
    mockIoManager.emit('reconnect_error', testError);
    expect(socketService.lastError).toBe(testError);

    mockIoManager.emit('reconnect_failed');
    expect(socketService.status).toBe('error');
    expect(socketService.lastError?.message).toMatch(/Max reconnection attempts reached/);
  });

  it('notifies status listeners on state transitions and unsubscribes', () => {
    const listener = jest.fn();
    const unsubscribe = socketService.onStatusChange(listener);

    // Initial notification on subscribe
    expect(listener).toHaveBeenCalledWith('disconnected', null, 0);

    socketService.connectSocket('test-token');
    expect(listener).toHaveBeenCalledWith('connecting', null, 0);

    mockSocket.emitEvent('connect');
    expect(listener).toHaveBeenCalledWith('connected', null, 0);

    unsubscribe();
    mockSocket.emitEvent('disconnect', 'transport close');
    // Not called after unsubscription
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('triggers manual error recovery via reconnect()', () => {
    socketService.connectSocket('test-token');
    mockSocket.emitEvent('connect');

    socketService.reconnect();
    expect(mockSocket.connect).toHaveBeenCalled();
    expect(socketService.status).toBe('reconnecting');
  });

  it('disconnects and resets status cleanly', () => {
    socketService.connectSocket('test-token');
    mockSocket.emitEvent('connect');

    socketService.disconnectSocket();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(socketService.status).toBe('disconnected');
    expect(socketService.socket).toBeNull();
  });
});
