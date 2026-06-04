import { Context } from "hono";
import { Env } from "../types/env";

export const borrowBook = async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json();
    const { member_id, book_id } = body;

    if (!member_id || !book_id) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const book = await c.env.DB.prepare("SELECT stock FROM books WHERE id = ?").bind(book_id).first<{ stock: number }>();

    if (!book) {
      return c.json({ error: "Book not found" }, 404);
    }

    if (book.stock <= 0) {
      return c.json({ error: "Out of stock" }, 400);
    }

    const transactionId = crypto.randomUUID();
    const borrowDate = Math.floor(Date.now() / 1000);
    const dueDate = borrowDate + (7 * 24 * 60 * 60); // 7 Days due date

    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE books SET stock = stock - 1 WHERE id = ?").bind(book_id),
      c.env.DB.prepare(
        "INSERT INTO transactions (id, member_id, book_id, borrow_date, due_date, status) VALUES (?, ?, ?, ?, ?, 'BORROWED')"
      ).bind(transactionId, member_id, book_id, borrowDate, dueDate)
    ]);

    return c.json({ success: true, message: "Book borrowed successfully" }, 200);

  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};  