export const dynamic = 'force-dynamic';

import { CreateWizard } from '@/components/shipment/CreateWizard';
import { CurrencyConverter } from '@/features/deliveries/components/CurrencyConverter';

export default function CreateDeliveryPage() {
  return (
    <div className="space-y-6 py-6">
      <CreateWizard />
      <CurrencyConverter />
    </div>
  );
}
