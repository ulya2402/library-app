import { useState } from "react";

export function useScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const scanDocument = async (file: File) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", "eng");
      formData.append("isOverlayRequired", "false");
      formData.append("scale", "true");
      formData.append("detectOrientation", "true");

      const response = await fetch("https://library-worker.librarysystem.workers.dev/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.IsErroredOnProcessing || data.error) {
        throw new Error(data.ErrorMessage?.[0] || data.error || "Gagal memproses gambar di server");
      }

      const parsedText = data.ParsedResults?.[0]?.ParsedText || "";
      
      // 1. Ambil NIK
      const nikMatch = parsedText.match(/\b\d{16}\b/);
      const identityNumber = nikMatch ? nikMatch[0] : "";
      
      // 2. Ambil Nama (Logika Baru yang Lebih Cerdas)
      // Ambil semua teks setelah kata NAMA hingga ganti baris
      const nameMatch = parsedText.match(/NAMA\s*[:;]?\s*([^\n]+)/i);
      let fullName = nameMatch ? nameMatch[1].trim() : "";
      
      // Jika kata "TEMPAT" tidak sengaja terbaca sederet dengan nama, potong di situ!
      if (fullName.toUpperCase().includes("TEMPAT")) {
        fullName = fullName.toUpperCase().split("TEMPAT")[0].trim();
      }
      
      // Bersihkan dari simbol aneh
      fullName = fullName.replace(/[^a-zA-Z\s.,]/g, "").trim();

      if (!identityNumber) setScanError("NIK tidak terdeteksi jelas. Silakan ketik manual.");

      return { identityNumber, fullName };
    } catch (error: any) {
      setScanError(error.message || "Koneksi ke server pembaca gagal.");
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  return { scanDocument, isScanning, scanError };
}