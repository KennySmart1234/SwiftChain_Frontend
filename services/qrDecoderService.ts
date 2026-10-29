import jsQR from 'jsqr';

export const qrDecoderService = {
  decode(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): string | null {
    const image = context.getImageData(0, 0, width, height);
    const result = jsQR(image.data, image.width, image.height, {
      inversionAttempts: 'dontInvert',
    });
    return result?.data?.trim() || null;
  },
};
