'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useProofUpload } from '@/hooks/useProofUpload';
import { Camera, Upload, CheckCircle, AlertCircle, Loader, PenLine } from 'lucide-react';
import { SignatureCanvas } from '@/components/deliveries/SignatureCanvas';
import clsx from 'clsx';

interface ProofUploadProps {
  deliveryId: string;
  maxSizeMB?: number;
}

/**
 * ProofUpload — Component for capturing and uploading proof of delivery photos.
 * Supports both camera capture and file upload with automatic image compression.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export function ProofUpload({ deliveryId, maxSizeMB = 5 }: ProofUploadProps) {
  const {
    uploadProgress,
    compressionProgress,
    isUploading,
    isCompressing,
    uploadedProofs,
    errors,
    clearUploadedProofs,
    removeProof,
    stagedPhoto,
    photoPreviewUrl,
    signatureDataUrl,
    canSubmitBundle,
    stagePhoto,
    stageCameraCapture,
    setSignature,
    submitProofBundle,
    resetBundle,
  } = useProofUpload({ deliveryId, maxSizeMB });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'photo' | 'signature'>('photo');

  // Initialize camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error: any) {
      const message =
        error?.name === 'NotAllowedError'
          ? 'Camera permission denied'
          : error?.name === 'NotFoundError'
            ? 'No camera found'
            : 'Failed to start camera';
      setCameraError(message);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  // Capture photo from camera
  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        await stageCameraCapture(canvasRef.current);
      }
    }
  };

  // Handle file input change
  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      stagePhoto(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      stagePhoto(file);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 border-b border-gray-200" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'photo'}
          onClick={() => setActiveTab('photo')}
          className={clsx('flex items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium', {
            'border-blue-600 text-blue-700': activeTab === 'photo',
            'border-transparent text-gray-500': activeTab !== 'photo',
          })}
        >
          <Camera className="h-4 w-4" /> Photo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'signature'}
          onClick={() => setActiveTab('signature')}
          className={clsx('flex items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium', {
            'border-blue-600 text-blue-700': activeTab === 'signature',
            'border-transparent text-gray-500': activeTab !== 'signature',
          })}
        >
          <PenLine className="h-4 w-4" /> Signature
        </button>
      </div>

      <div hidden={activeTab !== 'photo'} className="space-y-6">
      {/* Camera Section */}
      <div className="border rounded-lg overflow-hidden bg-slate-50">
        {isCameraActive ? (
          <div className="space-y-4 p-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
            />
            <div className="flex gap-2">
              <button
                onClick={capturePhoto}
                disabled={isUploading || isCompressing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                {isCompressing ? 'Compressing...' : 'Take Photo'}
              </button>
              <button
                onClick={stopCamera}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                Close Camera
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={startCamera}
            disabled={isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-4 px-4 transition flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Start Camera
          </button>
        )}
        {cameraError && (
          <div className="bg-red-50 p-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {cameraError}
          </div>
        )}
      </div>

      {/* File Upload Section */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50 hover:bg-blue-100 transition"
      >
        <input
          ref={fileInputRef}
          aria-label="Delivery photo file"
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />
        <div className="space-y-3">
          <Upload className="w-8 h-8 text-blue-600 mx-auto" />
          <div>
            <p className="font-medium text-slate-900">
              Drag and drop an image or click to select
            </p>
            <p className="text-sm text-slate-600">
              Images larger than {maxSizeMB}MB will be automatically compressed
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition inline-block"
          >
            Select File
          </button>
        </div>
      </div>

      {/* Progress Indicators */}
      {(isCompressing || isUploading) && (
        <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
          {isCompressing && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Compressing image
                </span>
                <span className="text-sm text-slate-600">
                  {compressionProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${compressionProgress}%` }}
                />
              </div>
            </div>
          )}

          {isUploading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Uploading
                </span>
                <span className="text-sm text-slate-600">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      <div hidden={activeTab !== 'signature'}>
        <SignatureCanvas
          onSave={(dataUrl) => setSignature(dataUrl)}
          disabled={isUploading}
        />
      </div>

      {(photoPreviewUrl || signatureDataUrl) && (
        <div className="grid gap-4 sm:grid-cols-2" aria-label="Delivery proof preview">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="mb-2 text-sm font-medium text-gray-800">Delivery photo</p>
            {photoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreviewUrl} alt="Delivery proof preview" className="h-36 w-full rounded object-cover" />
            ) : (
              <p className="text-sm text-amber-700">Add a photo before submitting.</p>
            )}
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="mb-2 text-sm font-medium text-gray-800">Recipient signature</p>
            {signatureDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureDataUrl} alt="Recipient signature preview" className="h-36 w-full rounded object-contain" />
            ) : (
              <p className="text-sm text-gray-500">Signature not captured.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void submitProofBundle()}
          disabled={!canSubmitBundle}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isUploading ? 'Submitting proof...' : 'Submit delivery proof'}
        </button>
        <button
          type="button"
          onClick={resetBundle}
          disabled={!stagedPhoto && !signatureDataUrl}
          className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300"
        >
          Reset
        </button>
      </div>

      {/* Uploaded Proofs */}
      {uploadedProofs.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900">
            Uploaded Proofs ({uploadedProofs.length})
          </h3>
          <div className="space-y-2">
            {uploadedProofs.map((proof) => (
              <div
                key={proof.filename}
                className={clsx(
                  'p-3 rounded-lg border flex items-center justify-between',
                  {
                    'bg-green-50 border-green-300':
                      proof.status === 'completed',
                    'bg-red-50 border-red-300': proof.status === 'failed',
                    'bg-blue-50 border-blue-300': proof.status === 'uploading',
                  }
                )}
              >
                <div className="flex items-center gap-2 flex-1">
                  {proof.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  {proof.status === 'failed' && (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  {proof.status === 'uploading' && (
                    <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {proof.filename}
                    </p>
                    <p className="text-xs text-slate-600">
                      {proof.isCompressed
                        ? `${(proof.originalSize / (1024 * 1024)).toFixed(2)}MB → ${(proof.fileSize / (1024 * 1024)).toFixed(2)}MB`
                        : `${(proof.fileSize / (1024 * 1024)).toFixed(2)}MB`}
                    </p>
                  </div>
                </div>
                {proof.status === 'completed' && (
                  <button
                    onClick={() => removeProof(proof.filename)}
                    className="text-xs text-gray-600 hover:text-gray-900 ml-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="bg-red-50 p-3 rounded-lg border border-red-300 text-red-700 text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Clear Button */}
      {uploadedProofs.length > 0 && (
        <button
          onClick={clearUploadedProofs}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition"
        >
          Clear All
        </button>
      )}

      {/* Hidden Canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
