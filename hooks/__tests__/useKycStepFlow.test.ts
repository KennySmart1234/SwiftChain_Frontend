import { renderHook, act } from '@testing-library/react';
import { useKycStepFlow, type KycStepFile } from '@/hooks/useKycStepFlow';

const doc = (filename: string): KycStepFile => ({
  filename,
  fileSize: 1024,
  fileType: 'application/pdf',
});

describe('useKycStepFlow', () => {
  test('starts at step 0 with no files', () => {
    const { result } = renderHook(() =>
      useKycStepFlow({ onSubmit: jest.fn() })
    );

    expect(result.current.currentStep).toBe(0);
    expect(result.current.filesByStep).toEqual({});
    expect(result.current.isStepValid).toBe(true);
    expect(result.current.canProceed).toBe(true);
  });

  test('next and back move within the 0-3 range', () => {
    const { result } = renderHook(() =>
      useKycStepFlow({ onSubmit: jest.fn() })
    );

    act(() => result.current.back());
    expect(result.current.currentStep).toBe(0);

    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.currentStep).toBe(3);

    act(() => result.current.next());
    expect(result.current.currentStep).toBe(3);
    expect(result.current.canProceed).toBe(false);
  });

  test('blocks progression while the current step is invalid', () => {
    const validateStep = jest.fn(
      (step: number, files) => (files[step]?.length ?? 0) > 0
    );
    const { result } = renderHook(() =>
      useKycStepFlow({ validateStep, onSubmit: jest.fn() })
    );

    expect(result.current.isStepValid).toBe(false);
    expect(result.current.canProceed).toBe(false);

    act(() => result.current.next());
    expect(result.current.currentStep).toBe(0);

    act(() => result.current.addFiles(0, [doc('id.pdf')]));
    expect(result.current.isStepValid).toBe(true);

    act(() => result.current.next());
    expect(result.current.currentStep).toBe(1);
  });

  test('tracks uploaded files per step and supports removal', () => {
    const { result } = renderHook(() =>
      useKycStepFlow({ onSubmit: jest.fn() })
    );

    act(() => result.current.addFiles(0, [doc('a.pdf')]));
    act(() => result.current.addFiles(2, [doc('b.png'), doc('c.jpg')]));
    act(() => result.current.removeFile(2, 'b.png'));

    expect(result.current.filesByStep[0]).toEqual([doc('a.pdf')]);
    expect(result.current.filesByStep[2]).toEqual([doc('c.jpg')]);
  });

  test('goToStep does not skip past an invalid earlier step', () => {
    const validateStep = (step: number, files: Record<number, KycStepFile[]>) =>
      (files[step]?.length ?? 0) > 0;
    const { result } = renderHook(() =>
      useKycStepFlow({ validateStep, onSubmit: jest.fn() })
    );

    act(() => result.current.goToStep(2));
    expect(result.current.currentStep).toBe(0);

    act(() => result.current.addFiles(0, [doc('a.pdf')]));
    act(() => result.current.goToStep(2));
    expect(result.current.currentStep).toBe(0);

    act(() => result.current.addFiles(1, [doc('b.pdf')]));
    act(() => result.current.goToStep(2));
    expect(result.current.currentStep).toBe(2);
  });

  test('goToStep clamps out-of-range indexes', () => {
    const { result } = renderHook(() =>
      useKycStepFlow({ onSubmit: jest.fn() })
    );

    act(() => result.current.goToStep(99));
    expect(result.current.currentStep).toBe(3);

    act(() => result.current.goToStep(-4));
    expect(result.current.currentStep).toBe(0);
  });

  test('submit sends all step files to onSubmit', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useKycStepFlow({ onSubmit }));

    act(() => result.current.addFiles(0, [doc('front.pdf')]));
    act(() => result.current.addFiles(1, [doc('back.pdf')]));

    await act(async () => {
      await result.current.submit();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      0: [doc('front.pdf')],
      1: [doc('back.pdf')],
    });
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submitError).toBeNull();
  });

  test('submit is refused and jumps to the first invalid step', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const validateStep = (
      step: number,
      files: Record<number, KycStepFile[]>
    ) => (step === 0 ? true : (files[step]?.length ?? 0) > 0);
    const { result } = renderHook(() =>
      useKycStepFlow({ validateStep, onSubmit })
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.currentStep).toBe(1);
    expect(result.current.submitError).toBe('Step 2 is incomplete');
  });

  test('surfaces submission errors', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Network down'));
    const { result } = renderHook(() => useKycStepFlow({ onSubmit }));

    act(() => result.current.addFiles(0, [doc('a.pdf')]));
    act(() => result.current.addFiles(1, [doc('b.pdf')]));
    act(() => result.current.addFiles(2, [doc('c.pdf')]));
    act(() => result.current.addFiles(3, [doc('d.pdf')]));

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.submitError).toBe('Network down');
    expect(result.current.isSubmitting).toBe(false);
  });

  test('reset clears step, files and errors', () => {
    const { result } = renderHook(() =>
      useKycStepFlow({ onSubmit: jest.fn() })
    );

    act(() => result.current.addFiles(0, [doc('a.pdf')]));
    act(() => result.current.next());
    act(() => result.current.reset());

    expect(result.current.currentStep).toBe(0);
    expect(result.current.filesByStep).toEqual({});
    expect(result.current.submitError).toBeNull();
  });
});
