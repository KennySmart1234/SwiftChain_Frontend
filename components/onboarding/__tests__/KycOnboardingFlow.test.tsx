import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KycOnboardingFlow } from '@/components/onboarding/KycOnboardingFlow';
import { kycService } from '@/services/kycService';

jest.mock('@/services/kycService');
const svc = kycService as jest.Mocked<typeof kycService>;

const pdf = (name: string) => new File(['x'], name, { type: 'application/pdf' });

async function upload(label: string | RegExp, file: File) {
  await userEvent.upload(screen.getByLabelText(label), file);
}

async function completeStep1() {
  await upload(/front/, pdf('front.pdf'));
  await upload(/back/, pdf('back.pdf'));
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
}

describe('KycOnboardingFlow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the step indicator starting at step 1 of 4', () => {
    render(<KycOnboardingFlow />);
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    const active = screen.getByRole('button', { name: /^Step 1:/ });
    expect(active).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /^Step 2:/ })).not.toHaveAttribute('aria-current');
  });

  it('blocks progression when the step is incomplete', async () => {
    render(<KycOnboardingFlow />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
  });

  it('rejects files with an unsupported type', async () => {
    render(<KycOnboardingFlow />);
    await userEvent.upload(
      screen.getByLabelText(/front/),
      new File(['x'], 'front.txt', { type: 'text/plain' }),
      { applyAccept: false }
    );
    expect(await screen.findByText(/must be PDF, JPG, or PNG/)).toBeInTheDocument();
  });

  it('rejects files larger than 5MB', async () => {
    render(<KycOnboardingFlow />);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf', {
      type: 'application/pdf',
    });
    await upload(/front/, big);
    expect(await screen.findByText(/must not exceed 5MB/)).toBeInTheDocument();
  });

  it('advances to step 2 when step 1 is complete', async () => {
    render(<KycOnboardingFlow />);
    await completeStep1();
    expect(await screen.findByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Vehicle registration')).toBeInTheDocument();
  });

  it('allows returning to a previous step and keeps its files', async () => {
    render(<KycOnboardingFlow />);
    await completeStep1();
    await screen.findByText('Step 2 of 4');
    await userEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('front.pdf')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Step 2 of 4');
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('does not allow jumping ahead to a later step', async () => {
    render(<KycOnboardingFlow />);
    expect(screen.getByRole('button', { name: /^Step 3:/ })).toBeDisabled();
  });

  it('uploads all documents and submits for approval from the review step', async () => {
    let n = 0;
    svc.uploadDocument.mockImplementation(async () => ({
      success: true,
      message: 'ok',
      data: {
        id: `doc-${++n}`,
        filename: 'f',
        fileType: 'application/pdf',
        fileSize: 1,
        uploadedAt: '2026-03-01T00:00:00Z',
        status: 'pending',
      },
    }));
    svc.submitForApproval.mockResolvedValue({ success: true, message: 'ok' });

    render(<KycOnboardingFlow />);
    await completeStep1();
    await upload('Vehicle registration', pdf('reg.pdf'));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await upload('Profile photo', new File(['x'], 'me.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Step 4 of 4')).toBeInTheDocument();
    expect(screen.getByText('reg.pdf')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Submit for approval' }));

    await waitFor(() => expect(screen.getByText('Documents submitted')).toBeInTheDocument());
    expect(svc.uploadDocument).toHaveBeenCalledTimes(4);
    const types = svc.uploadDocument.mock.calls.map((c) => c[0].get('documentType'));
    expect(types).toEqual([
      'drivers-license-front',
      'drivers-license-back',
      'vehicle-registration',
      'profile-photo',
    ]);
    expect(svc.submitForApproval).toHaveBeenCalledWith(['doc-1', 'doc-2', 'doc-3', 'doc-4']);
  });

  it('shows an error and stays on review when the upload fails', async () => {
    svc.uploadDocument.mockRejectedValue({ response: { data: { message: 'Server said no' } } });

    render(<KycOnboardingFlow />);
    await completeStep1();
    await upload('Vehicle registration', pdf('reg.pdf'));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await upload('Profile photo', new File(['x'], 'me.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Submit for approval' }));

    expect(await screen.findByText('Server said no')).toBeInTheDocument();
    expect(svc.submitForApproval).not.toHaveBeenCalled();
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
  });
});
