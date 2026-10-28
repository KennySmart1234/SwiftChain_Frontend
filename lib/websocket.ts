import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || '';

export type SocketConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface SocketReconnectConfig {
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  randomizationFactor?: number;
  timeout?: number;
}

export type SocketStatusListener = (
  status: SocketConnectionStatus,
  error: Error | null,
  reconnectAttempts: number,
) => void;

export const DEFAULT_SOCKET_RECONNECT_CONFIG: Required<SocketReconnectConfig> = {
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.5,
  timeout: 20000,
};

/**
 * SocketService — Singleton service responsible for the WebSocket connection.
 * Encapsulates socket.io-client logic away from the React layer.
 * Includes configurable exponential backoff reconnection, connection state tracking,
 * and error recovery.
 */
class SocketService {
  public socket: Socket | null = null;
  private _status: SocketConnectionStatus = 'disconnected';
  private _reconnectAttempts = 0;
  private _lastError: Error | null = null;
  private _statusListeners: Set<SocketStatusListener> = new Set();
  private _lastToken: string | null = null;
  private _reconnectConfig: Required<SocketReconnectConfig> = DEFAULT_SOCKET_RECONNECT_CONFIG;

  get status(): SocketConnectionStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === 'connected' && !!this.socket?.connected;
  }

  get isReconnecting(): boolean {
    return this._status === 'reconnecting';
  }

  get reconnectAttempts(): number {
    return this._reconnectAttempts;
  }

  get lastError(): Error | null {
    return this._lastError;
  }

  /**
   * Subscribes to status, error, and reconnection attempts.
   * Returns an unsubscribe function.
   */
  onStatusChange(listener: SocketStatusListener): () => void {
    this._statusListeners.add(listener);
    // Notify immediately with current state
    listener(this._status, this._lastError, this._reconnectAttempts);
    return () => {
      this._statusListeners.delete(listener);
    };
  }

  private setStatus(status: SocketConnectionStatus, error: Error | null = null) {
    this._status = status;
    this._lastError = error;
    this._statusListeners.forEach((listener) => {
      try {
        listener(status, error, this._reconnectAttempts);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[SocketService] Status listener error:', err);
      }
    });
  }

  connectSocket(token: string, config?: SocketReconnectConfig) {
    if (this.socket?.connected && this._lastToken === token) return;

    // Clean up previous socket if any
    if (this.socket) {
      this.disconnectSocket();
    }

    this._lastToken = token;
    if (config) {
      this._reconnectConfig = { ...DEFAULT_SOCKET_RECONNECT_CONFIG, ...config };
    }

    this.setStatus('connecting');

    const options: Partial<ManagerOptions & SocketOptions> = {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this._reconnectConfig.reconnectionAttempts,
      reconnectionDelay: this._reconnectConfig.reconnectionDelay,
      reconnectionDelayMax: this._reconnectConfig.reconnectionDelayMax,
      randomizationFactor: this._reconnectConfig.randomizationFactor,
      timeout: this._reconnectConfig.timeout,
    };

    const s = io(SOCKET_URL, options);
    this.socket = s;

    s.on('connect', () => {
      this._reconnectAttempts = 0;
      this.setStatus('connected', null);
    });

    s.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') {
        this.setStatus('disconnected', null);
      } else {
        this.setStatus('reconnecting', null);
      }
    });

    s.on('connect_error', (error: Error) => {
      this.setStatus('error', error);
    });

    if (s.io && typeof s.io.on === 'function') {
      s.io.on('reconnect_attempt', (attempt: number) => {
        this._reconnectAttempts = attempt;
        this.setStatus('reconnecting', null);
      });

      s.io.on('reconnect', () => {
        this._reconnectAttempts = 0;
        this.setStatus('connected', null);
      });

      s.io.on('reconnect_error', (error: Error) => {
        this._lastError = error;
      });

      s.io.on('reconnect_failed', () => {
        this.setStatus('error', new Error('Max reconnection attempts reached'));
      });
    }
  }

  /**
   * Manually trigger error recovery / reconnection attempt.
   */
  reconnect() {
    if (this.socket) {
      this._reconnectAttempts = 0;
      this.setStatus('reconnecting', null);
      this.socket.connect();
    } else if (this._lastToken) {
      this.connectSocket(this._lastToken);
    }
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._reconnectAttempts = 0;
    this.setStatus('disconnected', null);
  }
}

export const socketService = new SocketService();
