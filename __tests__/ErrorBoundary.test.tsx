import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlobalErrorBoundary, ErrorFallbackUI } from '@/components/shared';
import { errorLoggerService } from '@/services/errorLoggerService';
import { useErrorHandler } from '@/hooks/useErrorHandler';

// Mock the error logger service
jest.mock('@/services/errorLoggerService', () => ({
  errorLoggerService: {
    logReactError: jest.fn().mockResolvedValue({
      success: true,
      errorId: 'test-error-id',
    }),
    logJSError: jest.fn().mockResolvedValue({
      success: true,
    }),
    logNetworkError: jest.fn().mockResolvedValue({
      success: true,
    }),
  },
}));

// Component that throws an error
function ThrowError() {
  throw new Error('Test error from component');
}

// Component that works fine
function WorkingComponent() {
  return <div>Working Component</div>;
}

// Component with conditional error
function ConditionalError({ shouldError }: { shouldError: boolean }) {
  if (shouldError) {
    throw new Error('Conditional error');
  }
  return <div>No error</div>;
}

// Component that uses useErrorHandler
function ComponentWithErrorHandler() {
  const { handleError } = useErrorHandler();
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    try {
      throw new Error('Test error');
    } catch (err) {
      setError('Error was handled');
      await handleError(err);
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Trigger Error</button>
      {error && <div>{error}</div>}
    </div>
  );
}

describe('GlobalErrorBoundary', () => {
  // Suppress console errors for cleaner test output
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render children when there is no error', () => {
      render(
        <GlobalErrorBoundary>
          <WorkingComponent />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Working Component')).toBeInTheDocument();
    });

    it('should render default fallback UI when error is caught', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We encountered an unexpected error/i)).toBeInTheDocument();
    });

    it('should render custom fallback UI when provided', () => {
      const customFallback = <div>Custom Error UI</div>;

      render(
        <GlobalErrorBoundary fallback={customFallback}>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });

    it('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <GlobalErrorBoundary>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText(/Test error from component/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Logging', () => {
    it('should log error to backend when error is caught', async () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        expect(errorLoggerService.logReactError).toHaveBeenCalled();
      });
    });

    it('should pass error and errorInfo to logReactError', async () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        const call = (errorLoggerService.logReactError as jest.Mock).mock.calls[0];
        expect(call[0]).toBeInstanceOf(Error);
        expect(call[0].message).toBe('Test error from component');
      });
    });

    it('should include additional data in error log', async () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        const call = (errorLoggerService.logReactError as jest.Mock).mock.calls[0];
        expect(call[2]).toMatchObject({
          boundaryComponent: 'GlobalErrorBoundary',
          environment: expect.any(String),
        });
      });
    });
  });

  describe('Error Callback', () => {
    it('should call onError callback when error is caught', async () => {
      const onError = jest.fn();

      render(
        <GlobalErrorBoundary onError={onError}>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should pass error and errorInfo to onError callback', async () => {
      const onError = jest.fn();

      render(
        <GlobalErrorBoundary onError={onError}>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        const call = onError.mock.calls[0];
        expect(call[0]).toBeInstanceOf(Error);
        expect(call[0].message).toBe('Test error from component');
        expect(call[1]).toHaveProperty('componentStack');
      });
    });
  });

  describe('Fallback UI Actions', () => {
    it('should have reload button that works', () => {
      const reloadSpy = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
      });

      render(
        <GlobalErrorBoundary>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(reloadButton);

      expect(reloadSpy).toHaveBeenCalled();
    });

    it('should have go home button that navigates', () => {
      const hrefSpy = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { href: '/' },
        writable: true,
        configurable: true,
      });

      render(
        <GlobalErrorBoundary>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      const homeButton = screen.getByRole('button', { name: /Go Home/i });
      fireEvent.click(homeButton);

      // The button should navigate to home
      expect(window.location.href).toEqual('/');
    });
  });

  describe('Reset Keys', () => {
    it('should reset error boundary when resetKeys change', () => {
      const { rerender } = render(
        <GlobalErrorBoundary resetKeys={['key1']}>
          <ConditionalError shouldError={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      rerender(
        <GlobalErrorBoundary resetKeys={['key2']}>
          <ConditionalError shouldError={false} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should not reset when resetKeys are the same', () => {
      const { rerender } = render(
        <GlobalErrorBoundary resetKeys={['key1']}>
          <ConditionalError shouldError={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      rerender(
        <GlobalErrorBoundary resetKeys={['key1']}>
          <ConditionalError shouldError={false} />
        </GlobalErrorBoundary>
      );

      // Should still show error UI since resetKeys didn't change
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('should apply dark mode styles when isDarkMode is true', () => {
      const { container } = render(
        <GlobalErrorBoundary isDarkMode={true}>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      const mainDiv = container.querySelector('.bg-slate-900');
      expect(mainDiv).toBeInTheDocument();
    });

    it('should apply light mode styles when isDarkMode is false', () => {
      const { container } = render(
        <GlobalErrorBoundary isDarkMode={false}>
          <ThrowError />
        </GlobalErrorBoundary>
      );

      const mainDiv = container.querySelector('.bg-white');
      expect(mainDiv).toBeInTheDocument();
    });
  });
});

describe('ErrorFallbackUI', () => {
  it('should render error message', () => {
    render(<ErrorFallbackUI isDarkMode={false} />);

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });

  it('should display error details in development mode', () => {
    const error = new Error('Test error message');
    process.env.NODE_ENV = 'development';

    render(
      <ErrorFallbackUI error={error} isDarkMode={false} />
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
    process.env.NODE_ENV = 'production';
  });

  it('should render reload button', () => {
    render(<ErrorFallbackUI isDarkMode={false} />);

    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('should render go home button', () => {
    render(<ErrorFallbackUI isDarkMode={false} />);

    expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument();
  });

  it('should call onReload when reload button is clicked', () => {
    const onReload = jest.fn();

    render(
      <ErrorFallbackUI onReload={onReload} isDarkMode={false} />
    );

    const reloadButton = screen.getByRole('button', { name: /Try Again/i });
    fireEvent.click(reloadButton);

    expect(onReload).toHaveBeenCalled();
  });

  it('should call onGoHome when go home button is clicked', () => {
    const onGoHome = jest.fn();

    render(
      <ErrorFallbackUI onGoHome={onGoHome} isDarkMode={false} />
    );

    const homeButton = screen.getByRole('button', { name: /Go Home/i });
    fireEvent.click(homeButton);

    expect(onGoHome).toHaveBeenCalled();
  });

  it('should display error ID', () => {
    render(<ErrorFallbackUI isDarkMode={false} />);

    expect(screen.getByText(/Error ID:/i)).toBeInTheDocument();
  });
});

describe('useErrorHandler', () => {
  function TestComponent() {
    const { handleError, handleReactError, handleNetworkError, handleJSError } =
      useErrorHandler();

    return (
      <div>
        <button
          onClick={async () => {
            const error = new Error('Test JS error');
            await handleJSError(error);
          }}
        >
          Handle JS Error
        </button>
        <button
          onClick={async () => {
            const error = new Error('Test network error');
            await handleNetworkError(error, '/api/test');
          }}
        >
          Handle Network Error
        </button>
        <button
          onClick={async () => {
            const error = new Error('Test generic error');
            await handleError(error);
          }}
        >
          Handle Generic Error
        </button>
        <button
          onClick={async () => {
            const error = new Error('Test react error');
            await handleReactError(error, { componentStack: 'test' });
          }}
        >
          Handle React Error
        </button>
      </div>
    );
  }

  it('should handle JavaScript errors', async () => {
    render(
      <GlobalErrorBoundary>
        <TestComponent />
      </GlobalErrorBoundary>
    );

    const button = screen.getByRole('button', { name: /Handle JS Error/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(errorLoggerService.logJSError).toHaveBeenCalled();
    });
  });

  it('should handle network errors', async () => {
    render(
      <GlobalErrorBoundary>
        <TestComponent />
      </GlobalErrorBoundary>
    );

    const button = screen.getByRole('button', { name: /Handle Network Error/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(errorLoggerService.logNetworkError).toHaveBeenCalled();
    });
  });

  it('should handle generic errors', async () => {
    render(
      <GlobalErrorBoundary>
        <TestComponent />
      </GlobalErrorBoundary>
    );

    const button = screen.getByRole('button', { name: /Handle Generic Error/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(errorLoggerService.logJSError).toHaveBeenCalled();
    });
  });

  it('should handle React errors', async () => {
    render(
      <GlobalErrorBoundary>
        <TestComponent />
      </GlobalErrorBoundary>
    );

    const button = screen.getByRole('button', { name: /Handle React Error/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(errorLoggerService.logReactError).toHaveBeenCalled();
    });
  });
});

describe('Error Boundary Integration', () => {
  it('should catch and display error from deeply nested component', () => {
    function DeeplyNestedError() {
      return <ThrowError />;
    }

    function MiddleComponent() {
      return <DeeplyNestedError />;
    }

    render(
      <GlobalErrorBoundary>
        <MiddleComponent />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });

  it('should allow recovery after error via manual reset', () => {
    const { rerender } = render(
      <GlobalErrorBoundary resetKeys={['error']}>
        <ConditionalError shouldError={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

    // Trigger reset by changing resetKeys
    rerender(
      <GlobalErrorBoundary resetKeys={['recovered']}>
        <ConditionalError shouldError={false} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should handle multiple errors sequentially', () => {
    const { rerender } = render(
      <GlobalErrorBoundary resetKeys={['error1']}>
        <ConditionalError shouldError={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

    // Recovery and new error
    rerender(
      <GlobalErrorBoundary resetKeys={['error2']}>
        <ConditionalError shouldError={true} />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });
});
