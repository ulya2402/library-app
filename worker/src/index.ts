import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env } from "./types/env";
import { createMember, getMembers, updateMemberRole, deleteMember } from "./controllers/member";
import { loginBiometric } from "./controllers/auth";
import { getBooks, createBook, deleteBook } from "./controllers/book";
import { borrowBook, getTransactions, returnBook } from "./controllers/transaction";
import { processOCR } from "./controllers/ocr";
import { uploadCover } from "./controllers/book";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
}));

app.get("/health", (c) => c.json({ status: "ok", service: "library-worker" }));

app.post("/api/members", createMember);
app.get("/api/members", getMembers);
app.put("/api/members/:id/role", updateMemberRole);
app.delete("/api/members/:id", deleteMember);
app.post("/api/login", loginBiometric);

app.get("/api/books", getBooks);
app.post("/api/books", createBook);
app.delete("/api/books/:id", deleteBook);

app.post("/api/upload", uploadCover); 

app.post("/api/borrow", borrowBook);
app.get("/api/transactions", getTransactions);
app.put("/api/transactions/:id/return", returnBook);

app.post("/api/ocr", processOCR);

export default app;