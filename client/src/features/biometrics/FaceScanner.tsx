import { useRef, useState, useEffect } from "react";
import { Camera } from "lucide-react";

export default function FaceScanner({ onFaceCaptured }: { onFaceCaptured: (blob: Blob) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then(s => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(e => console.error("Kamera error:", e));
      
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    
    // Konversi hasil jepretan kamera ke format gambar JPG
    canvas.toBlob(blob => {
      if (blob) onFaceCaptured(blob);
    }, "image/jpeg", 0.95);
  };

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-900 shadow-inner">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
      <button 
        type="button" onClick={capturePhoto} 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 py-3 px-6 bg-white text-gray-900 text-sm font-black rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
      >
        <Camera className="w-4 h-4" /> Snap Photo
      </button>
    </div>
  );
}