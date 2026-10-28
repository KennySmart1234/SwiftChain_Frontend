'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { qrDecoderService } from '@/services/qrDecoderService';
import {
  qrScannerService,
  type VerifiedQrDelivery,
} from '@/services/qrScannerService';

export type CameraPermissionState =
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'error';

const SCAN_INTERVAL_MS = 250;

export function useMobileQrScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanningRef = useRef(false);
  const scanFrameRef = useRef<() => Promise<void>>(async () => undefined);
  const [permission, setPermission] =
    useState<CameraPermissionState>('requesting');
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<VerifiedQrDelivery | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const clearScanTimer = useCallback(() => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
  }, []);

  const stopCamera = useCallback(() => {
    clearScanTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [clearScanTimer]);

  const verifyCode = useCallback(
    async (code: string) => {
      const normalized = code.trim();
      if (!normalized || scanningRef.current) return false;
      scanningRef.current = true;
      setIsVerifying(true);
      setError(null);
      try {
        const delivery = await qrScannerService.verifyQrCode(normalized);
        setResult(delivery);
        clearScanTimer();
        return true;
      } catch (verificationError) {
        setError(
          verificationError instanceof Error
            ? verificationError.message
            : 'Unable to verify this handoff code.',
        );
        return false;
      } finally {
        scanningRef.current = false;
        setIsVerifying(false);
      }
    },
    [clearScanTimer],
  );

  const scanFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (
      !video ||
      !canvas ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      scanningRef.current
    ) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);
    const code = qrDecoderService.decode(context, width, height);
    if (code) await verifyCode(code);
  }, [verifyCode]);

  useEffect(() => {
    scanFrameRef.current = scanFrame;
  }, [scanFrame]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setPermission('requesting');
    setError(null);
    setResult(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermission('unavailable');
        setError('Camera access is not available on this device.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setPermission('granted');
      scanTimerRef.current = setInterval(
        () => void scanFrameRef.current(),
        SCAN_INTERVAL_MS,
      );
    } catch (cameraError) {
      const name = cameraError instanceof DOMException ? cameraError.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermission('denied');
        setError('Camera permission was denied.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setPermission('unavailable');
        setError('No camera was found on this device.');
      } else {
        setPermission('error');
        setError('The camera could not be started.');
      }
    }
  }, [stopCamera]);

  const submitManualCode = useCallback(
    () => verifyCode(manualCode),
    [manualCode, verifyCode],
  );

  const scanAgain = useCallback(() => {
    setManualCode('');
    setResult(null);
    setError(null);
    void startCamera();
  }, [startCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    canvasRef,
    error,
    isVerifying,
    manualCode,
    permission,
    result,
    scanAgain,
    setManualCode,
    startCamera,
    stopCamera,
    submitManualCode,
    videoRef,
  };
}
