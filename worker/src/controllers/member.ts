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

// --- AWAL PERUBAHAN: Tambahan Controller Member ---
export const getMembers = async (c: Context<{ Bindings: Env }>) => {
  try {
    const members = await c.env.DB.prepare(
      "SELECT id, full_name, identity_number, join_date, is_active, role FROM members ORDER BY join_date DESC"
    ).all();
    return c.json({ success: true, members: members.results }, 200);
  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};

export const updateMemberRole = async (c: Context<{ Bindings: Env }>) => {
  try {
    const targetMemberId = c.req.param("id");
    const body = await c.req.json();
    const { role, admin_id } = body;

    if (!admin_id) return c.json({ error: "Unauthorized access" }, 401);

    // Keamanan API: Cek apakah yang melakukan request benar-benar admin dari database
    const adminCheck = await c.env.DB.prepare("SELECT role FROM members WHERE id = ?").bind(admin_id).first();
    if (!adminCheck || (adminCheck as any).role !== "admin") {
      return c.json({ error: "Forbidden: Hanya Admin yang berhak mengubah Role" }, 403);
    }

    if (role !== "admin" && role !== "member") {
      return c.json({ error: "Role type not valid" }, 400);
    }

    await c.env.DB.prepare("UPDATE members SET role = ? WHERE id = ?").bind(role, targetMemberId).run();
    return c.json({ success: true, message: "Role updated successfully" }, 200);
  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};
// --- BATAS PERUBAHAN ---