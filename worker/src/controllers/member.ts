import { Context } from "hono";
import { Env } from "../types/env";

export const createMember = async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json();
    const { id, full_name, identity_number, face_descriptor } = body;

    if (!id || !full_name || !identity_number || !face_descriptor) {
      return c.json({ error: "Missing required fields or biometric data" }, 400);
    }

    const join_date = Math.floor(Date.now() / 1000);

    const stmt = c.env.DB.prepare(
      "INSERT INTO members (id, full_name, identity_number, join_date, is_active) VALUES (?, ?, ?, ?, 1)"
    ).bind(id, full_name, identity_number, join_date);

    await stmt.run();

    try {
      await c.env.VECTORIZE_INDEX.upsert([
        {
          id: id,
          values: face_descriptor
        }
      ]);
    } catch (vectorError: any) {
      console.warn("Vectorize Upsert Warning:", vectorError.message);
    }

    return c.json({ success: true, member_id: id }, 201);
  } catch (error: any) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return c.json({ error: "Identity number already exists" }, 409);
    }
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};