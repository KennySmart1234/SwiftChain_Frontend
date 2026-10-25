'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  socketService,
  SocketConnectionStatus,
  SocketReconnectConfig,
} from '@/lib/websocket';

export interface WebSocketContextType {
  /** Whether the socket is currently connected (backwards-compatible boolean) */
  isConnected: boolean;
  /** Granular connection lifecycle status */
  status: SocketConnectionStatus;
  /** Last connection error, if any */
  error: Error | null;
  /** Current reconnection attempt number */
  reconnectAttempts: number;
  /** Manual reconnection trigger for error recovery */
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  status: 'disconnected',
  error: null,
  reconnectAttempts: 0,
  reconnect: () => {},
});

export interface WebSocketProviderProps {
  children: ReactNode;
  token: string | null | undefined;
  reconnectConfig?: SocketReconnectConfig;
}

/**
 * WebSocketProvider — Manages the global socket lifecycle.
 * Ensures the connection is established only when an authenticated token is present,
 * provides exponential backoff reconnection, connection state tracking, and error recovery.
 */
export const WebSocketProvider = ({
  children,
  token,
  reconnectConfig,
}: WebSocketProviderProps) => {
  const [status, setStatus] = useState<SocketConnectionStatus>(
    socketService.status,
  );
  const [error, setError] = useState<Error | null>(socketService.lastError);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(
    socketService.reconnectAttempts,
  );

  const reconnect = useCallback(() => {
    socketService.reconnect();
  }, []);

  useEffect(() => {
    if (token) {
      socketService.connectSocket(token, reconnectConfig);

      const unsubscribe = socketService.onStatusChange(
        (nextStatus, nextError, nextAttempts) => {
          setStatus(nextStatus);
          setError(nextError);
          setReconnectAttempts(nextAttempts);
        },
      );

      // Also listen to direct socket events if mock socket doesn't drive service status
      const socket = socketService.socket;
      let onConnect: (() => void) | undefined;
      let onDisconnect: (() => void) | undefined;

      if (socket && typeof socket.on === 'function') {
        onConnect = () => setStatus('connected');
        onDisconnect = () => setStatus('disconnected');

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        if (socket.connected) {
          setStatus('connected');
        }
      }

      return () => {
        if (socket && typeof socket.off === 'function') {
          if (onConnect) socket.off('connect', onConnect);
          if (onDisconnect) socket.off('disconnect', onDisconnect);
        }
        unsubscribe();
        socketService.disconnectSocket();
        setStatus('disconnected');
        setError(null);
        setReconnectAttempts(0);
      };
    } else {
      socketService.disconnectSocket();
      setStatus('disconnected');
      setError(null);
      setReconnectAttempts(0);
    }
  }, [token, reconnectConfig]);

  const isConnected = status === 'connected';

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        status,
        error,
        reconnectAttempts,
        reconnect,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to access WebSocket context if needed, though most interactions
 * should happen through feature-specific hooks like useLiveUpdates.
 */
export const useWebSocketContext = () => useContext(WebSocketContext);
