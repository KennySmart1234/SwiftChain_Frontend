'use client';

import { useEffect, useState } from 'react';
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
    error,
    isCameraActive,
    isLoadingPermission,
    videoRef,
    scanResult,
    manualCode,
    setManualCode,
    startCamera,
    stopCamera,
    handleScan,
  } = useMobileQrScanner();

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    startCamera();

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const submitManualCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await handleScan(manualCode);
    if (result) {
      setShowManualEntry(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {isOffline && (
        <div
          data-testid="offline-watermark"
          className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700"
        >
          Offline mode
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Scan delivery QR</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {isCameraActive ? 'Live' : 'Ready'}
        </span>
      </div>

      {isLoadingPermission && (
        <div className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Requesting camera permission...
        </div>
      )}

      {error && (
        <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">Camera permission denied</p>
          <p>{error}</p>
          <button
            type="button"
            onClick={startCamera}
            className="mt-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
        <video
          ref={videoRef}
          data-testid="qr-camera-feed"
          className={`aspect-square w-full object-cover ${isCameraActive ? 'opacity-100' : 'opacity-50'}`}
        />

        {!isCameraActive && !error && !isLoadingPermission && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-sm text-slate-200">
            Camera is warming up...
          </div>
        )}

        {isCameraActive && (
          <div className="pointer-events-none absolute inset-4 rounded-2xl border-2 border-emerald-400/80" />
        )}
      </div>

      {scanResult && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="mb-2 text-base font-semibold">Delivery details</p>
          <ul className="space-y-1">
            <li>Delivery ID: {scanResult.deliveryId}</li>
            <li>Recipient: {scanResult.recipient}</li>
            <li>Destination: {scanResult.destination}</li>
            <li>Amount: {scanResult.amount}</li>
            <li>Status: {scanResult.status}</li>
            <li>ETA: {scanResult.eta}</li>
          </ul>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => handleScan('DEL-99234')}
          className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
        >
          Scan QR code
        </button>

        <button
          type="button"
          onClick={() => setShowManualEntry((value) => !value)}
          className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700"
        >
          Enter tracking code manually
        </button>
      </div>

      {showManualEntry && (
        <form onSubmit={submitManualCode} className="mt-4 space-y-3">
          <label htmlFor="delivery-code" className="block text-sm font-medium text-slate-700">
            Delivery code
          </label>
          <input
            id="delivery-code"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="DEL-99234"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-0"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            Verify code
          </button>
        </form>
      )}
    </div>
  );
}

export default QrScannerScreen;
