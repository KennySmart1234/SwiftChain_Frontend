import React, { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HighValueCargoMultiSigModal } from '@/components/escrow/HighValueCargoMultiSigModal';
import {
  useHighValueCargoApproval,
  type UseHighValueCargoApprovalResult,
} from '@/hooks/useHighValueCargoApproval';
import type { HighValueCargoApproval } from '@/types/highValueCargo';
import {
  SHIPMENT_ID,
  awaitingApprovalResponse,
  domesticApprovalResponse,
  expiredApprovalResponse,
  readyApprovalResponse,
} from '@/hooks/__tests__/fixtures/highValueCargoApiResponses';

/**
 * Unit tests for HighValueCargoMultiSigModal with useHighValueCargoApproval
 * mocked, so every render state can be driven directly. Hook state is derived
 * from the recorded API responses in the shared fixtures.
 *
 * Service-level integration tests live in HighValueCargoMultiSigModal.integration.test.tsx.
 */

jest.mock('@/hooks/useHighValueCargoApproval', () => ({
  ...jest.requireActual('@/hooks/useHighValueCargoApproval'),
  useHighValueCargoApproval: jest.fn(),
}));

const mockUseHighValueCargoApproval = useHighValueCargoApproval as jest.MockedFunction<
  typeof useHighValueCargoApproval
>;

/** 2h 30m 15s, rendered by the real formatCountdown as 02:30:15. */
const REMAINING_MS = (2 * 3600 + 30 * 60 + 15) * 1000;

/** Builds the hook result the way the real hook derives it from an API response. */
function hookStateFor(
  approval: HighValueCargoApproval | null,
  overrides: Partial<UseHighValueCargoApprovalResult> = {},
): UseHighValueCargoApprovalResult {
  const approvedCount = approval?.signers.filter((s) => s.status === 'approved').length ?? 0;
  const requiredSignatures = approval?.requiredSignatures ?? 0;
  const isExpired = approval?.status === 'expired';
  const state: UseHighValueCargoApprovalResult = {
    approval,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    approvedCount,
    requiredSignatures,
    allSignaturesCollected: !!approval && approvedCount >= requiredSignatures,
    remainingMs: isExpired ? 0 : REMAINING_MS,
    isExpired,
    acknowledged: false,
    setAcknowledged: jest.fn(),
    canSubmit: false,
    isSubmitting: false,
    submitError: null,
    submit: jest.fn(),
    ...overrides,
  };
  return state;
}

function renderModal(
  state: UseHighValueCargoApprovalResult,
  props: Partial<React.ComponentProps<typeof HighValueCargoMultiSigModal>> = {},
) {
  mockUseHighValueCargoApproval.mockReturnValue(state);
  const onClose = jest.fn();
  const onSubmitted = jest.fn();
  const utils = render(
    <HighValueCargoMultiSigModal
      shipmentId={SHIPMENT_ID}
      isOpen
      onClose={onClose}
      onSubmitted={onSubmitted}
      {...props}
    />,
  );
  return { ...utils, onClose, onSubmitted, state };
}

const submitButton = () => screen.getByRole('button', { name: 'Approve release' });
const acknowledgement = () => screen.getByRole('checkbox', { name: /i acknowledge/i });

describe('HighValueCargoMultiSigModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('rendering', () => {
    it('renders nothing when closed but still passes enabled: false to the hook', () => {
      renderModal(hookStateFor(null), { isOpen: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(mockUseHighValueCargoApproval).toHaveBeenCalledWith(SHIPMENT_ID, {
        enabled: false,
        onSubmitted: expect.any(Function),
      });
    });

    it('renders an accessible modal dialog in a portal on document.body', () => {
      const { container } = renderModal(hookStateFor(awaitingApprovalResponse));

      const dialog = screen.getByRole('dialog', { name: 'High-value cargo approval' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAccessibleDescription(
        `Shipment ${awaitingApprovalResponse.trackingNumber} requires 3 signatures before release.`,
      );
      expect(container).not.toContainElement(dialog);
      expect(mockUseHighValueCargoApproval).toHaveBeenCalledWith(SHIPMENT_ID, {
        enabled: true,
        onSubmitted: expect.any(Function),
      });
    });

    it('shows a loading state while approval details are fetched', () => {
      renderModal(hookStateFor(null, { isLoading: true }));

      expect(screen.getByTestId('multisig-modal-loading')).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Loading approval details…')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
        'Multiple authorized signatures are required before release.',
      );
      expect(submitButton()).toBeDisabled();
    });

    it('shows the load error and retries through the hook', async () => {
      const user = userEvent.setup();
      const { state } = renderModal(hookStateFor(null, { error: 'Request failed with status code 503' }));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Unable to load approval');
      expect(alert).toHaveTextContent('Request failed with status code 503');

      await user.click(within(alert).getByRole('button', { name: /retry/i }));
      expect(state.refetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to a generic message when no approval and no error are returned', () => {
      renderModal(hookStateFor(null));

      expect(screen.getByRole('alert')).toHaveTextContent('Approval details are unavailable.');
    });
  });

  describe('signer list and risk banner', () => {
    it('lists every required signer with name, role and approval status', () => {
      renderModal(hookStateFor(awaitingApprovalResponse));

      const rows = within(screen.getByRole('list', { name: 'Required signers' })).getAllByRole('listitem');
      expect(rows).toHaveLength(awaitingApprovalResponse.signers.length);

      awaitingApprovalResponse.signers.forEach((signer, i) => {
        expect(rows[i]).toHaveTextContent(signer.name);
        expect(rows[i]).toHaveTextContent(signer.role);
        expect(within(rows[i]).getByTitle(signer.publicKey)).toHaveTextContent(
          `${signer.publicKey.slice(0, 6)}…${signer.publicKey.slice(-6)}`,
        );
        expect(rows[i]).toHaveTextContent(signer.status === 'approved' ? 'Approved' : 'Pending');
      });
    });

    it('marks rejected signers', () => {
      const [first, ...rest] = awaitingApprovalResponse.signers;
      renderModal(
        hookStateFor({ ...awaitingApprovalResponse, signers: [{ ...first, status: 'rejected' }, ...rest] }),
      );

      const rows = within(screen.getByRole('list', { name: 'Required signers' })).getAllByRole('listitem');
      expect(rows[0]).toHaveTextContent('Rejected');
    });

    it('shows the cross-border risk banner, value, risk level and risk factors', () => {
      renderModal(hookStateFor(awaitingApprovalResponse));

      const banner = screen.getByRole('note', { name: 'Cross-border risk warning' });
      expect(banner).toHaveTextContent('Cross-border shipment');
      expect(banner).toHaveTextContent('Nigeria → Ghana');
      expect(screen.getByText('$185,000.00')).toBeInTheDocument();
      expect(screen.getByText('High risk')).toBeInTheDocument();

      const factors = within(screen.getByRole('list', { name: 'Risk factors' })).getAllByRole('listitem');
      expect(factors.map((f) => f.textContent)).toEqual(awaitingApprovalResponse.riskFactors);
    });

    it('hides the cross-border banner and risk factors for domestic shipments', () => {
      renderModal(hookStateFor(domesticApprovalResponse));

      expect(screen.queryByRole('note', { name: 'Cross-border risk warning' })).not.toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Risk factors' })).not.toBeInTheDocument();
      expect(screen.getByText('Critical risk')).toBeInTheDocument();
    });

    it('shows signature progress as approved of required', () => {
      renderModal(hookStateFor(awaitingApprovalResponse));

      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });
  });

  describe('approval deadline countdown', () => {
    it('renders the time remaining until the deadline', () => {
      renderModal(hookStateFor(awaitingApprovalResponse));

      expect(screen.getByText('Time remaining')).toBeInTheDocument();
      expect(screen.getByRole('timer')).toHaveTextContent('02:30:15');
    });

    it('includes days when the deadline is more than a day away', () => {
      renderModal(hookStateFor(awaitingApprovalResponse, { remainingMs: REMAINING_MS + 86_400_000 }));

      expect(screen.getByRole('timer')).toHaveTextContent('1d 02:30:15');
    });

    it('replaces the countdown and blocks submission once the window has expired', () => {
      renderModal(hookStateFor(expiredApprovalResponse, { acknowledged: true }));

      expect(screen.queryByRole('timer')).not.toBeInTheDocument();
      expect(screen.getByText('Approval window expired')).toBeInTheDocument();
      expect(submitButton()).toBeDisabled();
      expect(submitButton()).toHaveAccessibleDescription('The approval window has expired.');
    });
  });

  describe('signature threshold', () => {
    it('keeps submit disabled below the threshold and says how many signatures are missing', () => {
      renderModal(hookStateFor(awaitingApprovalResponse, { acknowledged: true }));

      expect(submitButton()).toBeDisabled();
      expect(submitButton()).toHaveAccessibleDescription('Waiting for 2 more signatures.');
    });

    it('uses the singular form when one signature is missing', () => {
      const [first, second, third] = awaitingApprovalResponse.signers;
      renderModal(
        hookStateFor(
          { ...awaitingApprovalResponse, signers: [first, { ...second, status: 'approved' }, third] },
          { acknowledged: true },
        ),
      );

      expect(submitButton()).toHaveAccessibleDescription('Waiting for 1 more signature.');
    });

    it('keeps submit disabled at the threshold until the risk is acknowledged', () => {
      renderModal(hookStateFor(readyApprovalResponse));

      expect(screen.getByText('3 of 3')).toBeInTheDocument();
      expect(submitButton()).toBeDisabled();
      expect(submitButton()).toHaveAccessibleDescription('Acknowledge the high-risk status to continue.');
    });

    it('enables submit once the threshold is met and the risk is acknowledged', async () => {
      const user = userEvent.setup();
      const { state } = renderModal(hookStateFor(readyApprovalResponse, { acknowledged: true, canSubmit: true }));

      expect(submitButton()).toBeEnabled();
      expect(submitButton()).not.toHaveAttribute('aria-describedby');

      await user.click(submitButton());
      expect(state.submit).toHaveBeenCalledTimes(1);
    });
  });

  describe('acknowledgement checkbox', () => {
    it('names the risk level and forwards checks to the hook', async () => {
      const user = userEvent.setup();
      const { state } = renderModal(hookStateFor(readyApprovalResponse));

      expect(acknowledgement()).not.toBeChecked();
      expect(acknowledgement()).toHaveAccessibleName(/classified as high risk/i);

      await user.click(acknowledgement());
      expect(state.setAcknowledged).toHaveBeenCalledWith(true);
    });

    it('forwards unchecking to the hook', async () => {
      const user = userEvent.setup();
      const { state } = renderModal(hookStateFor(readyApprovalResponse, { acknowledged: true, canSubmit: true }));

      expect(acknowledgement()).toBeChecked();
      await user.click(acknowledgement());
      expect(state.setAcknowledged).toHaveBeenCalledWith(false);
    });

    it('can be toggled from the keyboard with Space', async () => {
      const user = userEvent.setup();
      const { state } = renderModal(hookStateFor(readyApprovalResponse));

      acknowledgement().focus();
      await user.keyboard(' ');
      expect(state.setAcknowledged).toHaveBeenCalledWith(true);
    });
  });

  describe('submission', () => {
    it('shows a submitting state and locks every control', () => {
      renderModal(
        hookStateFor(readyApprovalResponse, { acknowledged: true, isSubmitting: true }),
      );

      expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Close approval modal' })).toBeDisabled();
      expect(acknowledgement()).toBeDisabled();
    });

    it('shows the submission error returned by the API', () => {
      renderModal(
        hookStateFor(readyApprovalResponse, {
          acknowledged: true,
          canSubmit: true,
          submitError: 'Signature threshold not met on-chain',
        }),
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Signature threshold not met on-chain');
    });

    it('passes onSubmitted through to the hook', () => {
      const { onSubmitted } = renderModal(hookStateFor(readyApprovalResponse));

      expect(mockUseHighValueCargoApproval).toHaveBeenCalledWith(SHIPMENT_ID, {
        enabled: true,
        onSubmitted,
      });
    });
  });

  describe('closing', () => {
    it('closes on Escape', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(hookStateFor(awaitingApprovalResponse));

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores Escape while a submission is in flight', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(
        hookStateFor(readyApprovalResponse, { acknowledged: true, isSubmitting: true }),
      );

      await user.keyboard('{Escape}');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes from the close button, the Cancel button and the backdrop', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(hookStateFor(awaitingApprovalResponse));

      await user.click(screen.getByRole('button', { name: 'Close approval modal' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await user.click(screen.getByTestId('multisig-modal-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('does not close from the backdrop while submitting', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(
        hookStateFor(readyApprovalResponse, { acknowledged: true, isSubmitting: true }),
      );

      await user.click(screen.getByTestId('multisig-modal-backdrop'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('keyboard accessibility and focus management', () => {
    it('moves focus into the dialog and locks page scroll while open', () => {
      const { unmount } = renderModal(hookStateFor(awaitingApprovalResponse));

      expect(screen.getByRole('dialog')).toHaveFocus();
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('');
    });

    it('wraps Tab from the last control to the first and Shift+Tab back', async () => {
      const user = userEvent.setup();
      renderModal(hookStateFor(readyApprovalResponse, { acknowledged: true, canSubmit: true }));

      const closeButton = screen.getByRole('button', { name: 'Close approval modal' });

      submitButton().focus();
      await user.tab();
      expect(closeButton).toHaveFocus();

      await user.tab({ shift: true });
      expect(submitButton()).toHaveFocus();
    });

    it('sends Shift+Tab from the dialog container to the last control', async () => {
      const user = userEvent.setup();
      renderModal(hookStateFor(readyApprovalResponse, { acknowledged: true, canSubmit: true }));

      expect(screen.getByRole('dialog')).toHaveFocus();
      await user.tab({ shift: true });
      expect(submitButton()).toHaveFocus();
    });

    it('lets Tab move normally between controls inside the dialog', async () => {
      const user = userEvent.setup();
      renderModal(hookStateFor(readyApprovalResponse, { acknowledged: true, canSubmit: true }));

      screen.getByRole('button', { name: 'Close approval modal' }).focus();
      await user.tab();
      expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
      expect(screen.getByRole('button', { name: 'Close approval modal' })).not.toHaveFocus();
    });

    it('keeps focus inside when no control is focusable', async () => {
      const user = userEvent.setup();
      renderModal(hookStateFor(null, { isLoading: true, isSubmitting: true }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveFocus();
      await user.tab();
      expect(dialog).toHaveFocus();
    });

    it('restores focus to the element that opened it', async () => {
      const user = userEvent.setup();
      mockUseHighValueCargoApproval.mockReturnValue(hookStateFor(awaitingApprovalResponse));

      function Harness() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Review approval
            </button>
            <HighValueCargoMultiSigModal shipmentId={SHIPMENT_ID} isOpen={open} onClose={() => setOpen(false)} />
          </>
        );
      }

      render(<Harness />);
      const trigger = screen.getByRole('button', { name: 'Review approval' });

      await user.click(trigger);
      expect(screen.getByRole('dialog')).toHaveFocus();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });
});
