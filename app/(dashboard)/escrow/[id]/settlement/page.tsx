import { SettlementConfirmation } from '@/components/escrow/SettlementConfirmation';

export default async function EscrowSettlementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-gray-50">
      <SettlementConfirmation escrowId={id} />
    </main>
  );
}
