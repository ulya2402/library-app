import { Context } from "hono";
import { Env } from "../types/env";

export const processOCR = async (c: Context<{ Bindings: Env }>) => {
  try {
    // 1. Terima data gambar (Form Data) dari Frontend HP
    const formData = await c.req.formData();
    
    // 2. SISIHKAN KUNCI RAHASIA DARI BRANKAS CLOUDFLARE (Tidak terlihat di kode!)
    formData.append("apikey", c.env.OCR_API_KEY);

    // 3. Teruskan ke Server OCR.space
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    
    // 4. Kembalikan hasilnya ke Frontend
    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: "Gagal memproses gambar OCR", details: error.message }, 500);
  }
};