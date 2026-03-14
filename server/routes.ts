import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlateSchema, insertCommentSchema } from "@shared/schema";
import { z } from "zod";

function sanitize(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'&]/g, "")
    .trim();
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60 * 1000;

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

  const rateLimitMiddleware = (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: "Zu viele Anfragen. Bitte warte kurz." });
    }
    next();
  };

  app.get("/api/plates", async (_req, res) => {
    const plates = await storage.getPlates();
    res.json(plates);
  });

  app.get("/api/plates/search", async (req, res) => {
    const query = typeof req.query.q === "string" ? sanitize(req.query.q) : "";
    if (query.length < 1) {
      return res.json([]);
    }
    const plates = await storage.searchPlates(query);
    res.json(plates);
  });

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

  app.post("/api/plates", rateLimitMiddleware, async (req, res) => {
    try {
      const data = insertPlateSchema.parse({
        plate: sanitize(req.body.plate || ""),
      });

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

  app.get("/api/plates/:id/comments", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Ungültige ID" });
    }
    const comments = await storage.getCommentsByPlateId(id);
    res.json(comments);
  });

  app.post("/api/plates/:id/comments", rateLimitMiddleware, async (req, res) => {
    try {
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

  app.get("/api/rankings/top", async (_req, res) => {
    const top = await storage.getTopRated(10);
    res.json(top);
  });

  app.get("/api/rankings/worst", async (_req, res) => {
    const worst = await storage.getWorstRated(10);
    res.json(worst);
  });

  return httpServer;
}
