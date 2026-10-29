# Requirements Document

## Introduction

This document specifies the requirements for `refundService`, a service layer module in the SwiftChain frontend application responsible for all refund-related API communication. The service exposes four methods — `getRefundStatus`, `getCancellationReason`, `requestRefundInquiry`, and `getEstimatedRefundTime` — that components consume exclusively through the hook layer. It follows the strict Component → Hook → Service layered architecture already established in the project, uses the authenticated `lib/api` Axios instance, and normalises every network error into a standard `APIError` type.

## Glossary

- **RefundService**: The `const refundService = { ... }` object exported from `services/refundService.ts` that owns all refund-related HTTP communication.
- **APIError**: A typed error object produced by the error normaliser whenever an Axios call fails, containing at minimum a `message` string, a numeric `status` code, and an optional `code` string.
- **APIErrorNormaliser**: The pure function inside `services/refundService.ts` that accepts an unknown thrown value and returns an `APIError`.
- **AuthenticatedAxiosInstance**: The default export from `lib/api`, a pre-configured Axios instance that attaches a Bearer token from `localStorage` to every request and redirects to `/login` on HTTP 401.
- **RefundStatusResponse**: The typed response shape returned by `getRefundStatus`, defined in `types/refund.ts`.
- **CancellationReason**: The typed response shape returned by `getCancellationReason`, defined in `types/refund.ts`.
- **InquiryResponse**: The typed response shape returned by `requestRefundInquiry`, defined in `types/refund.ts`.
- **EstimatedTimeResponse**: The typed response shape returned by `getEstimatedRefundTime`, defined in `types/refund.ts`.
- **BaseURL**: The value of `process.env.NEXT_PUBLIC_API_URL`, baked into the `AuthenticatedAxiosInstance` at startup.
- **shipmentId**: A non-empty string that uniquely identifies a shipment within the backend system.
- **Hook Layer**: The React hooks that sit between UI components and service methods; the only callers of `RefundService` methods.

## Requirements

### Requirement 1 — Typed Refund Status Retrieval

**User Story:** As a frontend hook, I want to retrieve the current refund status for a shipment so that UI components can display accurate refund progress to the user.

#### Acceptance Criteria

1. WHEN `getRefundStatus` is called with a `shipmentId`, THE `RefundService` SHALL send an HTTP GET request to `/refunds/${shipmentId}/status` using the `AuthenticatedAxiosInstance`.
2. WHEN the backend returns a successful response, THE `RefundService` SHALL resolve the promise with a value typed as `RefundStatusResponse`.
3. IF the Axios call throws an error, THEN THE `RefundService` SHALL pass the error to the `APIErrorNormaliser` and reject the promise with the resulting `APIError`.
4. THE `RefundService` SHALL NOT construct or return any inline mock objects in place of a live API response.

---

### Requirement 2 — Typed Cancellation Reason Retrieval

**User Story:** As a frontend hook, I want to retrieve the cancellation reason for a shipment so that UI components can display why an order was cancelled alongside refund details.

#### Acceptance Criteria

1. WHEN `getCancellationReason` is called with a `shipmentId`, THE `RefundService` SHALL send an HTTP GET request to `/refunds/${shipmentId}/cancellation-reason` using the `AuthenticatedAxiosInstance`.
2. WHEN the backend returns a successful response, THE `RefundService` SHALL resolve the promise with a value typed as `CancellationReason`.
3. IF the Axios call throws an error, THEN THE `RefundService` SHALL pass the error to the `APIErrorNormaliser` and reject the promise with the resulting `APIError`.
4. THE `RefundService` SHALL NOT construct or return any inline mock objects in place of a live API response.

---

### Requirement 3 — Typed Refund Inquiry Submission

**User Story:** As a frontend hook, I want to submit a refund inquiry message for a shipment so that the user can escalate a refund concern directly from the UI.

#### Acceptance Criteria

1. WHEN `requestRefundInquiry` is called with a `shipmentId` and a non-empty `message` string, THE `RefundService` SHALL send an HTTP POST request to `/refunds/${shipmentId}/inquiry` using the `AuthenticatedAxiosInstance`, with `{ message }` as the JSON request body.
2. WHEN the backend returns a successful response, THE `RefundService` SHALL resolve the promise with a value typed as `InquiryResponse`.
3. IF the Axios call throws an error, THEN THE `RefundService` SHALL pass the error to the `APIErrorNormaliser` and reject the promise with the resulting `APIError`.
4. THE `RefundService` SHALL NOT construct or return any inline mock objects in place of a live API response.

---

### Requirement 4 — Typed Estimated Refund Time Retrieval

**User Story:** As a frontend hook, I want to retrieve the estimated refund completion time for a shipment so that the UI can set accurate user expectations during the refund process.

#### Acceptance Criteria

1. WHEN `getEstimatedRefundTime` is called with a `shipmentId`, THE `RefundService` SHALL send an HTTP GET request to `/refunds/${shipmentId}/estimated-time` using the `AuthenticatedAxiosInstance`.
2. WHEN the backend returns a successful response, THE `RefundService` SHALL resolve the promise with a value typed as `EstimatedTimeResponse`.
3. IF the Axios call throws an error, THEN THE `RefundService` SHALL pass the error to the `APIErrorNormaliser` and reject the promise with the resulting `APIError`.
4. THE `RefundService` SHALL NOT construct or return any inline mock objects in place of a live API response.

---

### Requirement 5 — APIError Normalisation

**User Story:** As a frontend hook, I want all network errors from the refund service to be surfaced as a consistent `APIError` type so that error-handling logic across hooks and components remains uniform.

#### Acceptance Criteria

1. THE `APIErrorNormaliser` SHALL accept any unknown thrown value and return an `APIError` object.
2. WHEN the thrown value satisfies `axios.isAxiosError()`, THE `APIErrorNormaliser` SHALL populate `APIError.status` from the Axios response HTTP status code and `APIError.message` from the Axios response data message or the Axios error message.
3. WHEN the thrown value is a standard `Error` instance but not an Axios error, THE `APIErrorNormaliser` SHALL populate `APIError.message` from `Error.message` and set `APIError.status` to `0`.
4. WHEN the thrown value is neither an Axios error nor an `Error` instance, THE `APIErrorNormaliser` SHALL set `APIError.message` to `'An unexpected error occurred'` and `APIError.status` to `0`.
5. THE `APIError` type SHALL include at minimum the fields: `message: string`, `status: number`, and `code?: string`.

---

### Requirement 6 — API Base URL and Authentication

**User Story:** As a system operator, I want the refund service to use the environment-configured base URL and authenticated HTTP client so that all requests are routed correctly and carry valid credentials.

#### Acceptance Criteria

1. THE `RefundService` SHALL use the `AuthenticatedAxiosInstance` from `lib/api` for every HTTP call, inheriting the `BaseURL` configured via `process.env.NEXT_PUBLIC_API_URL`.
2. WHILE the `AuthenticatedAxiosInstance` interceptor is active, THE `RefundService` SHALL rely on the interceptor to attach the Bearer token header to every outgoing request without duplicating token-attachment logic inside `refundService.ts`.
3. WHEN the `AuthenticatedAxiosInstance` interceptor receives an HTTP 401 response, THE `RefundService` SHALL allow the interceptor to handle the redirect to `/login` without adding redundant 401-handling code inside `refundService.ts`.

---

### Requirement 7 — Strict Layered Architecture and JSDoc

**User Story:** As a developer maintaining the SwiftChain frontend, I want the refund service to conform to the project's layered architecture and documentation conventions so that the codebase remains consistent and navigable.

#### Acceptance Criteria

1. THE `RefundService` SHALL be exported as a named `const` object (`export const refundService = { ... }`) with no use of classes, following the project's existing service export style.
2. THE `RefundService` SHALL be defined in `services/refundService.ts` and all response and error types SHALL be defined in `types/refund.ts`.
3. THE `RefundService` SHALL NOT be imported or called directly from any React component; component files SHALL interact with refund data exclusively through the Hook Layer.
4. WHEN a new method is added to `RefundService`, THE `RefundService` SHALL include a JSDoc comment on every method documenting its purpose, parameters, and return type.
5. THE `RefundService` SHALL import response types from `types/refund.ts` using the `import type` syntax.
