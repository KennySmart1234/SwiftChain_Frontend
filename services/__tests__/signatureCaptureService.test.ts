import {
  MIN_SIGNATURE_INK_LENGTH,
  signatureCaptureService,
} from '@/services/signatureCaptureService';

describe('signatureCaptureService', () => {
  it('rejects ink below the configured quality threshold', () => {
    expect(
      signatureCaptureService.assessQuality(MIN_SIGNATURE_INK_LENGTH - 1, ''),
    ).toEqual({
      inkLength: MIN_SIGNATURE_INK_LENGTH - 1,
      isTooLight: true,
    });
  });

  it('accepts ink at the configured quality threshold', () => {
    expect(
      signatureCaptureService.assessQuality(MIN_SIGNATURE_INK_LENGTH, ''),
    ).toEqual({
      inkLength: MIN_SIGNATURE_INK_LENGTH,
      isTooLight: false,
    });
  });

  it('accepts a trimmed typed fallback with at least two characters', () => {
    expect(signatureCaptureService.assessQuality(0, '  Ada  ').isTooLight).toBe(false);
  });
});
