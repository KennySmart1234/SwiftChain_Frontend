'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fleetService } from '@/services/fleetService';
import type { VehicleRegistrationInput } from '@/types/fleet';

const EMPTY_FORM: VehicleRegistrationInput = {
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

export type VehicleRegistrationErrors = Partial<
  Record<keyof VehicleRegistrationInput | 'submit', string>
>;

export function validateVehicleRegistration(
  values: VehicleRegistrationInput,
): VehicleRegistrationErrors {
  const errors: VehicleRegistrationErrors = {};
  const currentYear = new Date().getFullYear() + 1;
  const year = Number(values.year);
  const capacity = Number(values.capacityKg);

  if (!values.plateNumber.trim()) errors.plateNumber = 'Plate number is required';
  if (!values.make.trim()) errors.make = 'Make is required';
  if (!values.model.trim()) errors.model = 'Model is required';
  if (!values.year) errors.year = 'Year is required';
  else if (!Number.isInteger(year) || year < 1980 || year > currentYear) {
    errors.year = `Year must be between 1980 and ${currentYear}`;
  }
  if (!values.type) errors.type = 'Vehicle type is required';
  if (!values.capacityKg) errors.capacityKg = 'Capacity is required';
  else if (!Number.isFinite(capacity) || capacity <= 0) {
    errors.capacityKg = 'Capacity must be greater than zero';
  }
  if (!values.registrationDocument) {
    errors.registrationDocument = 'Registration document is required';
  }
  if (!values.vehiclePhoto) errors.vehiclePhoto = 'Vehicle photo is required';
  if (values.type === 'refrigerated' && !values.temperatureMin) {
    errors.temperatureMin = 'Minimum temperature is required';
  }
  if (values.type === 'motorcycle' && !values.cargoBoxSize.trim()) {
    errors.cargoBoxSize = 'Cargo box size is required';
  }

  return errors;
}

export function useVehicleRegistration() {
  const [values, setValues] = useState<VehicleRegistrationInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<VehicleRegistrationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const validationErrors = useMemo(
    () => validateVehicleRegistration(values),
    [values],
  );
  const isValid = Object.keys(validationErrors).length === 0;

  const updateField = useCallback(
    <K extends keyof VehicleRegistrationInput>(
      field: K,
      value: VehicleRegistrationInput[K],
    ) => {
      setValues((current) => {
        const next = { ...current, [field]: value };
        if (field === 'type') {
          if (value !== 'refrigerated') next.temperatureMin = '';
          if (value !== 'motorcycle') next.cargoBoxSize = '';
        }
        return next;
      });
      setErrors((current) => ({ ...current, [field]: undefined, submit: undefined }));
      setIsSubmitted(false);
    },
    [],
  );

  const setVehiclePhoto = useCallback(
    (file: File | null) => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(file ? URL.createObjectURL(file) : null);
      updateField('vehiclePhoto', file);
    },
    [photoPreview, updateField],
  );

  const reset = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setValues(EMPTY_FORM);
    setErrors({});
    setPhotoPreview(null);
    setIsSubmitted(false);
  }, [photoPreview]);

  const submit = useCallback(async () => {
    const nextErrors = validateVehicleRegistration(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;

    setIsSubmitting(true);
    try {
      await fleetService.registerVehicle(values);
      setIsSubmitted(true);
      return true;
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Vehicle registration failed',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [values]);

  return {
    values,
    errors,
    isValid,
    isSubmitting,
    isSubmitted,
    photoPreview,
    updateField,
    setVehiclePhoto,
    submit,
    reset,
  };
}
