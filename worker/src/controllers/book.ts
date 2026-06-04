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

export const createBook = async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json();
    const { title, author, isbn, stock } = body;

    if (!title || !author || !isbn || stock === undefined) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const bookId = crypto.randomUUID();
    const createdAt = Math.floor(Date.now() / 1000);

    await c.env.DB.prepare(
      "INSERT INTO books (id, title, author, isbn, stock, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(bookId, title, author, isbn, parseInt(stock), createdAt).run();

    return c.json({ success: true, message: "Book added to catalog" }, 201); // <-- TYPO DIPERBAIKI (201)
  } catch (error: any) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return c.json({ error: "Book with this ISBN already exists" }, 409);
    }
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};

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