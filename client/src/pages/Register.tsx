import { useState, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { UploadCloud, User, CreditCard, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Bug, Camera, Loader2, Image as ImageIcon } from "lucide-react";
import { useScanner } from "@/features/scanner/useScanner";
import FaceScanner from "@/features/biometrics/FaceScanner";

export default function Register() {
  const { scanDocument, isScanning, scanError } = useScanner();
  const [step, setStep] = useState<1 | 2>(1);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // STATE BARU UNTUK MENYIMPAN FOTO WAJAH SEMENTARA
  const [faceBlob, setFaceBlob] = useState<Blob | null>(null);
  
  const [formData, setFormData] = useState({ full_name: "", identity_number: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setImagePreview(URL.createObjectURL(file));
    
    const data = await scanDocument(file);
    if (data) setFormData(prev => ({ ...prev, identity_number: data.identityNumber || prev.identity_number, full_name: data.fullName || prev.full_name }));
  };

  const injectDummyData = () => { setFormData({ full_name: "John Doe Testing", identity_number: "3509123456789012" }); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!faceBlob) { setMessage("Silakan ambil foto wajah terlebih dahulu."); return; }
    setIsSubmitting(true); setMessage("");

    try {
      const form = new FormData();
      form.append("full_name", formData.full_name);
      form.append("identity_number", formData.identity_number);
      form.append("photo", faceBlob, "face.jpg");

      const response = await fetch("https://library-worker.librarysystem.workers.dev/api/members", {
        method: "POST", body: form
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pendaftaran gagal");

      setMessage("Registration successful");
      setStep(1); setIsCameraActive(false); setImagePreview(null); setFaceBlob(null);
      setFormData({ full_name: "", identity_number: "" });
    } catch (error: any) { setMessage(error.message); } 
    finally { setIsSubmitting(false); }
  };

  const pageTransition: Variants = { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0, transition: { duration: 0.3 } }, exit: { opacity: 0, x: -20, transition: { duration: 0.2 } } };
  const stepVariants: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }, exit: { opacity: 0, y: -10, transition: { duration: 0.2 } } };

  return (
    <motion.div variants={pageTransition} initial="hidden" animate="show" exit="exit" className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[#FAF9F6]">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 w-full max-w-[420px] relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1"><h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">New Member</h1><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Step {step} of 2</p></div>
          <button type="button" onClick={injectDummyData} className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-full transition-colors"><Bug className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" variants={stepVariants} initial="hidden" animate="show" exit="exit" className="space-y-5">
                <label className="cursor-pointer group block relative h-40 w-full rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <AnimatePresence>{imagePreview && (<motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={imagePreview} className="absolute inset-0 w-full h-full object-cover z-0" />)}</AnimatePresence>
                  <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-all ${imagePreview ? 'bg-gray-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100' : ''} ${isScanning ? 'bg-gray-900/60 backdrop-blur-sm opacity-100' : ''}`}>
                    {isScanning ? (<><Loader2 className="w-8 h-8 text-white mb-2 animate-spin" /><span className="text-sm font-bold text-white drop-shadow-md">Membaca KTP...</span></>) : imagePreview ? (<><ImageIcon className="w-8 h-8 text-white mb-2" /><span className="text-sm font-bold text-white drop-shadow-md">Ganti Foto</span></>) : (<><UploadCloud className="w-8 h-8 text-gray-400 mb-2 group-hover:text-gray-600 transition-colors" /><span className="text-sm font-bold text-gray-600">Upload ID Card</span></>)}
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isScanning} />
                </label>
                {scanError && <p className="text-red-500 text-xs font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {scanError}</p>}

                <div className="space-y-4">
                  <div className="relative"><User className="absolute top-3.5 left-4 h-5 w-5 text-gray-400" /><input type="text" required value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none" placeholder="Full Name" /></div>
                  <div className="relative"><CreditCard className="absolute top-3.5 left-4 h-5 w-5 text-gray-400" /><input type="text" required value={formData.identity_number} onChange={(e) => setFormData({...formData, identity_number: e.target.value})} className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none" placeholder="Identity Number" /></div>
                </div>
                <button type="button" onClick={() => setStep(2)} disabled={!formData.full_name || !formData.identity_number || isScanning} className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 transition-colors">Next: Biometrics <ArrowRight className="w-4 h-4" /></button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={stepVariants} initial="hidden" animate="show" exit="exit" className="space-y-5">
                <div className="bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                  
                  {/* PREVIEW HASIL JEPRETAN WAJAH */}
                  {faceBlob ? (
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-900 border-2 border-green-400">
                      <img src={URL.createObjectURL(faceBlob)} className="w-full h-full object-cover transform -scale-x-100" alt="Face Snippet" />
                      <button type="button" onClick={() => setFaceBlob(null)} className="absolute bottom-4 left-1/2 -translate-x-1/2 py-2 px-5 bg-white text-gray-900 text-xs font-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform">
                        Retake Photo
                      </button>
                    </div>
                  ) : !isCameraActive ? (
                    <div className="w-full aspect-[4/3] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <Camera className="w-8 h-8 text-gray-300 mb-3" />
                      <p className="text-xs font-bold text-gray-500 mb-4">Ready to capture</p>
                      <button type="button" onClick={() => setIsCameraActive(true)} className="py-2.5 px-5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg active:scale-95">Start Camera</button>
                    </div>
                  ) : (
                    <FaceScanner onFaceCaptured={(blob) => { setFaceBlob(blob); setIsCameraActive(false); }} />
                  )}

                </div>
                
                {faceBlob && (<p className="flex items-center justify-center gap-1 text-xs font-bold text-green-600 bg-green-50 py-2 rounded-lg"><CheckCircle2 className="w-4 h-4" /> Photo Captured!</p>)}

                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setStep(1)} className="flex-shrink-0 p-3.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                  <button type="submit" disabled={isSubmitting || !faceBlob} className="flex-1 flex items-center justify-center py-3.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 transition-colors">{isSubmitting ? "Processing in Cloud..." : "Complete Setup"}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {message && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={`mt-4 flex items-center justify-center gap-2 text-sm font-bold p-3 rounded-lg ${message.includes("successful") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message.includes("successful") ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{message}</motion.div>)}
          </AnimatePresence>
        </form>
      </div>
    </motion.div>
  );
}