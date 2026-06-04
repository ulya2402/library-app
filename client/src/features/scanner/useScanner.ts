import { useState, useCallback } from "react";
import Tesseract from "tesseract.js";

export const useScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const scanDocument = useCallback(async (imageFile: File): Promise<Record<string, string> | null> => {
    setIsScanning(true);
    setScanError(null);
    try {
      const result = await Tesseract.recognize(imageFile, "ind");
      const text = result.data.text;
      
      const nikMatch = text.match(/\b\d{16}\b/);
      const identityNumber = nikMatch ? nikMatch[0] : "";
      
      const nameMatch = text.match(/Nama\s*[:|;]?\s*([^\n]+)/i);
      let fullName = nameMatch ? nameMatch[1].trim() : "";
      
      fullName = fullName.replace(/(TEMPAT|TGL|LAHIR|GOL|DARAH|ALAMAT|RT|RW).*$/i, "").trim();
      fullName = fullName.replace(/[^a-zA-Z\s\.,]/g, "").trim();
      
      setIsScanning(false);
      return {
        rawText: text,
        identityNumber,
        fullName
      };
    } catch (error: any) {
      setIsScanning(false);
      setScanError("OCR Processing Failed");
      return null;
    }
  }, []);

  return { scanDocument, isScanning, scanError };
};