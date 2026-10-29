import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignatureCanvas } from '@/components/deliveries/SignatureCanvas';
import { ProofUpload } from '@/features/deliveries/components/ProofUpload';
import { useProofUpload } from '@/hooks/useProofUpload';

jest.mock('@/hooks/useProofUpload');

const mockedUseProofUpload = useProofUpload as jest.MockedFunction<
  typeof useProofUpload
>;
const drawingContext = {
  beginPath: jest.fn(),
  clearRect: jest.fn(),
  fillText: jest.fn(),
  lineTo: jest.fn(),
  moveTo: jest.fn(),
  stroke: jest.fn(),
  fillStyle: '',
  font: '',
  lineCap: '',
  lineJoin: '',
  lineWidth: 0,
  strokeStyle: '',
  textBaseline: '',
};

function draw(pointerType: 'mouse' | 'touch' = 'mouse') {
  const canvas = screen.getByLabelText('Recipient signature drawing area');
  fireEvent.pointerDown(canvas, {
    button: 0,
    clientX: 10,
    clientY: 20,
    pointerId: 1,
    pointerType,
  });
  fireEvent.pointerMove(canvas, {
    clientX: 100,
    clientY: 40,
    pointerId: 1,
    pointerType,
  });
  fireEvent.pointerUp(canvas, { pointerId: 1, pointerType });
}

describe('SignatureCapture contract', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: MouseEvent,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      drawingContext as unknown as CanvasRenderingContext2D,
    );
    jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,signature',
    );
    jest.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 160,
      height: 160,
      left: 0,
      right: 360,
      top: 0,
      width: 360,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('renders the canvas at the requested dimensions', () => {
    render(<SignatureCanvas onSave={jest.fn()} width={360} height={160} />);
    const canvas = screen.getByLabelText('Recipient signature drawing area');
    expect(canvas).toHaveAttribute('width', '360');
    expect(canvas).toHaveAttribute('height', '160');
  });

  it('tracks drawing state from pointer down through pointer up', () => {
    render(<SignatureCanvas onSave={jest.fn()} />);
    const canvas = screen.getByLabelText('Recipient signature drawing area');

    fireEvent.pointerDown(canvas, {
      button: 0,
      clientX: 10,
      clientY: 20,
      pointerId: 2,
    });
    expect(canvas).toHaveAttribute('data-drawing', 'true');
    fireEvent.pointerUp(canvas, { pointerId: 2 });
    expect(canvas).toHaveAttribute('data-drawing', 'false');
  });

  it('clears the complete canvas and resets the signature', async () => {
    const user = userEvent.setup();
    render(<SignatureCanvas onSave={jest.fn()} width={360} height={160} />);
    draw();

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(drawingContext.clearRect).toHaveBeenCalledWith(0, 0, 360, 160);
    expect(screen.getByRole('button', { name: 'Save signature' })).toBeDisabled();
  });

  it('returns a PNG data URL when saving', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(<SignatureCanvas onSave={onSave} />);
    draw();

    await user.click(screen.getByRole('button', { name: 'Save signature' }));

    expect(onSave).toHaveBeenCalledWith('data:image/png;base64,signature');
  });

  it('accepts mobile touch pointer events', () => {
    render(<SignatureCanvas onSave={jest.fn()} />);
    draw('touch');
    expect(drawingContext.stroke).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save signature' })).toBeEnabled();
  });

  it('keeps ProofUpload submission disabled when a photo lacks a signature', () => {
    mockedUseProofUpload.mockReturnValue({
      uploadProgress: 0,
      compressionProgress: 0,
      isUploading: false,
      isCompressing: false,
      uploadedProofs: [],
      errors: [],
      stagedPhoto: new File(['photo'], 'proof.png', { type: 'image/png' }),
      photoPreviewUrl: 'blob:proof-photo',
      signatureDataUrl: null,
      canSubmitBundle: false,
      handleFileCapture: jest.fn(),
      handleCameraCapture: jest.fn(),
      clearUploadedProofs: jest.fn(),
      removeProof: jest.fn(),
      stagePhoto: jest.fn(),
      stageCameraCapture: jest.fn(),
      setSignature: jest.fn(),
      submitProofBundle: jest.fn().mockResolvedValue(false),
      resetBundle: jest.fn(),
    });

    render(<ProofUpload deliveryId="delivery-1" />);

    expect(screen.getByText('Signature not captured.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit delivery proof' })).toBeDisabled();
  });
});
