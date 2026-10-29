import { NextResponse } from 'next/server';
import type { PricingFAQResponse } from '@/types/pricing';

const fixture: PricingFAQResponse = {
  items: [
    {
      id: 'how-does-escrow-work',
      question: 'How does SwiftChain escrow protection work?',
      answer:
        'Funds for a delivery are locked in a blockchain escrow contract when the shipment is booked. They release automatically to the carrier once the recipient confirms delivery, or are refunded if a dispute is resolved in the sender\'s favor.',
    },
    {
      id: 'can-i-change-plans',
      question: 'Can I change plans at any time?',
      answer:
        'Yes. You can upgrade or downgrade your plan at any time from your account settings. Upgrades take effect immediately; downgrades take effect at the start of your next billing cycle.',
    },
    {
      id: 'which-currencies-supported',
      question: 'Which currencies are supported for settlement?',
      answer:
        'Growth and Enterprise plans support multi-currency settlement, including major fiat currencies and stablecoins. The Starter plan settles in USD only.',
    },
    {
      id: 'what-happens-if-i-exceed-limit',
      question: 'What happens if I exceed my monthly delivery limit?',
      answer:
        'On the Starter and Growth plans, deliveries beyond your monthly limit are billed at the standard per-delivery overage rate rather than being blocked, so an unexpected spike in volume never stops a shipment.',
    },
    {
      id: 'is-there-a-free-trial',
      question: 'Is there a free trial for paid plans?',
      answer:
        'The Growth plan includes a 14-day free trial with full feature access. No credit card is required to start; you will be prompted to add billing details before the trial ends.',
    },
    {
      id: 'how-do-i-cancel',
      question: 'How do I cancel my subscription?',
      answer:
        'You can cancel at any time from your account billing settings. Your plan remains active until the end of the current billing period, and no further charges are made afterward.',
    },
  ],
};

export async function GET() {
  return NextResponse.json(fixture);
}
