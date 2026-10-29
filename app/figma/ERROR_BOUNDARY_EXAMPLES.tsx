/**
 * ERROR BOUNDARY USAGE EXAMPLES
 * 
 * This file demonstrates various ways to use the GlobalErrorBoundary
 * component and useErrorHandler hook in your application.
 * 
 * These are reference examples - do not import directly in production.
 */

import { GlobalErrorBoundary, ErrorFallbackUI } from '@/components/shared';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useState } from 'react';

/**
 * Example 1: Basic Error Boundary at Root Level
 * 
 * Wrap your entire app to catch any unhandled render errors
 */
export function Example1_RootLevelBoundary() {
  return (
    <GlobalErrorBoundary isDarkMode={false}>
      {/* Your entire app */}
    </GlobalErrorBoundary>
  );
}

/**
 * Example 2: Section-Level Error Boundaries
 * 
 * Isolate errors in different sections so one error doesn't crash the whole page
 */
export function Example2_SectionLevelBoundaries() {
  return (
    <div className="dashboard-layout">
      <header>Dashboard</header>

      <main className="grid grid-cols-3 gap-4">
        {/* Each section is isolated */}
        <GlobalErrorBoundary>
          <DeliveryStatsCard />
        </GlobalErrorBoundary>

        <GlobalErrorBoundary>
          <DriverMetricsCard />
        </GlobalErrorBoundary>

        <GlobalErrorBoundary>
          <RevenueChartCard />
        </GlobalErrorBoundary>
      </main>

      {/* Shared footer - separate boundary */}
      <GlobalErrorBoundary>
        <Footer />
      </GlobalErrorBoundary>
    </div>
  );
}

/**
 * Example 3: Error Callback for Custom Handling
 * 
 * Execute custom logic when errors are caught
 */
export function Example3_CustomErrorCallback() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Track in analytics
    console.log('Tracking error in analytics:', error.message);

    // Send alert to Slack/Discord/Email
    console.log('Alerting team about error');

    // Show custom toast
    console.log('Showing toast notification to user');
  };

  return (
    <GlobalErrorBoundary onError={handleError}>
      <CriticalSection />
    </GlobalErrorBoundary>
  );
}

/**
 * Example 4: Custom Fallback UI
 * 
 * Provide your own error UI instead of the default
 */
export function Example4_CustomFallbackUI() {
  return (
    <GlobalErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">📦 Delivery System Error</h1>
          <p className="text-gray-600 mb-6">
            We had trouble loading your deliveries. Try refreshing or contact support.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      }
    >
      <DeliveryList />
    </GlobalErrorBoundary>
  );
}

/**
 * Example 5: Auto-Reset on Data Change
 * 
 * Automatically reset error boundary when dependencies change
 */
export function Example5_AutoResetOnChange() {
  const [userId, setUserId] = useState('1');

  return (
    <div>
      <button onClick={() => setUserId(userId === '1' ? '2' : '1')}>
        Switch User
      </button>

      {/* Error boundary resets when userId changes */}
      <GlobalErrorBoundary resetKeys={[userId]}>
        <UserProfile userId={userId} />
      </GlobalErrorBoundary>
    </div>
  );
}

/**
 * Example 6: Using useErrorHandler Hook in Component
 * 
 * Handle specific errors in async operations
 */
export function Example6_UseErrorHandlerHook() {
  const { handleError, handleNetworkError } = useErrorHandler();

  const fetchDeliveries = async () => {
    try {
      const response = await fetch('/api/deliveries');
      if (!response.ok) {
        throw new Error('Failed to fetch deliveries');
      }
      return response.json();
    } catch (error) {
      await handleNetworkError(error, '/api/deliveries', {
        action: 'fetchDeliveries',
      });
    }
  };

  return (
    <button onClick={fetchDeliveries}>
      Load Deliveries
    </button>
  );
}

/**
 * Example 7: Error Testing Component
 * 
 * Use this component to test error boundaries in development
 */
export function Example7_ErrorTestingComponent() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('This is a test error from Example7_ErrorTestingComponent');
  }

  return (
    <div className="p-4 border-2 border-yellow-400 bg-yellow-50 rounded">
      <h3 className="font-bold mb-2">Error Testing Component</h3>
      <p className="text-sm mb-4">Use this to test error boundaries in development</p>
      <button
        onClick={() => setShouldError(true)}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Trigger Error
      </button>
    </div>
  );
}

/**
 * Example 8: Nested Error Boundaries
 * 
 * Use multiple layers of error boundaries for granular control
 */
export function Example8_NestedErrorBoundaries() {
  return (
    <GlobalErrorBoundary>
      {/* Outer boundary catches any errors in dashboard */}
      <div className="dashboard">
        <GlobalErrorBoundary>
          {/* Inner boundary catches only sidebar errors */}
          <Sidebar />
        </GlobalErrorBoundary>

        <div className="main-content">
          <GlobalErrorBoundary>
            {/* Inner boundary catches only header errors */}
            <Header />
          </GlobalErrorBoundary>

          <GlobalErrorBoundary>
            {/* Inner boundary catches only content errors */}
            <Content />
          </GlobalErrorBoundary>
        </div>
      </div>
    </GlobalErrorBoundary>
  );
}

/**
 * Example 9: Dark Mode Support
 * 
 * Use isDarkMode prop to match your app's theme
 */
export function Example9_DarkModeSupport() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div>
      <button onClick={() => setIsDark(!isDark)}>Toggle Dark Mode</button>

      <GlobalErrorBoundary isDarkMode={isDark}>
        <MyAppContent />
      </GlobalErrorBoundary>
    </div>
  );
}

/**
 * Example 10: Complete Integration
 * 
 * Full example combining multiple features
 */
export function Example10_CompleteIntegration() {
  const [isDark, setIsDark] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Application error caught:', error);
    // Could send to error tracking service like Sentry
  };

  return (
    <div className={isDark ? 'dark' : 'light'}>
      {/* Root error boundary */}
      <GlobalErrorBoundary
        onError={handleError}
        isDarkMode={isDark}
      >
        <div className="app-layout">
          {/* Header section with theme toggle */}
          <GlobalErrorBoundary resetKeys={[isDark]}>
            <header className="flex justify-between items-center p-4">
              <h1>SwiftChain Deliveries</h1>
              <button onClick={() => setIsDark(!isDark)}>
                {isDark ? '☀️' : '🌙'}
              </button>
            </header>
          </GlobalErrorBoundary>

          {/* Main content */}
          <main className="p-4">
            {/* List section - resets when selection changes */}
            <GlobalErrorBoundary resetKeys={[selectedDelivery]}>
              <DeliveryListSection
                onSelect={setSelectedDelivery}
                selected={selectedDelivery}
              />
            </GlobalErrorBoundary>

            {/* Detail section */}
            {selectedDelivery && (
              <GlobalErrorBoundary>
                <DeliveryDetailSection deliveryId={selectedDelivery} />
              </GlobalErrorBoundary>
            )}

            {/* Testing component - only in development */}
            {process.env.NODE_ENV === 'development' && (
              <GlobalErrorBoundary>
                <Example7_ErrorTestingComponent />
              </GlobalErrorBoundary>
            )}
          </main>
        </div>
      </GlobalErrorBoundary>
    </div>
  );
}

/**
 * Example 11: Error Handler in Async Operations
 * 
 * Comprehensive example of error handling in real scenarios
 */
export function Example11_AsyncErrorHandling() {
  const { handleError, handleNetworkError, handleReactError } = useErrorHandler();

  const handleComplexOperation = async () => {
    try {
      // Step 1: Validate input
      if (!validateInput()) {
        throw new Error('Invalid input provided');
      }

      // Step 2: Fetch data
      const response = await fetch('/api/operations');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Step 3: Process data
      processData(data);
    } catch (error) {
      // Determine error type and handle accordingly
      if (error instanceof TypeError) {
        // Network error
        await handleNetworkError(error, '/api/operations', {
          operation: 'complexOperation',
          step: 'fetch',
        });
      } else {
        // Generic error
        await handleError(error, {
          operation: 'complexOperation',
        });
      }
    }
  };

  return (
    <button onClick={handleComplexOperation}>
      Perform Complex Operation
    </button>
  );
}

/**
 * Example 12: Event Handler Error Catching
 * 
 * Error boundaries don't catch event handler errors - use try/catch instead
 */
export function Example12_EventHandlerErrorCatching() {
  const { handleError } = useErrorHandler();

  const handleButtonClick = async () => {
    try {
      await performSomeOperation();
    } catch (error) {
      await handleError(error, {
        context: 'buttonClick',
      });
    }
  };

  return (
    <button onClick={handleButtonClick}>
      Click Me (Safe!)
    </button>
  );
}

// ============================================
// Stub Components for Examples
// ============================================

function DeliveryStatsCard() {
  return <div>Delivery Stats</div>;
}

function DriverMetricsCard() {
  return <div>Driver Metrics</div>;
}

function RevenueChartCard() {
  return <div>Revenue Chart</div>;
}

function Footer() {
  return <footer>Footer</footer>;
}

function CriticalSection() {
  return <div>Critical Section</div>;
}

function DeliveryList() {
  return <div>Delivery List</div>;
}

function UserProfile({ userId }: { userId: string }) {
  return <div>User Profile: {userId}</div>;
}

function MyAppContent() {
  return <div>App Content</div>;
}

function Sidebar() {
  return <div>Sidebar</div>;
}

function Header() {
  return <div>Header</div>;
}

function Content() {
  return <div>Content</div>;
}

function DeliveryListSection({ onSelect, selected }: any) {
  return <div>Delivery List Section</div>;
}

function DeliveryDetailSection({ deliveryId }: any) {
  return <div>Delivery Detail: {deliveryId}</div>;
}

function validateInput() {
  return true;
}

function processData(data: any) {
  // Process
}

function performSomeOperation() {
  return Promise.resolve();
}
