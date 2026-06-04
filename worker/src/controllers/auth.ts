import { Context } from "hono";
import { Env } from "../types/env";

export const loginBiometric = async (c: Context<{ Bindings: Env }>) => {
  try {
    const formData = await c.req.formData();
    const photo = formData.get("photo") as File;

    if (!photo) return c.json({ error: "Foto wajib disertakan" }, 400);

    // 1. MINTA LUXAND MENCARI WAJAH TERSEBUT
    const luxForm = new FormData();
    luxForm.append("photo", photo);

    const luxRes = await fetch("https://api.luxand.cloud/photo/search/v2", {
      method: "POST",
      headers: { "token": c.env.LUXAND_TOKEN },
      body: luxForm
    });

    // PERBAIKAN TS: Tambahkan tipe ": any" di sini
    const data: any = await luxRes.json();
    
    if (data.status === "failure") return c.json({ error: data.message || "Akses Ditolak: Wajah tidak dikenali" }, 401);

    // 2. AMBIL HASIL KEMIRIPAN TERTINGGI
    const bestMatch = Array.isArray(data) ? data[0] : (data.recognized_people?.[0]);
    if (!bestMatch || !bestMatch.name) {
      return c.json({ error: "Akses Ditolak: Anda belum terdaftar di sistem" }, 401);
    }

    // 3. CARI NAMA (MEMBER ID) DI DATABASE KITA
    const memberId = bestMatch.name;
    const member = await c.env.DB.prepare("SELECT * FROM members WHERE id = ?").bind(memberId).first();
    
    if (!member) return c.json({ error: "Wajah dikenali, tapi data anggota hilang dari database D1." }, 404);

    return c.json({ success: true, member }, 200);
  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};