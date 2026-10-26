import { act, renderHook } from '@testing-library/react';
import {
  useVehicleRegistration,
  validateVehicleRegistration,
} from '@/hooks/useVehicleRegistration';
import { fleetService } from '@/services/fleetService';
import type { VehicleRegistrationInput } from '@/types/fleet';

jest.mock('@/services/fleetService', () => ({
  fleetService: { registerVehicle: jest.fn() },
}));

const registerVehicle = fleetService.registerVehicle as jest.Mock;

const validValues: VehicleRegistrationInput = {
  plateNumber: 'ABC-123',
  make: 'Ford',
  model: 'Transit',
  year: '2025',
  type: 'van',
  capacityKg: '1200',
  temperatureMin: '',
  cargoBoxSize: '',
  registrationDocument: new File(['registration'], 'registration.pdf', {
    type: 'application/pdf',
  }),
  vehiclePhoto: new File(['photo'], 'vehicle.png', { type: 'image/png' }),
};

describe('useVehicleRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts empty and invalid', () => {
    const { result } = renderHook(() => useVehicleRegistration());
    expect(result.current.values.plateNumber).toBe('');
    expect(result.current.isValid).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('validates all empty required fields', () => {
    const errors = validateVehicleRegistration({
      ...validValues,
      plateNumber: '',
      make: '',
      model: '',
      year: '',
      type: '',
      capacityKg: '',
      registrationDocument: null,
      vehiclePhoto: null,
    });

    expect(errors).toEqual(
      expect.objectContaining({
        plateNumber: expect.any(String),
        make: expect.any(String),
        model: expect.any(String),
        year: expect.any(String),
        type: expect.any(String),
        capacityKg: expect.any(String),
        registrationDocument: expect.any(String),
        vehiclePhoto: expect.any(String),
      }),
    );
  });

  it('requires the vehicle-specific refrigerated field', () => {
    expect(
      validateVehicleRegistration({ ...validValues, type: 'refrigerated' }),
    ).toHaveProperty('temperatureMin');
  });

  it('rejects invalid numeric values and missing motorcycle cargo size', () => {
    const errors = validateVehicleRegistration({
      ...validValues,
      type: 'motorcycle',
      year: '1979',
      capacityKg: '0',
    });
    expect(errors.year).toContain('1980');
    expect(errors.capacityKg).toContain('greater than zero');
    expect(errors.cargoBoxSize).toBe('Cargo box size is required');
  });

  it('clears stale dynamic values when vehicle type changes', () => {
    const { result } = renderHook(() => useVehicleRegistration());
    act(() => {
      result.current.updateField('type', 'refrigerated');
      result.current.updateField('temperatureMin', '-10');
      result.current.updateField('type', 'van');
    });
    expect(result.current.values.temperatureMin).toBe('');
  });

  it('does not call the API for invalid data', async () => {
    const { result } = renderHook(() => useVehicleRegistration());
    await act(async () => {
      expect(await result.current.submit()).toBe(false);
    });
    expect(registerVehicle).not.toHaveBeenCalled();
    expect(result.current.errors.plateNumber).toBeDefined();
  });

  it('submits valid data through the fleet service', async () => {
    registerVehicle.mockResolvedValue({ id: 'vehicle-1' });
    const { result } = renderHook(() => useVehicleRegistration());
    act(() => {
      for (const [field, value] of Object.entries(validValues)) {
        result.current.updateField(
          field as keyof VehicleRegistrationInput,
          value as never,
        );
      }
    });

    await act(async () => {
      expect(await result.current.submit()).toBe(true);
    });
    expect(registerVehicle).toHaveBeenCalledWith(validValues);
    expect(result.current.isSubmitted).toBe(true);
  });

  it('surfaces API failures without marking the form submitted', async () => {
    registerVehicle.mockRejectedValue(new Error('Plate already registered'));
    const { result } = renderHook(() => useVehicleRegistration());
    act(() => {
      for (const [field, value] of Object.entries(validValues)) {
        result.current.updateField(
          field as keyof VehicleRegistrationInput,
          value as never,
        );
      }
    });

    await act(async () => {
      expect(await result.current.submit()).toBe(false);
    });
    expect(result.current.errors.submit).toBe('Plate already registered');
    expect(result.current.isSubmitted).toBe(false);
  });

  it('resets all fields after editing', () => {
    const { result } = renderHook(() => useVehicleRegistration());
    act(() => result.current.updateField('plateNumber', 'ABC-123'));
    act(() => result.current.reset());
    expect(result.current.values.plateNumber).toBe('');
    expect(result.current.errors).toEqual({});
  });

  it('creates and clears the selected vehicle photo preview', () => {
    const { result } = renderHook(() => useVehicleRegistration());
    const photo = new File(['photo'], 'vehicle.png', { type: 'image/png' });

    act(() => result.current.setVehiclePhoto(photo));
    expect(result.current.values.vehiclePhoto).toBe(photo);
    expect(result.current.photoPreview).toContain('blob://mock-');

    act(() => result.current.setVehiclePhoto(null));
    expect(result.current.values.vehiclePhoto).toBeNull();
    expect(result.current.photoPreview).toBeNull();
  });
});
