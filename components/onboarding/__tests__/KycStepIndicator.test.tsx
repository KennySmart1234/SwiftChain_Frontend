import { render, screen, fireEvent } from '@testing-library/react';
import { KycStepIndicator } from '@/components/onboarding/KycStepIndicator';

const steps = [
  { label: 'Identity' },
  { label: 'Address' },
  { label: 'Selfie' },
  { label: 'Review' },
];

describe('KycStepIndicator', () => {
  test('exposes progress to assistive technology', () => {
    render(<KycStepIndicator steps={steps} currentStep={1} />);

    const progressbar = screen.getByRole('progressbar', {
      name: 'KYC onboarding progress',
    });
    expect(progressbar).toHaveAttribute('aria-valuemin', '1');
    expect(progressbar).toHaveAttribute('aria-valuemax', '4');
    expect(progressbar).toHaveAttribute('aria-valuenow', '2');
    expect(progressbar).toHaveAttribute(
      'aria-valuetext',
      'Step 2 of 4: Address'
    );
  });

  test('marks the active step and shows checkmarks for completed steps', () => {
    const { container } = render(
      <KycStepIndicator steps={steps} currentStep={2} />
    );

    const items = container.querySelectorAll('li');
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(screen.getAllByText('(completed)')).toHaveLength(2);
    expect(items[3].querySelector('svg')).toBeNull();
  });

  test('renders all step labels with keyboard-focusable targets', () => {
    render(<KycStepIndicator steps={steps} currentStep={0} />);

    steps.forEach(({ label }) => {
      const text = screen.getByText(label);
      const focusTarget = text.closest('[tabindex="0"]');
      expect(focusTarget).not.toBeNull();
    });
  });

  test('calls onStepSelect with the index when a step is activated', () => {
    const onStepSelect = jest.fn();
    render(
      <KycStepIndicator
        steps={steps}
        currentStep={0}
        onStepSelect={onStepSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Selfie/ }));
    expect(onStepSelect).toHaveBeenCalledWith(2);
  });

  test('uses a vertical stack below the md breakpoint', () => {
    const { container } = render(
      <KycStepIndicator steps={steps} currentStep={0} />
    );

    const list = container.querySelector('ol');
    expect(list?.className).toContain('flex-col');
    expect(list?.className).toContain('md:flex-row');
  });
});
