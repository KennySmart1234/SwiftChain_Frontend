import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VehicleRegistration } from '@/components/fleet/VehicleRegistration';
import { useVehicleRegistration } from '@/hooks/useVehicleRegistration';
import type { VehicleRegistrationInput } from '@/types/fleet';

jest.mock('@/hooks/useVehicleRegistration');

const mockedUseVehicleRegistration = useVehicleRegistration as jest.MockedFunction<
  typeof useVehicleRegistration
>;

const emptyValues: VehicleRegistrationInput = {
  plateNumber: '',
  make: '',
  model: '',
  year: '',
  type: '',
  capacityKg: '',
  temperatureMin: '',
  cargoBoxSize: '',
  registrationDocument: null,
  vehiclePhoto: null,
};

function mockHook(overrides: Partial<ReturnType<typeof useVehicleRegistration>> = {}) {
  mockedUseVehicleRegistration.mockReturnValue({
    values: emptyValues,
    errors: {},
    isValid: false,
    isSubmitting: false,
    isSubmitted: false,
    photoPreview: null,
    updateField: jest.fn(),
    setVehiclePhoto: jest.fn(),
    submit: jest.fn().mockResolvedValue(true),
    reset: jest.fn(),
    ...overrides,
  });
}

describe('VehicleRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHook();
  });

  it('renders every required vehicle field', () => {
    render(<VehicleRegistration />);

    expect(screen.getByLabelText('Plate number')).toBeRequired();
    expect(screen.getByLabelText('Vehicle type')).toBeRequired();
    expect(screen.getByLabelText('Make')).toBeRequired();
    expect(screen.getByLabelText('Model')).toBeRequired();
    expect(screen.getByLabelText('Year')).toBeRequired();
    expect(screen.getByLabelText('Capacity (kg)')).toBeRequired();
    expect(screen.getByLabelText('Registration document')).toBeRequired();
    expect(screen.getByLabelText('Vehicle photo')).toBeRequired();
  });

  it('passes text input changes to the hook', async () => {
    const updateField = jest.fn();
    mockHook({ updateField });
    const user = userEvent.setup();
    render(<VehicleRegistration />);

    await user.type(screen.getByLabelText('Plate number'), 'ABC-123');

    expect(updateField).toHaveBeenCalledWith('plateNumber', 'A');
  });

  it('routes every standard field and document change through the hook', () => {
    const updateField = jest.fn();
    mockHook({ updateField });
    render(<VehicleRegistration />);
    const document = new File(['registration'], 'registration.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(screen.getByLabelText('Vehicle type'), { target: { value: 'truck' } });
    fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'Ford' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'Transit' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2025' } });
    fireEvent.change(screen.getByLabelText('Capacity (kg)'), { target: { value: '1200' } });
    fireEvent.change(screen.getByLabelText('Registration document'), {
      target: { files: [document] },
    });

    expect(updateField).toHaveBeenCalledWith('type', 'truck');
    expect(updateField).toHaveBeenCalledWith('make', 'Ford');
    expect(updateField).toHaveBeenCalledWith('model', 'Transit');
    expect(updateField).toHaveBeenCalledWith('year', '2025');
    expect(updateField).toHaveBeenCalledWith('capacityKg', '1200');
    expect(updateField).toHaveBeenCalledWith('registrationDocument', document);
  });

  it('shows refrigerated fields only for refrigerated vehicles', () => {
    const updateField = jest.fn();
    mockHook({ values: { ...emptyValues, type: 'refrigerated' }, updateField });
    render(<VehicleRegistration />);

    expect(screen.getByLabelText('Minimum temperature (C)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cargo box size')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Minimum temperature (C)'), {
      target: { value: '-10' },
    });
    expect(updateField).toHaveBeenCalledWith('temperatureMin', '-10');
  });

  it('shows cargo box fields only for motorcycles', () => {
    const updateField = jest.fn();
    mockHook({ values: { ...emptyValues, type: 'motorcycle' }, updateField });
    render(<VehicleRegistration />);

    expect(screen.getByLabelText('Cargo box size')).toBeInTheDocument();
    expect(screen.queryByLabelText('Minimum temperature (C)')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cargo box size'), {
      target: { value: '60 L' },
    });
    expect(updateField).toHaveBeenCalledWith('cargoBoxSize', '60 L');
  });

  it('hides dynamic fields for a standard van', () => {
    mockHook({ values: { ...emptyValues, type: 'van' } });
    render(<VehicleRegistration />);

    expect(screen.queryByLabelText('Cargo box size')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Minimum temperature (C)')).not.toBeInTheDocument();
  });

  it('renders validation messages returned by the hook', () => {
    mockHook({
      errors: {
        plateNumber: 'Plate number is required',
        make: 'Make is required',
        model: 'Model is required',
        year: 'Year is required',
        type: 'Vehicle type is required',
        capacityKg: 'Capacity is required',
        registrationDocument: 'Registration document is required',
        vehiclePhoto: 'Vehicle photo is required',
      },
    });
    render(<VehicleRegistration />);

    expect(screen.getByText('Plate number is required')).toHaveAttribute('role', 'alert');
    expect(screen.getByText('Registration document is required')).toBeInTheDocument();
    expect(screen.getByText('Vehicle photo is required')).toBeInTheDocument();
  });

  it('keeps submit disabled until the form is valid', () => {
    render(<VehicleRegistration />);
    expect(screen.getByRole('button', { name: 'Register vehicle' })).toBeDisabled();
  });

  it('enables submit for a valid form', () => {
    mockHook({ isValid: true });
    render(<VehicleRegistration />);
    expect(screen.getByRole('button', { name: 'Register vehicle' })).toBeEnabled();
  });

  it('submits through the hook', async () => {
    const submit = jest.fn().mockResolvedValue(true);
    mockHook({ isValid: true, submit });
    const user = userEvent.setup();
    render(<VehicleRegistration />);

    await user.click(screen.getByRole('button', { name: 'Register vehicle' }));

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('sends an uploaded photo to the hook', () => {
    const setVehiclePhoto = jest.fn();
    mockHook({ setVehiclePhoto });
    render(<VehicleRegistration />);
    const photo = new File(['vehicle'], 'vehicle.png', { type: 'image/png' });

    fireEvent.change(screen.getByLabelText('Vehicle photo'), {
      target: { files: [photo] },
    });

    expect(setVehiclePhoto).toHaveBeenCalledWith(photo);
  });

  it('renders the vehicle photo preview', () => {
    mockHook({ photoPreview: 'blob:vehicle-preview' });
    render(<VehicleRegistration />);

    expect(screen.getByAltText('Vehicle preview')).toHaveAttribute(
      'src',
      'blob:vehicle-preview',
    );
  });

  it('clears every field through the reset action', async () => {
    const reset = jest.fn();
    mockHook({ reset });
    const user = userEvent.setup();
    render(<VehicleRegistration />);

    await user.click(screen.getByRole('button', { name: 'Reset form' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('shows submission progress and success feedback', () => {
    mockHook({ isValid: true, isSubmitting: true, isSubmitted: true });
    render(<VehicleRegistration />);

    expect(screen.getByRole('button', { name: 'Registering...' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Vehicle registered successfully.');
  });
});
