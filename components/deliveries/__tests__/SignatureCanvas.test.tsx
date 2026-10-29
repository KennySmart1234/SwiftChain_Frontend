import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignatureCanvas } from '@/components/deliveries/SignatureCanvas';

const context = {
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

function drawSignature(pointerType: 'mouse' | 'touch' = 'mouse') {
  const canvas = screen.getByLabelText('Recipient signature drawing area');
  fireEvent.pointerDown(canvas, {
    button: 0,
    clientX: 10,
    clientY: 20,
    pointerId: 1,
    pointerType,
  });
  fireEvent.pointerMove(canvas, {
    clientX: 90,
    clientY: 40,
    pointerId: 1,
    pointerType,
  });
  fireEvent.pointerUp(canvas, { pointerId: 1, pointerType });
}

describe('SignatureCanvas', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: MouseEvent,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,c2lnbmF0dXJl',
    );
    jest.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 260,
      height: 260,
      left: 0,
      right: 720,
      top: 0,
      width: 720,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('renders the drawing area, fallback, and actions', () => {
    render(<SignatureCanvas onSave={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Recipient signature' })).toBeInTheDocument();
    expect(screen.getByLabelText('Recipient signature drawing area')).toBeInTheDocument();
    expect(screen.getByLabelText('Keyboard signature fallback')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save signature' })).toBeDisabled();
  });

  it('captures a mouse stroke on the canvas', () => {
    render(<SignatureCanvas onSave={jest.fn()} />);
    drawSignature('mouse');

    expect(context.beginPath).toHaveBeenCalled();
    expect(context.moveTo).toHaveBeenCalledWith(10, 20);
    expect(context.lineTo).toHaveBeenCalledWith(90, 40);
    expect(context.stroke).toHaveBeenCalled();
  });

  it('captures a touch pointer stroke on the canvas', () => {
    render(<SignatureCanvas onSave={jest.fn()} />);
    drawSignature('touch');

    expect(context.lineTo).toHaveBeenCalledWith(90, 40);
    expect(screen.getByRole('button', { name: 'Save signature' })).toBeEnabled();
  });

  it('shows a quality warning for a dot without a meaningful stroke', () => {
    render(<SignatureCanvas onSave={jest.fn()} />);
    const canvas = screen.getByLabelText('Recipient signature drawing area');

    fireEvent.pointerDown(canvas, { button: 0, clientX: 10, clientY: 10, pointerId: 2 });
    fireEvent.pointerUp(canvas, { pointerId: 2 });

    expect(screen.getByRole('alert')).toHaveTextContent('Signature is too light');
    expect(screen.getByRole('button', { name: 'Save signature' })).toBeDisabled();
  });

  it('removes the quality warning after a meaningful stroke', () => {
    render(<SignatureCanvas onSave={jest.fn()} />);
    drawSignature();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save signature' })).toBeEnabled();
  });

  it('accumulates ink quality across multiple strokes', () => {
    render(<SignatureCanvas onSave={jest.fn()} />);
    const canvas = screen.getByLabelText('Recipient signature drawing area');

    fireEvent.pointerDown(canvas, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 40, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.pointerDown(canvas, { button: 0, clientX: 40, clientY: 10, pointerId: 2 });
    fireEvent.pointerMove(canvas, { clientX: 70, clientY: 10, pointerId: 2 });
    fireEvent.pointerUp(canvas, { pointerId: 2 });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save signature' })).toBeEnabled();
  });

  it('saves a drawn signature as a PNG data URL', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(<SignatureCanvas onSave={onSave} />);
    drawSignature();

    await user.click(screen.getByRole('button', { name: 'Save signature' }));

    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
    expect(onSave).toHaveBeenCalledWith('data:image/png;base64,c2lnbmF0dXJl');
  });

  it('clears the canvas and resets both actions', async () => {
    const user = userEvent.setup();
    render(<SignatureCanvas onSave={jest.fn()} />);
    drawSignature();

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 720, 260);
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save signature' })).toBeDisabled();
  });

  it('supports a keyboard-entered recipient signature', async () => {
    const user = userEvent.setup();
    render(<SignatureCanvas onSave={jest.fn()} />);

    await user.type(screen.getByLabelText('Keyboard signature fallback'), 'Ada Lovelace');

    expect(screen.getByRole('button', { name: 'Save signature' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders typed text onto the canvas before saving', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(<SignatureCanvas onSave={onSave} />);
    await user.type(screen.getByLabelText('Keyboard signature fallback'), 'Ada Lovelace');

    await user.click(screen.getByRole('button', { name: 'Save signature' }));

    expect(context.fillText).toHaveBeenCalledWith('Ada Lovelace', 24, 130);
    expect(onSave).toHaveBeenCalledWith('data:image/png;base64,c2lnbmF0dXJl');
  });

  it('treats one typed character as too light', async () => {
    const user = userEvent.setup();
    render(<SignatureCanvas onSave={jest.fn()} />);

    await user.type(screen.getByLabelText('Keyboard signature fallback'), 'A');

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save signature' })).toBeDisabled();
  });

  it('disables all interaction when disabled', () => {
    render(<SignatureCanvas onSave={jest.fn()} disabled />);

    expect(screen.getByLabelText('Keyboard signature fallback')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save signature' })).toBeDisabled();
  });
});
