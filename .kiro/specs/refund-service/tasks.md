# Implementation Plan: refundService

## Overview

Implement the refund service layer for the SwiftChain frontend in two files: `types/refund.ts` for all response and error type definitions, and `services/refundService.ts` for the authenticated HTTP service object and the private `normaliseAPIError` function. The implementation follows the project's established `const serviceName = { async method() {} }` pattern, uses the `lib/api` authenticated Axios instance, and normalises every thrown error into a typed `APIError` before re-throwing.

## Tasks

- [ ] 1. Create `types/refund.ts` with all type definitions
  - Define the `APIError` interface with `message: string`, `status: number`, and `code?: string`
  - Define `RefundStatusResponse` with `shipmentId`, `refundStatus` union, optional `refundAmount`, `currency`, `processedAt`, and required `createdAt`
  - Define `CancellationReason` with `shipmentId`, `reason`, optional `code`, required `cancelledAt`, and optional `cancelledBy`
  - Define `InquiryResponse` with `inquiryId`, `shipmentId`, `status` union, `message`, and `submittedAt`
  - Define `EstimatedTimeResponse` with `shipmentId`, `estimatedCompletionDate`, `estimatedDaysRemaining`, and optional `note`
  - Add JSDoc comment to each interface
  - _Requirements: 5.5, 7.2, 7.5_

- [ ] 2. Implement `services/refundService.ts`

  - [ ] 2.1 Implement the `normaliseAPIError` private function
    - Import `axios` for `axios.isAxiosError` and `api` from `@/lib/api`
    - Import all types from `@/types/refund` using `import type`
    - Write the `normaliseAPIError(error: unknown): APIError` function with three branches: Axios error, `instanceof Error`, and unknown fallback
    - For Axios errors: extract `status` from `error.response?.status ?? 0`, `message` from `response.data.message ?? error.message`, and `code` from `response.data.code`
    - For plain `Error` instances: set `status` to `0` and `message` to `error.message`
    - For unknown values: set `status` to `0` and `message` to `'An unexpected error occurred'`
    - Add JSDoc comment documenting the three branches and `@returns APIError`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.2 Write property test for `normaliseAPIError` totality (Property 2)
    - **Property 2: Normaliser totality — always returns APIError**
    - **Validates: Requirements 5.1, 5.5**
    - Create `services/__tests__/refundService.test.ts` (or add to it)
    - Mock `@/lib/api` using `jest.mock('@/lib/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))`
    - Use `fast-check` (or generate representative samples) to verify that for any thrown value — Axios error, `Error`, string, number, object, `null`, `undefined` — `normaliseAPIError` returns an object with `typeof result.message === 'string'` and `typeof result.status === 'number'` and does not throw

  - [ ]* 2.3 Write property test for Axios status propagation (Property 3)
    - **Property 3: Axios error status propagation**
    - **Validates: Requirements 5.2**
    - For a representative set of HTTP status codes (400, 401, 403, 404, 422, 500, 503), construct a synthetic Axios error using `Object.assign(new Error(...), { isAxiosError: true, response: { status: code, data: {} } })` and assert that `normaliseAPIError(err).status === code`

  - [ ]* 2.4 Write property test for plain Error normalisation (Property 4)
    - **Property 4: Plain Error normalisation to status 0**
    - **Validates: Requirements 5.3**
    - For a representative set of non-empty message strings, assert that `normaliseAPIError(new Error(msg))` returns `{ status: 0, message: msg }` with no `code` field

  - [ ]* 2.5 Write property test for unknown value fallback (Property 5)
    - **Property 5: Unknown value fallback message**
    - **Validates: Requirements 5.4**
    - For a representative set of unknown thrown values (string, number, plain object, `null`, `undefined`, array), assert that `normaliseAPIError(value)` returns `{ status: 0, message: 'An unexpected error occurred' }`

  - [ ] 2.6 Implement `getRefundStatus(shipmentId)`
    - Add the `getRefundStatus` async method to the `refundService` const object
    - Call `api.get<RefundStatusResponse>(\`/refunds/${shipmentId}/status\`)` in a try/catch
    - Re-throw via `throw normaliseAPIError(error)` in the catch block
    - Add JSDoc with `@param shipmentId`, `@returns`, and `@throws {APIError}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 7.1, 7.4_

  - [ ] 2.7 Implement `getCancellationReason(shipmentId)`
    - Add the `getCancellationReason` async method to the `refundService` const object
    - Call `api.get<CancellationReason>(\`/refunds/${shipmentId}/cancellation-reason\`)` in a try/catch
    - Re-throw via `throw normaliseAPIError(error)` in the catch block
    - Add JSDoc with `@param shipmentId`, `@returns`, and `@throws {APIError}`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 7.1, 7.4_

  - [ ] 2.8 Implement `requestRefundInquiry(shipmentId, message)`
    - Add the `requestRefundInquiry` async method to the `refundService` const object
    - Call `api.post<InquiryResponse>(\`/refunds/${shipmentId}/inquiry\`, { message })` in a try/catch
    - Re-throw via `throw normaliseAPIError(error)` in the catch block
    - Add JSDoc with `@param shipmentId`, `@param message`, `@returns`, and `@throws {APIError}`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 7.1, 7.4_

  - [ ]* 2.9 Write property test for POST body pass-through (Property 1)
    - **Property 1: POST body pass-through for `requestRefundInquiry`**
    - **Validates: Requirements 3.1**
    - For a representative set of non-empty message strings, call `refundService.requestRefundInquiry(shipmentId, msg)` with `api.post` mocked and assert that `mockPost` was called with the exact second argument `{ message: msg }` — unchanged, not wrapped, not omitted

  - [ ] 2.10 Implement `getEstimatedRefundTime(shipmentId)`
    - Add the `getEstimatedRefundTime` async method to the `refundService` const object
    - Call `api.get<EstimatedTimeResponse>(\`/refunds/${shipmentId}/estimated-time\`)` in a try/catch
    - Re-throw via `throw normaliseAPIError(error)` in the catch block
    - Add JSDoc with `@param shipmentId`, `@returns`, and `@throws {APIError}`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 7.1, 7.4_

  - [ ]* 2.11 Write unit tests for all four service methods
    - Create or extend `services/__tests__/refundService.test.ts`
    - Mock `@/lib/api` with `jest.mock('@/lib/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))`
    - For each method: test happy-path (resolved data returned), Axios error rejection (propagates `APIError` with correct `status` and `message`), and plain `Error` rejection (`status: 0`)
    - For `requestRefundInquiry`: assert the POST body is `{ message }` exactly
    - _Requirements: 1.1–1.3, 2.1–2.3, 3.1–3.3, 4.1–4.3_

- [ ] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- `normaliseAPIError` is a module-private function and cannot be tested in isolation without exporting it; property tests (2.2–2.5) should test it via the service methods or a named export added temporarily for testing, using the pattern established in the design document
- The `lib/api` mock pattern from `transactionHistoryService.test.ts` (`jest.mock('@/lib/api', ...)`) is the correct approach — do NOT mock the raw `axios` module, since `refundService` uses `lib/api` not `axios` directly
- No class syntax, no inline mocks in production code, no duplicated token-attachment logic
- Each task references specific requirements for traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.10"] },
    { "id": 3, "tasks": ["2.9", "2.11"] }
  ]
}
```
