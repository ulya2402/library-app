import { Context } from "hono";
import { Env } from "../types/env";

export const getBooks = async (c: Context<{ Bindings: Env }>) => {
  try {
    const { results } = await c.env.DB.prepare("SELECT * FROM books ORDER BY created_at DESC").all();
    return c.json({ success: true, books: results }, 200);
  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};

// AWAL PERUBAHAN: Fungsi createBook
export const createBook = async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json();
    const { title, author, isbn, stock, cover_url, description } = body;

    if (!title || !author || !isbn || stock === undefined) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const bookId = crypto.randomUUID();
    const createdAt = Math.floor(Date.now() / 1000);

    await c.env.DB.prepare(
      "INSERT INTO books (id, title, author, isbn, stock, cover_url, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(bookId, title, author, isbn, parseInt(stock), cover_url || null, description || null, createdAt).run();

    return c.json({ success: true, message: "Book added to catalog" }, 201);
  } catch (error: any) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return c.json({ error: "Book with this ISBN already exists" }, 409);
    }
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};
// BATAS PERUBAHAN

// FITUR BARU: HAPUS BUKU
export const deleteBook = async (c: Context<{ Bindings: Env }>) => {
  try {
    const bookId = c.req.param("id");
    await c.env.DB.prepare("DELETE FROM books WHERE id = ?").bind(bookId).run();
    return c.json({ success: true, message: "Book deleted successfully" }, 200);
  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};

// AWAL PERUBAHAN: Tambahkan fungsi ini di bagian paling bawah worker/src/controllers/book.ts

export const uploadCover = async (c: Context<{ Bindings: Env }>) => {
  try {
    // 1. Tangkap gambar dari Frontend
    const body = await c.req.parseBody();
    const image = body['image'];

    if (!image) {
      return c.json({ error: "No image file provided" }, 400);
    }

    // 2. Siapkan data untuk dikirim ke ImgBB
    const formData = new FormData();
    formData.append("image", image as Blob);

    // 3. Backend yang melakukan request ke ImgBB secara rahasia
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${c.env.IMGBB_API_KEY}`, {
      method: "POST",
      body: formData
    });

    const data: any = await response.json();

    if (!data.success) {
      throw new Error("Failed to upload to ImgBB");
    }

    // 4. Kembalikan URL gambar ke Frontend
    return c.json({ success: true, url: data.data.url }, 200);
  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};
// BATAS PERUBAHAN