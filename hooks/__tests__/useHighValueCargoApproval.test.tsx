import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  formatCountdown,
  useHighValueCargoApproval,
} from '@/hooks/useHighValueCargoApproval';
import {
  highValueCargoService,
  HighValueCargoServiceError,
} from '@/services/highValueCargoService';
import {
  FIXED_NOW,
  SHIPMENT_ID,
  awaitingApprovalResponse,
  expiredApprovalResponse,
  readyApprovalResponse,
  submitApprovalResponse,
} from './fixtures/highValueCargoApiResponses';

jest.mock('@/services/highValueCargoService', () => {
  const actual = jest.requireActual('@/services/highValueCargoService');
  return {
    ...actual,
    highValueCargoService: { getApproval: jest.fn(), submitApproval: jest.fn() },
  };
});

const mockGetApproval = highValueCargoService.getApproval as jest.MockedFunction<
  typeof highValueCargoService.getApproval
>;
const mockSubmitApproval = highValueCargoService.submitApproval as jest.MockedFunction<
  typeof highValueCargoService.submitApproval
>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useHighValueCargoApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('derives signature progress and deadline from the API response', async () => {
    mockGetApproval.mockResolvedValue(awaitingApprovalResponse);
    const { result } = renderHook(() => useHighValueCargoApproval(SHIPMENT_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.approval).not.toBeNull());
    expect(mockGetApproval).toHaveBeenCalledWith(SHIPMENT_ID, expect.any(AbortSignal));
    expect(result.current.approvedCount).toBe(1);
    expect(result.current.requiredSignatures).toBe(3);
    expect(result.current.allSignaturesCollected).toBe(false);
    expect(result.current.remainingMs).toBe(9015 * 1000);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.canSubmit).toBe(false);
  });

  it('only allows submission when signatures are complete and risk is acknowledged', async () => {
    mockGetApproval.mockResolvedValue(readyApprovalResponse);
    const { result } = renderHook(() => useHighValueCargoApproval(SHIPMENT_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.allSignaturesCollected).toBe(true));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setAcknowledged(true));
    expect(result.current.canSubmit).toBe(true);
  });

  it('ignores submit calls while submission is blocked', async () => {
    mockGetApproval.mockResolvedValue(awaitingApprovalResponse);
    const { result } = renderHook(() => useHighValueCargoApproval(SHIPMENT_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.approval).not.toBeNull());
    act(() => {
      result.current.setAcknowledged(true);
    });
    act(() => {
      result.current.submit();
    });
    expect(mockSubmitApproval).not.toHaveBeenCalled();
  });

  it('submits with the risk acknowledgement and calls onSubmitted', async () => {
    mockGetApproval.mockResolvedValue(readyApprovalResponse);
    mockSubmitApproval.mockResolvedValue(submitApprovalResponse);
    const onSubmitted = jest.fn();
    const { result } = renderHook(
      () => useHighValueCargoApproval(SHIPMENT_ID, { onSubmitted }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.allSignaturesCollected).toBe(true));
    act(() => result.current.setAcknowledged(true));
    act(() => result.current.submit());

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(submitApprovalResponse));
    expect(mockSubmitApproval).toHaveBeenCalledWith(SHIPMENT_ID, { acknowledgedHighRisk: true });
  });

  it('exposes submission errors', async () => {
    mockGetApproval.mockResolvedValue(readyApprovalResponse);
    mockSubmitApproval.mockRejectedValue(new HighValueCargoServiceError('Approval expired', 410));
    const { result } = renderHook(() => useHighValueCargoApproval(SHIPMENT_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.allSignaturesCollected).toBe(true));
    act(() => result.current.setAcknowledged(true));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.submitError).toBe('Approval expired'));
    expect(result.current.isSubmitting).toBe(false);
  });

  it('treats expired approvals as not submittable', async () => {
    mockGetApproval.mockResolvedValue(expiredApprovalResponse);
    const { result } = renderHook(() => useHighValueCargoApproval(SHIPMENT_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.approval).not.toBeNull());
    expect(result.current.isExpired).toBe(true);
    expect(result.current.remainingMs).toBe(0);
  });

  it('surfaces load errors', async () => {
    mockGetApproval.mockRejectedValue(new HighValueCargoServiceError('Not found', 404));
    const { result } = renderHook(() => useHighValueCargoApproval(SHIPMENT_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe('Not found'));
    expect(result.current.approval).toBeNull();
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useHighValueCargoApproval(SHIPMENT_ID, { enabled: false }), {
      wrapper: createWrapper(),
    });
    expect(mockGetApproval).not.toHaveBeenCalled();
  });
});

describe('formatCountdown', () => {
  it.each([
    [0, '00:00:00'],
    [-5000, '00:00:00'],
    [9015 * 1000, '02:30:15'],
    [(86_400 + 3723) * 1000, '1d 01:02:03'],
  ])('formats %d ms as %s', (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });
});
