import { CancelShipment } from '@/features/deliveries/components/CancelShipment';
import { EscrowActions } from '@/components/escrow/EscrowActions';

export default async function DeliveryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6">
      <h1
        data-tour="delivery-details-title"
        className="text-2xl font-semibold"
      >
        Delivery Details: {id}
      </h1>

      {/* Delivery status and tracking placeholder */}

      <EscrowActions shipmentId={id} />
      <CancelShipment shipmentId={id} />
    </div>
  );
}
