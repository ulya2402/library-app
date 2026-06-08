import { Context } from "hono";
import { Env } from "../types/env";

export const loginBiometric = async (c: Context<{ Bindings: Env }>) => {
  try {
    const formData = await c.req.formData();
    const photo = formData.get("photo") as File;

    if (!photo) return c.json({ error: "Foto wajib disertakan" }, 400);

    const tokensString = c.env.LUXAND_TOKENS || c.env.LUXAND_TOKEN || "";
    const tokens = tokensString.split(",").map(t => t.trim()).filter(Boolean);

    if (tokens.length === 0) {
      return c.json({ error: "Konfigurasi Sistem Gagal: Token Luxand belum diatur di .dev.vars" }, 500);
    }

    let data: any = null;
    let apiSuccess = false;
    let lastErrorMsg = "Akses Ditolak: Wajah tidak dikenali";

    for (const token of tokens) {
      try {
        const luxForm = new FormData();
        luxForm.append("photo", photo);

        const luxRes = await fetch("https://api.luxand.cloud/photo/search/v2", {
          method: "POST",
          headers: { "token": token },
          body: luxForm
        });

        data = await luxRes.json();
        const statusMessage = (data.message || "").toLowerCase();
        
        const isQuotaError = 
          luxRes.status === 402 || 
          luxRes.status === 429 || 
          luxRes.status === 403 || 
          statusMessage.includes("quota") || 
          statusMessage.includes("limit") || 
          statusMessage.includes("exceed");

        if (luxRes.ok) {
          const isEmpty = Array.isArray(data) ? data.length === 0 : (!data.recognized_people || data.recognized_people.length === 0);
          
          if (isEmpty) {
            lastErrorMsg = "Wajah tidak ditemukan di partisi ini, mencari di partisi lain...";
            continue;
          }

          apiSuccess = true;
          break;
        }

        if (data.status === "failure" && !isQuotaError) {
          apiSuccess = true;
          break;
        }

        lastErrorMsg = data.message || `API Token exhausted or failed with status ${luxRes.status}`;
        console.warn(`[Luxand API] Token rotation triggered. Reason: ${lastErrorMsg}`);
      } catch (err: any) {
        lastErrorMsg = err.message;
        console.warn(`[Luxand API] Fetch error: ${err.message}, trying next token...`);
      }
    }

    if (!apiSuccess) {
      return c.json({ error: "Sistem Sedang Sibuk: Semua kuota API habis atau wajah tidak ditemukan", details: lastErrorMsg }, 503);
    }

    if (data && data.status === "failure") {
      let finalErrorMsg = data.message || "Akses Ditolak: Wajah tidak dikenali";
      if (finalErrorMsg.toLowerCase().includes("access denied")) {
        finalErrorMsg = "Koneksi API Ditolak: Token Luxand tidak valid atau belum terbaca. Cek .dev.vars dan restart server backend!";
      }
      return c.json({ error: finalErrorMsg }, 401);
    }

    const bestMatch = Array.isArray(data) ? data[0] : (data?.recognized_people?.[0]);
    
    if (!bestMatch || !bestMatch.name) {
      return c.json({ error: "Akses Ditolak: Anda belum terdaftar di sistem" }, 401);
    }

    const memberId = bestMatch.name;
    const member = await c.env.DB.prepare("SELECT * FROM members WHERE id = ?").bind(memberId).first();
    
    if (!member) {
      return c.json({ error: "Wajah dikenali, tapi data anggota hilang dari database lokal." }, 404);
    }

    return c.json({ success: true, member }, 200);
  } catch (error: any) {
    console.error(`[Auth API] Internal server error: ${error.message}`);
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};