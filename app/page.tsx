import { KineticExplorer } from '@/components/landing/KineticExplorer';
import { WorkflowCards } from '@/components/deliveries/WorkflowCards';
import { ValueProps } from '@/components/landing/ValueProps';
import { CallToAction } from '@/components/landing/CallToAction';
import { TrustBar } from '@/components/landing/TrustBar';

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      <section className="bg-white px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <WorkflowCards />
        </div>
      </section>
      <section className="relative bg-gradient-to-b from-black via-gray-900 to-black text-white py-32 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <p className="uppercase tracking-widest text-blue-400 text-sm">
            Logistics Reimagined
          </p>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
            Deliver Anything.
            <br />
            <span className="text-blue-500">Pay Only When It Arrives.</span>
          </h1>

          <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto">
            SwiftChain protects your deliveries using blockchain escrow. Funds
            stay locked until delivery is completed — eliminating fraud,
            disputes, and payment risks.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <button className="bg-blue-600 hover:bg-blue-700 hover:scale-[1.03] active:scale-95 transition px-8 py-4 rounded-lg font-semibold text-lg shadow-lg">
              Start Shipping Securely →
            </button>

            <button className="border border-gray-600 hover:border-white hover:bg-white/10 transition px-8 py-4 rounded-lg font-semibold">
              See How It Works
            </button>
          </div>

          <p className="text-sm opacity-60 pt-4">
            Secure escrow • Instant settlement • Transparent logistics
          </p>

          <div className="pt-8">
            <KineticExplorer />
          </div>
        </div>
      </section>

      <TrustBar />

      <section className="py-24 px-6 bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">
            Why Businesses Choose SwiftChain
          </h2>

          <p className="text-center text-gray-400 mb-14 max-w-2xl mx-auto">
            Traditional logistics relies on trust. SwiftChain replaces trust
            with automated blockchain guarantees.
          </p>

          <ValueProps />
        </div>
      </section>

      <section className="bg-gray-100 py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Powered by Secure Blockchain Infrastructure
          </h2>

          <p className="text-gray-600 max-w-2xl mx-auto mb-12">
            Built on proven blockchain technology delivering transparency,
            speed, and guaranteed payments for every shipment.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl transition hover:shadow-lg hover:-translate-y-1">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="font-semibold text-xl mb-2">
                Secure Smart Contracts
              </h3>
              <p className="text-gray-600">
                Automated escrow prevents payment manipulation.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl transition hover:shadow-lg hover:-translate-y-1">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="font-semibold text-xl mb-2">
                Stellar Network Speed
              </h3>
              <p className="text-gray-600">
                Near-instant confirmation across borders.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl transition hover:shadow-lg hover:-translate-y-1">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="font-semibold text-xl mb-2">
                Transparent Tracking
              </h3>
              <p className="text-gray-600">
                Every milestone verified permanently on-chain.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 text-white py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            How SwiftChain Works
          </h2>

          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-[2px]"></div>

            <div className="space-y-12">
              <div className="flex gap-6 items-start group">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 font-bold group-hover:scale-110 transition">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Create Delivery
                  </h3>
                  <p className="opacity-80">
                    Sender locks payment into secure blockchain escrow.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start group">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 font-bold group-hover:scale-110 transition">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Driver Completes Shipment
                  </h3>
                  <p className="opacity-80">
                    Delivery progresses with transparent verification.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start group">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 font-bold group-hover:scale-110 transition">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Automatic Payment Release
                  </h3>
                  <p className="opacity-80">
                    Smart contracts instantly release funds after confirmation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <CallToAction />
        </div>
      </section>

    </main>
  );
}
