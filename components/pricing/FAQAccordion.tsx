'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePricingFAQ } from '@/hooks/usePricingFAQ';
import type { PricingFAQItem } from '@/types/pricing';

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading pricing FAQ" className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
        />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-12 text-center"
    >
      <p className="text-sm text-red-600">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * A single accordion row.
 *
 * Deliberately a plain button/panel pair rather than Headless UI's
 * <Disclosure>: Disclosure tracks its own open state internally and reserves
 * `aria-expanded` on <DisclosureButton> (it overwrites any value passed in),
 * so two independent <Disclosure> instances cannot be coordinated into
 * exclusive (accordion) expansion from outside. Panel open/closed state is
 * owned by the parent (openId) and passed down instead.
 */
function FAQRow({
  item,
  isOpen,
  onToggle,
}: {
  item: PricingFAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
      >
        <span>{item.question}</span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        id={panelId}
        role="region"
        className={`grid transition-all duration-200 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-4 text-sm leading-relaxed text-gray-500">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * FAQAccordion
 *
 * Renders the pricing FAQ list as an exclusive-expansion accordion: opening
 * one question closes any other that was open, and each panel animates its
 * height smoothly on expand/collapse.
 *
 * Architecture: Component → Hook (usePricingFAQ) → Service (pricingService)
 * Data source: backend API via pricingService.getFAQ()
 */
export function FAQAccordion() {
  const { faq, isLoading, error, refetch } = usePricingFAQ();
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <section aria-label="Pricing frequently asked questions" className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Everything you need to know about SwiftChain pricing.
          </p>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : faq ? (
          <div className="space-y-3">
            {faq.items.map((item) => (
              <FAQRow
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default FAQAccordion;
