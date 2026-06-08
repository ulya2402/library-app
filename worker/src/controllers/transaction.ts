import { Context } from "hono";
import { Env } from "../types/env";

export const borrowBook = async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json();
    const { member_id, book_id, duration_amount, duration_unit } = body;

    if (!member_id || !book_id || !duration_amount || !duration_unit) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const amount = parseInt(duration_amount, 10);
    if (isNaN(amount) || amount <= 0) {
      return c.json({ error: "Invalid duration amount" }, 400);
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
    
    let secondsToAdd = 0;
    if (duration_unit === "hours") {
      secondsToAdd = amount * 60 * 60;
    } else if (duration_unit === "days") {
      secondsToAdd = amount * 24 * 60 * 60;
    } else {
      return c.json({ error: "Invalid duration unit" }, 400);
    }

    const dueDate = borrowDate + secondsToAdd;

    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE books SET stock = stock - 1 WHERE id = ?").bind(book_id),
      c.env.DB.prepare(
        "INSERT INTO transactions (id, member_id, book_id, borrow_date, due_date, status) VALUES (?, ?, ?, ?, ?, 'BORROWED')"
      ).bind(transactionId, member_id, book_id, borrowDate, dueDate)
    ]);

    return c.json({ success: true, message: "Transaction completed" }, 200);

  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};

export const getTransactions = async (c: Context<{ Bindings: Env }>) => {
  try {
    const memberId = c.req.query("member_id");
    const role = c.req.query("role");

    let query = `
      SELECT t.id, t.member_id, t.book_id, t.borrow_date, t.due_date, b.title, b.author, m.full_name as member_name 
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      JOIN members m ON t.member_id = m.id
      WHERE t.status = 'BORROWED'
    `;
    
    let results;
    if (role === 'admin') {
      results = await c.env.DB.prepare(query + " ORDER BY t.due_date ASC").all();
    } else if (memberId) {
      query += " AND t.member_id = ?";
      results = await c.env.DB.prepare(query + " ORDER BY t.due_date ASC").bind(memberId).all();
    } else {
       return c.json({ error: "Unauthorized access" }, 403);
    }

    return c.json({ success: true, transactions: results.results }, 200);
  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};

export const returnBook = async (c: Context<{ Bindings: Env }>) => {
  try {
    const id = c.req.param("id");
    
    const transaction = await c.env.DB.prepare("SELECT * FROM transactions WHERE id = ? AND status = 'BORROWED'").bind(id).first<{ book_id: string }>();
    
    if (!transaction) {
      return c.json({ error: "Transaction invalid or already returned" }, 404);
    }

    const returnDate = Math.floor(Date.now() / 1000);

    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE books SET stock = stock + 1 WHERE id = ?").bind(transaction.book_id),
      c.env.DB.prepare("UPDATE transactions SET status = 'RETURNED', return_date = ? WHERE id = ?").bind(returnDate, id)
    ]);

    return c.json({ success: true, message: "Book returned" }, 200);
  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};