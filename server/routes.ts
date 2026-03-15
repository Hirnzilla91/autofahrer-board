import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlateSchema, insertCommentSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

// Security: sanitize string input — strip HTML tags and trim
function sanitize(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")        // Strip HTML tags
    .replace(/[<>"'&]/g, "")        // Remove dangerous characters
    .trim();
}

// Rate limiting per IP (simple in-memory)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

// CAPTCHA store: token → { answer, expiresAt }
const captchaStore = new Map<string, { answer: number; expiresAt: number }>();
const CAPTCHA_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired CAPTCHAs periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of captchaStore) {
    if (now > data.expiresAt) captchaStore.delete(token);
  }
}, 60 * 1000);

function generateCaptcha(): { token: string; question: string; answer: number } {
  const ops = ["+", "-", "×"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  if (op === "+") {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    answer = a + b;
  } else if (op === "-") {
    a = Math.floor(Math.random() * 20) + 5;
    b = Math.floor(Math.random() * a) + 1; // ensure positive result
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * 9) + 2;
    answer = a * b;
  }

  const token = crypto.randomBytes(16).toString("hex");
  const question = `${a} ${op} ${b} = ?`;

  captchaStore.set(token, { answer, expiresAt: Date.now() + CAPTCHA_TTL });

  return { token, question, answer };
}

function verifyCaptcha(token: string, userAnswer: number): boolean {
  const entry = captchaStore.get(token);
  if (!entry) return false;
  captchaStore.delete(token); // one-time use
  if (Date.now() > entry.expiresAt) return false;
  return entry.answer === userAnswer;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Rate limit middleware for write operations
  const rateLimitMiddleware = (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: "Zu viele Anfragen. Bitte warte kurz." });
    }
    next();
  };

  // GET /api/plates — list all plates
  app.get("/api/plates", async (_req, res) => {
    const plates = await storage.getPlates();
    res.json(plates);
  });

  // GET /api/plates/search?q=... — search plates
  app.get("/api/plates/search", async (req, res) => {
    const query = typeof req.query.q === "string" ? sanitize(req.query.q) : "";
    if (query.length < 1) {
      return res.json([]);
    }
    const plates = await storage.searchPlates(query);
    res.json(plates);
  });

  // GET /api/plates/:id — get single plate
  app.get("/api/plates/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Ungültige ID" });
    }
    const plate = await storage.getPlateById(id);
    if (!plate) {
      return res.status(404).json({ error: "Kennzeichen nicht gefunden" });
    }
    res.json(plate);
  });

  // POST /api/plates — register a new plate
  app.post("/api/plates", rateLimitMiddleware, async (req, res) => {
    try {
      const data = insertPlateSchema.parse({
        plate: sanitize(req.body.plate || ""),
      });

      // Check if plate already exists
      const existing = await storage.getPlateByPlate(data.plate);
      if (existing) {
        return res.json(existing);
      }

      const plate = await storage.createPlate(data);
      res.status(201).json(plate);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({
          error: e.errors[0]?.message || "Ungültige Eingabe"
        });
      }
      return res.status(400).json({ error: "Ungültige Eingabe" });
    }
  });

  // GET /api/plates/:id/comments — get comments for a plate
  app.get("/api/plates/:id/comments", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Ungültige ID" });
    }
    const comments = await storage.getCommentsByPlateId(id);
    res.json(comments);
  });

  // GET /api/captcha — generate a new CAPTCHA challenge
  app.get("/api/captcha", (_req, res) => {
    const { token, question } = generateCaptcha();
    res.json({ token, question });
  });

  // POST /api/plates/:id/comments — add a comment (CAPTCHA required)
  app.post("/api/plates/:id/comments", rateLimitMiddleware, async (req, res) => {
    try {
      // Verify CAPTCHA first
      const captchaToken = req.body.captchaToken;
      const captchaAnswer = Number(req.body.captchaAnswer);

      if (!captchaToken || isNaN(captchaAnswer)) {
        return res.status(400).json({ error: "Bitte löse die Rechenaufgabe." });
      }

      if (!verifyCaptcha(captchaToken, captchaAnswer)) {
        return res.status(400).json({ error: "Falsche Antwort oder CAPTCHA abgelaufen. Bitte versuche es erneut." });
      }

      const plateId = parseInt(req.params.id, 10);
      if (isNaN(plateId)) {
        return res.status(400).json({ error: "Ungültige Plate ID" });
      }

      const plate = await storage.getPlateById(plateId);
      if (!plate) {
        return res.status(404).json({ error: "Kennzeichen nicht gefunden" });
      }

      const data = insertCommentSchema.parse({
        plateId,
        username: sanitize(req.body.username || ""),
        text: sanitize(req.body.text || ""),
        grade: Number(req.body.grade),
      });

      const comment = await storage.createComment(data);
      res.status(201).json(comment);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({
          error: e.errors[0]?.message || "Ungültige Eingabe"
        });
      }
      return res.status(400).json({ error: "Ungültige Eingabe" });
    }
  });

  // GET /api/rankings/top — top 10 best drivers
  app.get("/api/rankings/top", async (_req, res) => {
    const top = await storage.getTopRated(10);
    res.json(top);
  });

  // GET /api/rankings/worst — top 10 worst drivers
  app.get("/api/rankings/worst", async (_req, res) => {
    const worst = await storage.getWorstRated(10);
    res.json(worst);
  });

  return httpServer;
}
