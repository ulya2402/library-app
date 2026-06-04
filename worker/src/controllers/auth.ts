import { Context } from "hono";
import { Env } from "../types/env";

export const loginBiometric = async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json();
    const { face_descriptor } = body;

    if (!face_descriptor || !Array.isArray(face_descriptor)) {
      return c.json({ error: "Invalid biometric data" }, 400);
    }

    const matches = await c.env.VECTORIZE_INDEX.query(face_descriptor, { topK: 1 });

    if (!matches.matches || matches.matches.length === 0) {
      return c.json({ error: "Face not recognized in database" }, 401);
    }

    const bestMatch = matches.matches[0];
    
    if (bestMatch.score < 0.80) {
      return c.json({ error: "Face similarity score too low. Please try again." }, 401);
    }

    const memberId = bestMatch.id;
    const member = await c.env.DB.prepare(
      "SELECT id, full_name, identity_number FROM members WHERE id = ? AND is_active = 1"
    ).bind(memberId).first();

    if (!member) {
      return c.json({ error: "Member account not found or inactive" }, 404);
    }

    return c.json({ 
      success: true, 
      member: member,
      similarity_score: bestMatch.score 
    }, 200);

  } catch (error: any) {
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
};