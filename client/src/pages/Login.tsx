import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { ScanFace, CheckCircle2, XCircle, Loader2, ArrowRight, Bug, Camera } from "lucide-react";
import FaceScanner from "@/features/biometrics/FaceScanner";
import { useAuthStore } from "@/store/useAuthStore";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; name?: string; memberData?: any } | null>(null);
  
  // STATE BARU: Mengontrol kapan kamera menyala
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleDummyLogin = () => {
    const dummyMember = { id: crypto.randomUUID(), full_name: "John Doe Testing", identity_number: "3509123456789012" };
    login(dummyMember); navigate("/dashboard");
  };

  const handleFaceExtracted = async (descriptor: number[]) => {
    setIsVerifying(true); setResult(null);
    try {
      const response = await fetch("https://library-worker.librarysystem.workers.dev/api/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ face_descriptor: descriptor })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed");
      setResult({ success: true, message: "Identity Verified", name: data.member.full_name, memberData: data.member });
    } catch (error: any) { setResult({ success: false, message: error.message }); } 
    finally { setIsVerifying(false); }
  };

  const handleEnterDashboard = () => {
    if (result?.memberData) { login(result.memberData); navigate("/dashboard"); }
  };

  const pageTransition: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
  };

  return (
    <motion.div variants={pageTransition} initial="hidden" animate="show" exit="exit" className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[#FAF9F6]">
      <motion.div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 w-full max-w-[400px] relative overflow-hidden">
        <button type="button" onClick={handleDummyLogin} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors z-10" title="Bypass Login">
          <Bug className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2 mb-8 mt-2">
          <div className="mx-auto w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <ScanFace className="w-6 h-6 text-gray-900" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Member Access</h1>
          <p className="text-sm text-gray-500 font-medium">Scan your face to enter</p>
        </div>

        <AnimatePresence mode="wait">
          {!result && !isVerifying && (
            <motion.div key="scanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gray-50/30 p-2 rounded-2xl border border-gray-100">
              
              {/* LOGIKA ON-DEMAND CAMERA */}
              {!isCameraActive ? (
                <div className="w-full aspect-[4/3] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <Camera className="w-8 h-8 text-gray-300 mb-3" />
                  <p className="text-xs font-bold text-gray-500 mb-4">Camera is sleeping</p>
                  <button onClick={() => setIsCameraActive(true)} className="py-2.5 px-5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-gray-900/20 active:scale-95">
                    Activate Camera
                  </button>
                </div>
              ) : (
                <FaceScanner onFaceExtracted={handleFaceExtracted} />
              )}
              
            </motion.div>
          )}

          {isVerifying && (
            <motion.div key="verifying" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-gray-900 animate-spin" />
              <p className="text-sm font-bold text-gray-900">Analyzing Biometrics...</p>
            </motion.div>
          )}

          {result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
              {result.success ? (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1, transition: { type: "spring", bounce: 0.5 } }}><CheckCircle2 className="w-16 h-16 text-green-500" /></motion.div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-green-600 uppercase tracking-widest">{result.message}</p>
                    <p className="text-2xl font-bold text-gray-900">{result.name}</p>
                  </div>
                  <button onClick={handleEnterDashboard} className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors">
                    Enter Dashboard <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1, transition: { type: "spring", bounce: 0.5 } }}><XCircle className="w-16 h-16 text-red-500" /></motion.div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-gray-900">Access Denied</p>
                    <p className="text-sm font-medium text-gray-500">{result.message}</p>
                  </div>
                  <button onClick={() => { setResult(null); setIsCameraActive(false); }} className="mt-4 w-full py-3.5 px-4 bg-gray-100 text-gray-900 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                    Try Again
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}