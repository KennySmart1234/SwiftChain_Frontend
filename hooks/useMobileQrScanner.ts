import { useCallback, useEffect, useRef, useState } from 'react';
import type { MobileQrScanResult } from '@/types/mobileQrScanner';
import { mobileQrScannerService } from '@/services/mobileQrScannerService';

interface UseMobileQrScannerResult {
  error: string | null;
  isCameraActive: boolean;
  isLoadingPermission: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  scanResult: MobileQrScanResult | null;
  manualCode: string;
  setManualCode: (value: string) => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  handleScan: (qrCode: string) => Promise<MobileQrScanResult | null>;
}

export function useMobileQrScanner(): UseMobileQrScannerResult {
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoadingPermission, setIsLoadingPermission] = useState(false);
  const [scanResult, setScanResult] = useState<MobileQrScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setIsLoadingPermission(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not available on this device.');
      setIsCameraActive(false);
      return;
    }

    setError(null);
    setIsLoadingPermission(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsCameraActive(true);
    } catch (err: unknown) {
      setIsCameraActive(false);

      if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError('Camera permission denied. Please enable camera access to scan delivery QR codes.');
      } else if (err instanceof Error && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')) {
        setError('No camera device found.');
      } else {
        setError('Failed to access camera.');
      }
    } finally {
      setIsLoadingPermission(false);
    }
  }, []);

  const handleScan = useCallback(async (qrCode: string): Promise<MobileQrScanResult | null> => {
    const normalizedQrCode = qrCode.trim();

    if (!normalizedQrCode) {
      setError('Please enter a valid delivery code.');
      return null;
    }

    setError(null);
    setIsLoadingPermission(true);

    try {
      const result = await mobileQrScannerService.verifyQrCode(normalizedQrCode);
      setScanResult(result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to verify QR code.';
      setError(message);
      return null;
    } finally {
      setIsLoadingPermission(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
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
  };
}
