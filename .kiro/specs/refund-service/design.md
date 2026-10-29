# Design Document — refundService

## Overview

`refundService` is a thin HTTP service layer module that owns all refund-related API communication in the SwiftChain frontend. It is consumed exclusively through the hook layer, follows the project's established `const serviceName = { async method() {} }` export pattern, and delegates authentication, base URL configuration, and 401 handling entirely to the `lib/api` authenticated Axios instance. All network errors are normalised into a typed `APIError` before propagating to callers.

Two files are produced:

| File | Purpose |
|---|---|
| `services/refundService.ts` | Service object + `APIErrorNormaliser` + `APIError` type |
| `types/refund.ts` | Response shape types: `RefundStatusResponse`, `CancellationReason`, `InquiryResponse`, `EstimatedTimeResponse` |

---

## Architecture

### Component → Hook → Service layering

```
React Component
      │  (reads state / calls mutations)
      ▼
  Custom Hook  (useRefundStatus, useRequestRefundInquiry, …)
      │  (the only caller of refundService methods)
      ▼
  refundService  ◄── this module
      │
      ▼
  lib/api  (authenticated Axios instance)
      │
      ▼
  Backend REST API  (process.env.NEXT_PUBLIC_API_URL)
```

`refundService` has no awareness of React, component state, or toast notifications. Those concerns belong to the hook layer.

---

## Data Models

Defined in `types/refund.ts` and imported with `import type` in the service.

### `APIError`

```typescript
export interface APIError {
  message: string;
  status: number;   // HTTP status code; 0 for non-HTTP errors
  code?: string;    // optional machine-readable error code from backend
}
```

### `RefundStatusResponse`

```typescript
export interface RefundStatusResponse {
  shipmentId: string;
  refundStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NOT_APPLICABLE';
  refundAmount?: number;
  currency?: string;
  processedAt?: string;   // ISO 8601 timestamp
  createdAt: string;      // ISO 8601 timestamp
}
```

### `CancellationReason`

```typescript
export interface CancellationReason {
  shipmentId: string;
  reason: string;         // human-readable reason string from backend
  code?: string;          // optional machine-readable reason code
  cancelledAt: string;    // ISO 8601 timestamp
  cancelledBy?: string;   // actor identifier (e.g., 'SENDER', 'ADMIN', 'SYSTEM')
}
```

### `InquiryResponse`

```typescript
export interface InquiryResponse {
  inquiryId: string;
  shipmentId: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED';
  message: string;        // echoed or confirmation message from backend
  submittedAt: string;    // ISO 8601 timestamp
}
```

### `EstimatedTimeResponse`

```typescript
export interface EstimatedTimeResponse {
  shipmentId: string;
  estimatedCompletionDate: string;   // ISO 8601 timestamp
  estimatedDaysRemaining: number;
  note?: string;                     // optional human-readable advisory
}
```

---

## Components and Interfaces

### `APIErrorNormaliser`

A module-private pure function that converts any unknown thrown value into an `APIError`. It never throws.

**Decision tree:**

```
thrown value
     │
     ├─ axios.isAxiosError(value) === true
     │      status  = value.response?.status ?? 0
     │      message = value.response?.data?.message ?? value.message
     │      code    = value.response?.data?.code
     │      └─► APIError { message, status, code }
     │
     ├─ value instanceof Error
     │      status  = 0
     │      message = value.message
     │      └─► APIError { message, status }
     │
     └─ unknown
            status  = 0
            message = 'An unexpected error occurred'
            └─► APIError { message, status }
```

### `refundService` object

Exported as `export const refundService = { ... }`. Four async methods:

| Method | HTTP verb | Endpoint |
|---|---|---|
| `getRefundStatus(shipmentId)` | GET | `/refunds/{shipmentId}/status` |
| `getCancellationReason(shipmentId)` | GET | `/refunds/{shipmentId}/cancellation-reason` |
| `requestRefundInquiry(shipmentId, message)` | POST | `/refunds/{shipmentId}/inquiry` |
| `getEstimatedRefundTime(shipmentId)` | GET | `/refunds/{shipmentId}/estimated-time` |

Every method follows the same structure:

```typescript
async methodName(shipmentId: string, ...): Promise<ResponseType> {
  try {
    const { data } = await api.verb<ResponseType>(url, body?);
    return data;
  } catch (error: unknown) {
    throw normaliseAPIError(error);
  }
}
```

---

## Implementation

### `types/refund.ts`

```typescript
/**
 * Typed API error produced by the APIErrorNormaliser in refundService.
 * All service rejections resolve to this shape.
 */
export interface APIError {
  message: string;
  status: number;
  code?: string;
}

/**
 * Refund status for a given shipment.
 */
export interface RefundStatusResponse {
  shipmentId: string;
  refundStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NOT_APPLICABLE';
  refundAmount?: number;
  currency?: string;
  processedAt?: string;
  createdAt: string;
}

/**
 * Reason a shipment was cancelled, returned alongside refund context.
 */
export interface CancellationReason {
  shipmentId: string;
  reason: string;
  code?: string;
  cancelledAt: string;
  cancelledBy?: string;
}

/**
 * Confirmation returned after a refund inquiry is submitted.
 */
export interface InquiryResponse {
  inquiryId: string;
  shipmentId: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED';
  message: string;
  submittedAt: string;
}

/**
 * Estimated completion window for an in-progress refund.
 */
export interface EstimatedTimeResponse {
  shipmentId: string;
  estimatedCompletionDate: string;
  estimatedDaysRemaining: number;
  note?: string;
}
```

### `services/refundService.ts`

```typescript
import axios from 'axios';
import api from '@/lib/api';
import type {
  APIError,
  RefundStatusResponse,
  CancellationReason,
  InquiryResponse,
  EstimatedTimeResponse,
} from '@/types/refund';

/**
 * Normalises any thrown value into a typed APIError.
 * Three branches:
 *   1. Axios network/HTTP error  → status from response, message from response data or error
 *   2. Plain Error instance      → status 0, message from Error.message
 *   3. Unknown (string, object…) → status 0, generic message
 *
 * @param error - The unknown value caught in a catch block.
 * @returns A typed APIError object.
 */
function normaliseAPIError(error: unknown): APIError {
  if (axios.isAxiosError(error)) {
    return {
      message:
        (error.response?.data as { message?: string })?.message ??
        error.message,
      status: error.response?.status ?? 0,
      code: (error.response?.data as { code?: string })?.code,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, status: 0 };
  }

  return { message: 'An unexpected error occurred', status: 0 };
}

/**
 * refundService — owns all refund-related HTTP communication.
 *
 * Consume this through the hook layer only; never import it directly
 * from a React component.
 *
 * Authentication and base URL are handled by the lib/api interceptors.
 */
export const refundService = {
  /**
   * Fetches the current refund status for a shipment.
   *
   * @param shipmentId - Unique identifier of the shipment.
   * @returns Resolves with the typed refund status from the backend.
   * @throws {APIError} If the request fails for any reason.
   */
  async getRefundStatus(shipmentId: string): Promise<RefundStatusResponse> {
    try {
      const { data } = await api.get<RefundStatusResponse>(
        `/refunds/${shipmentId}/status`,
      );
      return data;
    } catch (error: unknown) {
      throw normaliseAPIError(error);
    }
  },

  /**
   * Retrieves the cancellation reason recorded for a shipment.
   *
   * @param shipmentId - Unique identifier of the shipment.
   * @returns Resolves with the cancellation reason details.
   * @throws {APIError} If the request fails for any reason.
   */
  async getCancellationReason(shipmentId: string): Promise<CancellationReason> {
    try {
      const { data } = await api.get<CancellationReason>(
        `/refunds/${shipmentId}/cancellation-reason`,
      );
      return data;
    } catch (error: unknown) {
      throw normaliseAPIError(error);
    }
  },

  /**
   * Submits a refund inquiry message for a shipment.
   *
   * @param shipmentId - Unique identifier of the shipment.
   * @param message    - Non-empty inquiry message from the user.
   * @returns Resolves with the inquiry submission confirmation.
   * @throws {APIError} If the request fails for any reason.
   */
  async requestRefundInquiry(
    shipmentId: string,
    message: string,
  ): Promise<InquiryResponse> {
    try {
      const { data } = await api.post<InquiryResponse>(
        `/refunds/${shipmentId}/inquiry`,
        { message },
      );
      return data;
    } catch (error: unknown) {
      throw normaliseAPIError(error);
    }
  },

  /**
   * Retrieves the estimated completion time for a shipment refund.
   *
   * @param shipmentId - Unique identifier of the shipment.
   * @returns Resolves with the estimated refund timeline.
   * @throws {APIError} If the request fails for any reason.
   */
  async getEstimatedRefundTime(
    shipmentId: string,
  ): Promise<EstimatedTimeResponse> {
    try {
      const { data } = await api.get<EstimatedTimeResponse>(
        `/refunds/${shipmentId}/estimated-time`,
      );
      return data;
    } catch (error: unknown) {
      throw normaliseAPIError(error);
    }
  },
};
```

---

## Error Handling

All error handling is centralised in `normaliseAPIError`. Service methods contain no ad-hoc error logic.

| Thrown value | `APIError.status` | `APIError.message` | `APIError.code` |
|---|---|---|---|
| Axios error with HTTP response | HTTP status (e.g. 404, 500) | `response.data.message` or `error.message` | `response.data.code` if present |
| Axios error without HTTP response (network timeout, DNS) | `0` | `error.message` | `undefined` |
| `instanceof Error` (non-Axios) | `0` | `error.message` | `undefined` |
| Anything else | `0` | `'An unexpected error occurred'` | `undefined` |

The 401 case is handled upstream by `lib/api`'s response interceptor, which clears the auth token and redirects to `/login`. `refundService` adds no 401-specific handling.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: POST body pass-through

*For any* non-empty string used as the `message` argument to `requestRefundInquiry`, the HTTP POST request body sent to `/refunds/{shipmentId}/inquiry` SHALL contain exactly `{ message: <that string> }` — the string is neither modified, omitted, nor wrapped before transmission.

**Validates: Requirements 3.1**

---

### Property 2: Normaliser totality — always returns APIError

*For any* value of any type (Axios error, plain `Error`, string, number, object, `null`, `undefined`, array, or any other value), `normaliseAPIError` SHALL return an object with a `message` field of type `string` and a `status` field of type `number` without itself throwing.

**Validates: Requirements 5.1, 5.5**

---

### Property 3: Axios error status propagation

*For any* Axios error that carries an HTTP response, the `status` field of the returned `APIError` SHALL equal the HTTP status code of that response (e.g. 400, 401, 403, 404, 422, 500, 503).

**Validates: Requirements 5.2**

---

### Property 4: Plain Error normalisation

*For any* `Error` instance (constructed with any non-empty message string) that is not an Axios error, `normaliseAPIError` SHALL return an `APIError` with `status === 0` and `message` equal to the `Error`'s own `message` property.

**Validates: Requirements 5.3**

---

### Property 5: Unknown value fallback

*For any* thrown value that is neither an Axios error nor an `Error` instance (primitives, plain objects, `null`, etc.), `normaliseAPIError` SHALL return `{ status: 0, message: 'An unexpected error occurred' }`.

**Validates: Requirements 5.4**
