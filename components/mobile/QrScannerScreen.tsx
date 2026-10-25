'use client';

import { useEffect, useState } from 'react';
import { useMobileQrScanner } from '@/hooks/useMobileQrScanner';

export function QrScannerScreen() {
  const {
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
