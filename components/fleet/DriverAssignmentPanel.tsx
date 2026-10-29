'use client';

import { useState } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDriverAssignment } from '@/hooks/useDriverAssignment';
import type { PendingShipment } from '@/types/driverAssignment';
import type { Driver } from '@/types/fleet';

const PRIORITY_BADGE: Record<PendingShipment['priority'], string> = {
  standard: 'bg-gray-100 text-gray-700',
  urgent: 'bg-red-100 text-red-700',
};

function ShipmentCard({ shipment }: { shipment: PendingShipment }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shipment.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={`shipment-card-${shipment.id}`}
      className={`cursor-grab rounded-md border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[shipment.priority]}`}
        >
          {shipment.priority}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900">{shipment.packageDescription}</p>
      <p className="mt-1 text-xs text-gray-500">
        {shipment.pickupAddress} &rarr; {shipment.dropoffAddress}
      </p>
    </div>
  );
}

function DriverDropZone({ driver }: { driver: Driver }) {
  const { setNodeRef, isOver } = useDroppable({ id: driver.id });

  return (
    <div
      ref={setNodeRef}
      data-testid={`driver-dropzone-${driver.id}`}
      className={`rounded-md border-2 border-dashed p-4 text-center transition-colors ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <p className="text-sm font-medium text-gray-900">{driver.name}</p>
      <p className="text-xs text-gray-500">{driver.vehicleType}</p>
      <p className="mt-1 text-xs text-gray-400">{driver.activeDeliveries} active deliveries</p>
    </div>
  );
}

export function DriverAssignmentPanel() {
  const {
    shipments,
    drivers,
    isLoading,
    error,
    pendingAssignment,
    requestAssignment,
    cancelAssignment,
    confirmAssignment,
    isAssigning,
  } = useDriverAssignment();
  const [justAssigned, setJustAssigned] = useState(false);

  if (isLoading) {
    return (
      <section
        aria-label="Driver assignment panel"
        className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500"
      >
        Loading shipments and drivers...
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-label="Driver assignment panel"
        className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-red-600"
      >
        {error}
      </section>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    requestAssignment({ shipmentId: String(active.id), driverId: String(over.id) });
  };

  const handleConfirm = async () => {
    await confirmAssignment();
    setJustAssigned(true);
    setTimeout(() => setJustAssigned(false), 3000);
  };

  const pendingShipment = shipments.find((s) => s.id === pendingAssignment?.shipmentId);
  const pendingDriver = drivers.find((d) => d.id === pendingAssignment?.driverId);

  return (
    <section aria-label="Driver assignment panel" className="space-y-4">
      {justAssigned && (
        <div
          role="status"
          data-testid="assignment-success"
          className="rounded-md bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800"
        >
          Shipment assigned successfully
        </div>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-6 lg:hidden">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Pending Shipments</h3>
            <ul className="space-y-2">
              {shipments.map((shipment) => (
                <li key={shipment.id}>
                  <p className="rounded-md border border-gray-200 bg-white p-3 text-sm">
                    {shipment.packageDescription}: {shipment.pickupAddress} &rarr;{' '}
                    {shipment.dropoffAddress}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Available Drivers</h3>
            <ul className="space-y-2">
              {drivers.map((driver) => (
                <li key={driver.id} className="rounded-md border border-gray-200 bg-white p-3 text-sm">
                  {driver.name} ({driver.vehicleType})
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="hidden gap-6 lg:grid lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Pending Shipments</h3>
            <div className="space-y-2">
              {shipments.length === 0 ? (
                <p className="rounded-md border border-gray-200 bg-white p-4 text-center text-sm text-gray-500">
                  No pending shipments.
                </p>
              ) : (
                shipments.map((shipment) => (
                  <ShipmentCard key={shipment.id} shipment={shipment} />
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Available Drivers</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {drivers.map((driver) => (
                <DriverDropZone key={driver.id} driver={driver} />
              ))}
            </div>
          </div>
        </div>
      </DndContext>

      {pendingAssignment && pendingShipment && pendingDriver && (
        <div
          role="dialog"
          aria-label="Confirm assignment"
          className="fixed inset-0 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-sm rounded-md bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Confirm Assignment</h3>
            <p className="mb-4 text-sm text-gray-600">
              Assign &ldquo;{pendingShipment.packageDescription}&rdquo; to {pendingDriver.name}?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelAssignment}
                className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAssigning}
                onClick={handleConfirm}
                className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isAssigning ? 'Assigning...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
