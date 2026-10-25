'use client';

import { RotateCcw, Truck, Upload } from 'lucide-react';
import { useVehicleRegistration } from '@/hooks/useVehicleRegistration';
import type { VehicleRegistrationInput } from '@/types/fleet';

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';

export function VehicleRegistration() {
  const {
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
  } = useVehicleRegistration();

  const renderError = (field: keyof VehicleRegistrationInput) =>
    errors[field] ? (
      <p className="mt-1 text-xs text-red-600" role="alert">
        {errors[field]}
      </p>
    ) : null;

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-800">
          Plate number
          <input
            aria-label="Plate number"
            className={inputClass}
            value={values.plateNumber}
            onChange={(event) => updateField('plateNumber', event.target.value)}
            required
          />
          {renderError('plateNumber')}
        </label>
        <label className="text-sm font-medium text-gray-800">
          Vehicle type
          <select
            aria-label="Vehicle type"
            className={inputClass}
            value={values.type}
            onChange={(event) =>
              updateField('type', event.target.value as VehicleRegistrationInput['type'])
            }
            required
          >
            <option value="">Select a type</option>
            <option value="van">Van</option>
            <option value="truck">Truck</option>
            <option value="refrigerated">Refrigerated</option>
            <option value="motorcycle">Motorcycle</option>
          </select>
          {renderError('type')}
        </label>
        <label className="text-sm font-medium text-gray-800">
          Make
          <input
            aria-label="Make"
            className={inputClass}
            value={values.make}
            onChange={(event) => updateField('make', event.target.value)}
            required
          />
          {renderError('make')}
        </label>
        <label className="text-sm font-medium text-gray-800">
          Model
          <input
            aria-label="Model"
            className={inputClass}
            value={values.model}
            onChange={(event) => updateField('model', event.target.value)}
            required
          />
          {renderError('model')}
        </label>
        <label className="text-sm font-medium text-gray-800">
          Year
          <input
            aria-label="Year"
            className={inputClass}
            inputMode="numeric"
            value={values.year}
            onChange={(event) => updateField('year', event.target.value)}
            required
          />
          {renderError('year')}
        </label>
        <label className="text-sm font-medium text-gray-800">
          Capacity (kg)
          <input
            aria-label="Capacity (kg)"
            className={inputClass}
            inputMode="decimal"
            value={values.capacityKg}
            onChange={(event) => updateField('capacityKg', event.target.value)}
            required
          />
          {renderError('capacityKg')}
        </label>
      </div>

      {values.type === 'refrigerated' && (
        <label className="block text-sm font-medium text-gray-800">
          Minimum temperature (C)
          <input
            aria-label="Minimum temperature (C)"
            className={inputClass}
            inputMode="decimal"
            value={values.temperatureMin}
            onChange={(event) => updateField('temperatureMin', event.target.value)}
            required
          />
          {renderError('temperatureMin')}
        </label>
      )}

      {values.type === 'motorcycle' && (
        <label className="block text-sm font-medium text-gray-800">
          Cargo box size
          <input
            aria-label="Cargo box size"
            className={inputClass}
            value={values.cargoBoxSize}
            onChange={(event) => updateField('cargoBoxSize', event.target.value)}
            required
          />
          {renderError('cargoBoxSize')}
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="rounded-md border border-dashed border-gray-300 p-4 text-sm font-medium text-gray-800">
          <span className="flex items-center gap-2"><Upload size={16} /> Registration document</span>
          <input
            aria-label="Registration document"
            className="mt-3 block w-full text-sm"
            type="file"
            accept="application/pdf,image/*"
            onChange={(event) =>
              updateField('registrationDocument', event.target.files?.[0] ?? null)
            }
            required
          />
          {renderError('registrationDocument')}
        </label>
        <label className="rounded-md border border-dashed border-gray-300 p-4 text-sm font-medium text-gray-800">
          <span className="flex items-center gap-2"><Truck size={16} /> Vehicle photo</span>
          <input
            aria-label="Vehicle photo"
            className="mt-3 block w-full text-sm"
            type="file"
            accept="image/*"
            onChange={(event) => setVehiclePhoto(event.target.files?.[0] ?? null)}
            required
          />
          {renderError('vehiclePhoto')}
        </label>
      </div>

      {photoPreview && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-800">Vehicle photo preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="h-40 w-full rounded-md object-cover" src={photoPreview} alt="Vehicle preview" />
        </div>
      )}

      {errors.submit && <p role="alert" className="text-sm text-red-600">{errors.submit}</p>}
      {isSubmitted && <p role="status" className="text-sm text-green-700">Vehicle registered successfully.</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSubmitting ? 'Registering...' : 'Register vehicle'}
        </button>
        <button
          type="button"
          aria-label="Reset form"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 p-2 text-gray-700"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </form>
  );
}

export default VehicleRegistration;
