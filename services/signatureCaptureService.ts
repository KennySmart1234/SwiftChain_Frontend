export interface SignatureQuality {
  isTooLight: boolean;
  inkLength: number;
}

export const MIN_SIGNATURE_INK_LENGTH = 48;

/** Pure signature rules shared by the canvas hook and its tests. */
export const signatureCaptureService = {
  assessQuality(
    inkLength: number,
    typedSignature: string,
    minimumInkLength = MIN_SIGNATURE_INK_LENGTH,
  ): SignatureQuality {
    const normalizedText = typedSignature.trim();
    const hasTypedSignature = normalizedText.length >= 2;

    return {
      inkLength,
      isTooLight: !hasTypedSignature && inkLength < minimumInkLength,
    };
  },
};
