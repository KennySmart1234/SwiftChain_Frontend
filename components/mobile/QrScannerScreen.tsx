'use client';

import { useEffect } from 'react';
import { Camera, CheckCircle2, Keyboard, RefreshCw } from 'lucide-react';
import { useMobileQrScanner } from '@/hooks/useMobileQrScanner';

export function QrScannerScreen() {
  const {
    canvasRef,
    error,
    isVerifying,
    manualCode,
    permission,
    result,
    scanAgain,
    setManualCode,
    startCamera,
    submitManualCode,
    videoRef,
  } = useMobileQrScanner();

  useEffect(() => {
    void startCamera();
  }, [startCamera]);

  return (
    <main className="min-h-[100dvh] bg-gray-950 text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
        <header className="px-4 pb-3 pt-5">
          <h1 className="text-lg font-semibold">Scan handoff QR</h1>
        </header>

        <div className="relative flex min-h-[52dvh] flex-1 items-center justify-center overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            data-testid="mobile-qr-video"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

          {permission === 'requesting' && (
            <div role="status" className="z-10 flex items-center gap-2 text-sm text-gray-200">
              <Camera className="h-5 w-5" /> Requesting camera access...
            </div>
          )}

          {permission === 'granted' && !result && (
            <div
              data-testid="scan-region"
              className="relative z-10 aspect-square w-[72%] max-w-72 border-2 border-white/90"
              aria-label="QR scan region"
            >
              <span className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-green-400" />
              <span className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-green-400" />
              <span className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-green-400" />
              <span className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-green-400" />
            </div>
          )}

          {result && (
            <section className="relative z-20 mx-5 w-full rounded-lg bg-white p-5 text-gray-900 shadow-xl" aria-label="Scan success">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
              <h2 className="mt-3 text-lg font-semibold">Handoff verified</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Delivery</dt><dd className="font-medium">{result.deliveryId}</dd></div>
                {result.status && <div className="flex justify-between gap-4"><dt className="text-gray-500">Status</dt><dd className="font-medium">{result.status}</dd></div>}
                {result.destination && <div className="flex justify-between gap-4"><dt className="text-gray-500">Destination</dt><dd className="text-right font-medium">{result.destination}</dd></div>}
              </dl>
              <button type="button" onClick={scanAgain} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white">
                <RefreshCw className="h-4 w-4" /> Scan another
              </button>
            </section>
          )}
        </div>

        <section className="space-y-4 bg-white px-4 py-5 text-gray-900">
          {error && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {permission !== 'granted' && permission !== 'requesting' && (
            <button type="button" onClick={() => void startCamera()} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold">
              <Camera className="h-4 w-4" /> Retry camera
            </button>
          )}

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitManualCode();
            }}
          >
            <label htmlFor="manual-qr-code" className="flex items-center gap-2 text-sm font-medium">
              <Keyboard className="h-4 w-4" /> Manual code
            </label>
            <div className="flex gap-2">
              <input
                id="manual-qr-code"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Enter handoff code"
                className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={!manualCode.trim() || isVerifying}
                className="rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-gray-300"
              >
                {isVerifying ? 'Checking...' : 'Verify'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default QrScannerScreen;
