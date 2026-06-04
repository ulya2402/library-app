import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env } from "./types/env";
import { createMember } from "./controllers/member";
import { loginBiometric } from "./controllers/auth";
import { getBooks, createBook, deleteBook } from "./controllers/book"; // UBAH IMPORT
import { borrowBook } from "./controllers/transaction";
import { processOCR } from "./controllers/ocr"; // <-- 1. IMPORT INI

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
}));

app.get("/health", (c) => c.json({ status: "ok", service: "library-worker" }));

app.post("/api/members", createMember);
app.post("/api/login", loginBiometric);

app.get("/api/books", getBooks);
app.post("/api/books", createBook);
app.delete("/api/books/:id", deleteBook); // TAMBAHKAN ROUTE DELETE

app.post("/api/borrow", borrowBook);

app.post("/api/ocr", processOCR);

export default app;