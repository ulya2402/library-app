import { useEffect, useRef, useState } from "react";
import { useFaceBiometrics } from "./useFaceBiometrics";

interface FaceScannerProps {
  onFaceExtracted: (descriptor: number[]) => void;
}

export default function FaceScanner({ onFaceExtracted }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { loadModels, isModelLoaded, extractFaceDescriptor } = useFaceBiometrics();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [status, setStatus] = useState("Loading AI Models...");

  useEffect(() => {
    loadModels();
    return () => stopCamera();
  }, [loadModels]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsCameraActive(true);
      setStatus("Camera active. Please look at the camera.");
    } catch (error) {
      setStatus("Camera access denied or unavailable.");
      console.error("Camera Error:", error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureFace = async () => {
    if (!videoRef.current || !isModelLoaded) return;
    setStatus("Scanning face...");
    
    const descriptor = await extractFaceDescriptor(videoRef.current);
    
    if (descriptor) {
      setStatus("Face scan successful!");
      stopCamera();
      onFaceExtracted(descriptor);
    } else {
      setStatus("No face detected. Try moving closer or to a well-lit area.");
    }
  };

  return (
    <div className="flex flex-col items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center relative mb-4">
        {!isCameraActive && (
          <span className="text-gray-400 text-sm absolute z-10 font-medium">Camera Offline</span>
        )}
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          className={`w-full h-full object-cover ${isCameraActive ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      <p className={`text-xs font-semibold mb-4 text-center ${status.includes("successful") ? "text-green-600" : "text-gray-600"}`}>
        {status}
      </p>

      <div className="flex gap-2 w-full">
        {!isCameraActive ? (
          <button
            type="button"
            onClick={startCamera}
            disabled={!isModelLoaded}
            className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            Start Camera
          </button>
        ) : (
          <button
            type="button"
            onClick={captureFace}
            className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Scan Face
          </button>
        )}
      </div>
    </div>
  );
}