# Global Error Boundary & Crash Reporting

## Overview

The Global Error Boundary system prevents white-screen crashes by catching React rendering errors and displaying a graceful fallback UI. All errors are logged to the backend API for monitoring and debugging.

## Architecture

The implementation follows the **Component → Hook → Service** pattern:

```
GlobalErrorBoundary (Component)
    ↓
useErrorHandler (Hook)
    ↓
errorLoggerService (Service)
    ↓
Backend API (/api/errors/log)
```

## Components

### GlobalErrorBoundary

The main error boundary component that wraps your application or sections of it.

**Location:** `components/shared/GlobalErrorBoundary.tsx`

**Props:**
- `children: ReactNode` - Components to wrap
- `fallback?: ReactNode` - Custom fallback UI (optional)
- `onError?: (error: Error, errorInfo: React.ErrorInfo) => void` - Error callback
- `isDarkMode?: boolean` - Dark mode styling
- `resetKeys?: (string | number)[]` - Keys to reset error state

### ErrorFallbackUI

Styled fallback UI displayed when an error is caught.

**Location:** `components/shared/ErrorFallbackUI.tsx`

**Features:**
- Error icon with animation
- User-friendly error message
- "Try Again" button (reloads page)
- "Go Home" button (navigates to /)
- Development mode: Shows error details and stack trace
- Dark/Light mode support

## Services

### errorLoggerService

Handles all error logging to the backend API.

**Location:** `services/errorLoggerService.ts`

**Methods:**

#### `logError(payload: ErrorLogPayload)`
Generic error logging method.

```typescript
const response = await errorLoggerService.logError({
  message: 'Something went wrong',
  stack: error.stack,
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  severity: 'high',
  source: 'react',
  url: window.location.href,
});
```

#### `logReactError(error, errorInfo, additionalData?)`
Log React error boundary errors.

```typescript
await errorLoggerService.logReactError(
  error,
  { componentStack: errorInfo.componentStack },
  { userId: currentUser.id }
);
```

#### `logJSError(error, additionalData?)`
Log JavaScript errors.

```typescript
await errorLoggerService.logJSError(
  new Error('Invalid operation'),
  { operation: 'deleteUser' }
);
```

#### `logNetworkError(error, endpoint?, additionalData?)`
Log network/API errors.

```typescript
await errorLoggerService.logNetworkError(
  error,
  '/api/deliveries',
  { method: 'POST' }
);
```

#### `getErrorLogs(userId?)`
Retrieve error logs (admin endpoint).

```typescript
const logs = await errorLoggerService.getErrorLogs(userId);
```

#### `clearErrorLogs(olderThanDays?)`
Clear old error logs (admin endpoint).

```typescript
await errorLoggerService.clearErrorLogs(30); // Clear logs older than 30 days
```

## Hooks

### useErrorHandler

Custom hook for handling different types of errors in components.

**Location:** `hooks/useErrorHandler.ts`

**Returns:**
- `handleReactError(error, errorInfo, options?)` - Handle React errors
- `handleJSError(error, options?)` - Handle JS errors
- `handleNetworkError(error, endpoint?, options?)` - Handle network errors
- `handleError(error, options?)` - Generic error handler

**Options:**
- `silent?: boolean` - Don't log to console
- `notify?: boolean` - Show toast notification
- `throwError?: boolean` - Re-throw after handling
- `additionalData?: Record<string, unknown>` - Extra context

## Usage Examples

### Basic Setup (Root Level)

Wrap your entire application in the error boundary at the root level:

```typescript
// app/layout.tsx
import { GlobalErrorBoundary } from '@/components/shared';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <GlobalErrorBoundary isDarkMode={false}>
          {children}
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
```

### Section-Level Error Boundary

Wrap specific sections to prevent entire page crashes:

```typescript
import { GlobalErrorBoundary } from '@/components/shared';

export default function DashboardPage() {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {/* Wrap individual sections */}
      <GlobalErrorBoundary onError={(error) => console.log('Dashboard error:', error)}>
        <DeliveryStats />
      </GlobalErrorBoundary>

      <GlobalErrorBoundary>
        <RecentDeliveries />
      </GlobalErrorBoundary>

      <GlobalErrorBoundary>
        <DriverMetrics />
      </GlobalErrorBoundary>
    </div>
  );
}
```

### Using useErrorHandler Hook

Handle errors in components:

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

export function MyComponent() {
  const { handleError, handleNetworkError } = useErrorHandler();

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      return response.json();
    } catch (error) {
      await handleNetworkError(error, '/api/data', {
        userId: currentUser.id,
      });
    }
  };

  return <button onClick={fetchData}>Load Data</button>;
}
```

### Custom Error Callback

Execute custom logic when errors occur:

```typescript
<GlobalErrorBoundary
  onError={(error, errorInfo) => {
    // Send to analytics
    analytics.trackError({
      message: error.message,
      component: errorInfo.componentStack,
    });

    // Alert admin
    alertAdmin(`Error in ${errorInfo.componentStack}`);
  }}
>
  <CriticalComponent />
</GlobalErrorBoundary>
```

### Custom Fallback UI

Provide your own error UI:

```typescript
function CustomErrorFallback() {
  return (
    <div className="custom-error-page">
      <h1>Something went wrong in this section</h1>
      <p>Please refresh or try again later</p>
      <button onClick={() => window.location.reload()}>
        Refresh Page
      </button>
    </div>
  );
}

<GlobalErrorBoundary fallback={<CustomErrorFallback />}>
  <SomeComponent />
</GlobalErrorBoundary>
```

### Reset Error Boundary

Automatically reset the error boundary when data changes:

```typescript
const [userId, setUserId] = useState('1');

<GlobalErrorBoundary resetKeys={[userId]}>
  <UserProfile userId={userId} />
</GlobalErrorBoundary>
```

### Intentional Error Testing

To test the error boundary in development:

```typescript
function TestErrorComponent() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('This is a test error from TestErrorComponent');
  }

  return (
    <button onClick={() => setShouldError(true)}>
      Trigger Error
    </button>
  );
}
```

## Backend API Endpoints

The error logging service expects the following backend endpoints:

### POST /api/errors/log

Log an error to the system.

**Request Body:**
```json
{
  "message": "Error message",
  "stack": "Error stack trace",
  "componentStack": "React component stack",
  "timestamp": "2024-01-15T10:30:00Z",
  "userAgent": "Mozilla/5.0...",
  "userId": "user-123",
  "severity": "high",
  "source": "react",
  "url": "https://app.swiftchain.com/dashboard",
  "additionalData": {
    "userId": "user-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "errorId": "err-1234567890",
  "message": "Error logged successfully"
}
```

### GET /api/errors/logs

Retrieve error logs (admin endpoint).

**Query Parameters:**
- `userId` (optional) - Filter by user

**Response:**
```json
[
  {
    "message": "Error message",
    "stack": "...",
    "timestamp": "2024-01-15T10:30:00Z",
    "severity": "high",
    "source": "react"
  }
]
```

### DELETE /api/errors/logs

Clear error logs (admin endpoint).

**Query Parameters:**
- `olderThanDays` (optional) - Only delete logs older than N days

**Response:**
```json
{
  "success": true,
  "message": "Error logs cleared"
}
```

## Error Severity Levels

- `low` - Non-critical errors, minor issues
- `medium` - User-facing errors that don't break functionality
- `high` - Component/section failures
- `critical` - Application-wide failures

## Error Sources

- `react` - React component render errors
- `javascript` - Unhandled JavaScript errors
- `network` - API/network request errors
- `unknown` - Unknown error source

## Best Practices

1. **Always wrap at root level** - Ensure the main error boundary is at the application root
2. **Use section boundaries** - Wrap independent sections to isolate failures
3. **Provide meaningful context** - Use `additionalData` to include relevant context
4. **Test error handling** - Create test components that throw errors
5. **Monitor logs** - Regularly check error logs to identify patterns
6. **Set appropriate severity** - Use correct severity levels for classification
7. **Handle gracefully** - Always provide fallback UI for better UX

## Development vs Production

### Development Mode
- Error details and stack traces are shown in the fallback UI
- Errors are logged to both console and backend
- Component stack information is available

### Production Mode
- Only user-friendly error messages are shown
- Technical details are hidden
- All errors are still logged to backend for analysis

## Testing

See `__tests__/ErrorBoundary.test.tsx` for comprehensive test examples.

## Troubleshooting

### Error boundary not catching errors?

1. **Check error boundary placement** - Error boundaries don't catch errors in:
   - Event handlers (use try/catch instead)
   - Async code (use try/catch in promises)
   - Server-side rendering
   - The error boundary itself

2. **Use try/catch for event handlers**:
   ```typescript
   const handleClick = async () => {
     try {
       await someAsyncOperation();
     } catch (error) {
       await handleError(error);
     }
   };
   ```

3. **Verify backend connectivity** - Check that `NEXT_PUBLIC_API_URL` is set correctly

### Errors not logging to backend?

1. **Check API endpoint** - Ensure `/api/errors/log` exists on backend
2. **Check CORS** - Verify CORS is configured if API is on different domain
3. **Check environment variable** - Ensure `NEXT_PUBLIC_API_URL` is set
4. **Check console** - Service logs failures to console

## Files Overview

```
components/shared/
├── GlobalErrorBoundary.tsx      # Main error boundary component
├── ErrorFallbackUI.tsx           # Fallback UI component
└── index.ts                      # Exports

hooks/
└── useErrorHandler.ts            # Error handler hook

services/
└── errorLoggerService.ts         # Error logging service

__tests__/
└── ErrorBoundary.test.tsx        # Comprehensive tests
```

## Related Documentation

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Handling Best Practices](./TESTING_GUIDE.md)
