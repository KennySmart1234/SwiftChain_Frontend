import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import {
  ToastProvider,
  useToastContext,
} from '@/context/ToastProvider';
import { toastService } from '@/lib/toast';

jest.mock('framer-motion', () => {
  const ReactLib = require('react');
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      ReactLib.createElement(ReactLib.Fragment, null, children),
    motion: {
      div: ReactLib.forwardRef(
        (
          { children, layout: _layout, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...rest }: Record<string, unknown>,
          ref: React.Ref<HTMLDivElement>,
        ) => ReactLib.createElement('div', { ref, ...rest }, children as React.ReactNode),
      ),
    },
  };
});

function ToastConsumerHarness() {
  const {
    visibleToasts,
    queuedToasts,
    success,
    error,
    info,
    clearAll,
    syncFromBackend,
  } = useToastContext();

  return (
    <div>
      <span data-testid="visible-count">{visibleToasts.length}</span>
      <span data-testid="queued-count">{queuedToasts.length}</span>
      <button
        type="button"
        onClick={() => success('Delivery confirmed', 'Escrow released')}
      >
        Trigger Success
      </button>
      <button
        type="button"
        onClick={() => error('Payment failed', 'Insufficient XLM balance')}
      >
        Trigger Error
      </button>
      <button
        type="button"
        onClick={() => info('Driver assigned', 'ETA updated')}
      >
        Trigger Info
      </button>
      <button
        type="button"
        onClick={() => {
          for (let i = 1; i <= 5; i += 1) {
            error(`Error #${i}`, `Failure detail ${i}`, 2000);
          }
        }}
      >
        Trigger 5 Rapid Errors
      </button>
      <button type="button" onClick={clearAll}>
        Clear All
      </button>
      <button type="button" onClick={() => void syncFromBackend()}>
        Sync Backend
      </button>
    </div>
  );
}

describe('context/ToastProvider (Issue #429)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });

  it('dispatches Success, Error, and Info toasts via context', () => {
    render(
      <ToastProvider maxVisible={3} defaultDuration={4000}>
        <ToastConsumerHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger Success'));
    fireEvent.click(screen.getByText('Trigger Error'));
    fireEvent.click(screen.getByText('Trigger Info'));

    const items = screen.getAllByTestId('toast-item');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute('data-toast-variant', 'success');
    expect(items[1]).toHaveAttribute('data-toast-variant', 'error');
    expect(items[2]).toHaveAttribute('data-toast-variant', 'info');

    expect(screen.getByText('Delivery confirmed')).toBeInTheDocument();
    expect(screen.getByText('Payment failed')).toBeInTheDocument();
    expect(screen.getByText('Driver assigned')).toBeInTheDocument();
  });

  it('queues overflow toasts smoothly when 5 errors are rapidly triggered and only displays maxVisible (3) on screen', () => {
    render(
      <ToastProvider maxVisible={3} defaultDuration={2000}>
        <ToastConsumerHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger 5 Rapid Errors'));

    // Only 3 should be visible on screen; 2 should remain queued
    expect(screen.getByTestId('visible-count')).toHaveTextContent('3');
    expect(screen.getByTestId('queued-count')).toHaveTextContent('2');
    expect(screen.getAllByTestId('toast-item')).toHaveLength(3);

    expect(screen.getByText('Error #1')).toBeInTheDocument();
    expect(screen.getByText('Error #2')).toBeInTheDocument();
    expect(screen.getByText('Error #3')).toBeInTheDocument();
    expect(screen.queryByText('Error #4')).not.toBeInTheDocument();
    expect(screen.queryByText('Error #5')).not.toBeInTheDocument();
    expect(screen.getByTestId('toast-queue-indicator')).toHaveTextContent(
      '+2 more in queue',
    );
  });

  it('auto-dismisses visible toasts after timeout and promotes queued toasts in FIFO order', () => {
    render(
      <ToastProvider maxVisible={3} defaultDuration={2000}>
        <ToastConsumerHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger 5 Rapid Errors'));
    expect(screen.getAllByTestId('toast-item')).toHaveLength(3);

    // Advance 2000ms: the first 3 visible toasts auto-dismiss and #4 and #5 promote into view
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Error #1')).not.toBeInTheDocument();
    expect(screen.queryByText('Error #2')).not.toBeInTheDocument();
    expect(screen.queryByText('Error #3')).not.toBeInTheDocument();
    expect(screen.getByText('Error #4')).toBeInTheDocument();
    expect(screen.getByText('Error #5')).toBeInTheDocument();
    expect(screen.getByTestId('visible-count')).toHaveTextContent('2');
    expect(screen.getByTestId('queued-count')).toHaveTextContent('0');

    // Advance another 2000ms: #4 and #5 auto-dismiss
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.queryAllByTestId('toast-item')).toHaveLength(0);
  });

  it('immediately promotes the next queued toast when a visible toast is manually dismissed', () => {
    render(
      <ToastProvider maxVisible={3} defaultDuration={5000}>
        <ToastConsumerHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Trigger 5 Rapid Errors'));
    expect(screen.getByText('Error #1')).toBeInTheDocument();
    expect(screen.queryByText('Error #4')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismiss Error #1'));

    expect(screen.queryByText('Error #1')).not.toBeInTheDocument();
    expect(screen.getByText('Error #4')).toBeInTheDocument();
    expect(screen.getByTestId('visible-count')).toHaveTextContent('3');
    expect(screen.getByTestId('queued-count')).toHaveTextContent('1');
  });

  it('retrieves toast messages and config from the backend API via toastService', async () => {
    jest.spyOn(toastService, 'getToastConfig').mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: { duration: 3500, position: 'bottom-right' },
    });
    jest.spyOn(toastService, 'fetchToastMessages').mockResolvedValueOnce({
      success: true,
      message: 'OK',
      data: [
        {
          id: 'srv-1',
          variant: 'error',
          title: 'Node Sync Alert',
          message: 'Stellar RPC latency elevated',
          dismissible: true,
          duration: 3500,
        },
      ],
    });

    render(
      <ToastProvider maxVisible={3}>
        <ToastConsumerHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Sync Backend'));

    await waitFor(() => {
      expect(screen.getByText('Node Sync Alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Stellar RPC latency elevated')).toBeInTheDocument();
  });

  it('throws a descriptive error when useToastContext is used outside ToastProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function InvalidConsumer() {
      useToastContext();
      return null;
    }

    expect(() => render(<InvalidConsumer />)).toThrow(
      'useToastContext must be used within a ToastProvider',
    );
    consoleSpy.mockRestore();
  });
});
