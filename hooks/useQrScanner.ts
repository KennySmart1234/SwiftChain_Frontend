import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { qrScannerService } from '@/services/qrScannerService';

interface QrScannerHookResult {
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCameraActive: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verifyMutation: ReturnType<typeof useMutation<any, Error, string>>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  
}

export function useQrScanner(): QrScannerHookResult {
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Need to add this for Safari iOS compatibility
        videoRef.current.setAttribute('playsinline', 'true'); 
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      setIsCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera Permission Denied: Please enable camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device found.');
      } else {
        setError('Failed to access camera.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const verifyMutation = useMutation({
    mutationFn: (qrData: string) => qrScannerService.verifyQrCode(qrData),
  });

  return {
    error,
    videoRef,
    isCameraActive,
    verifyMutation,
    startCamera,
    stopCamera,
  };
}
