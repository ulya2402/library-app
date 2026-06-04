import { Context } from "hono";
import { Env } from "../types/env";

export const createMember = async (c: Context<{ Bindings: Env }>) => {
  try {
    const formData = await c.req.formData();
    const full_name = formData.get("full_name") as string;
    const identity_number = formData.get("identity_number") as string;
    const photo = formData.get("photo") as File;

    if (!full_name || !identity_number || !photo) {
      return c.json({ error: "Semua data wajib diisi, termasuk foto" }, 400);
    }

    const existing = await c.env.DB.prepare("SELECT id FROM members WHERE identity_number = ?").bind(identity_number).first();
    if (existing) return c.json({ error: "NIK sudah terdaftar" }, 409);

    const memberId = crypto.randomUUID();
    const joinDate = Math.floor(Date.now() / 1000);

    // 1. DAFTARKAN WAJAH KE LUXAND.CLOUD
    const luxForm = new FormData();
    luxForm.append("name", memberId); 
    luxForm.append("photo", photo);

    const luxRes = await fetch("https://api.luxand.cloud/subject/v2", {
      method: "POST",
      headers: { "token": c.env.LUXAND_TOKEN },
      body: luxForm
    });
    
    // PERBAIKAN TS: Tambahkan tipe ": any" di sini
    const luxData: any = await luxRes.json();
    
    if (luxData.status === "failure") {
       throw new Error(luxData.message || "Gagal mendaftarkan wajah ke Cloud Server");
    }

    // 2. SIMPAN PROFIL KE DATABASE D1
    await c.env.DB.prepare(
      "INSERT INTO members (id, full_name, identity_number, join_date) VALUES (?, ?, ?, ?)"
    ).bind(memberId, full_name, identity_number, joinDate).run();

    return c.json({ success: true, message: "Member created successfully" }, 201);
  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};