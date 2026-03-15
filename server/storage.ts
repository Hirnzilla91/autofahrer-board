import {
  type Plate,
  type InsertPlate,
  type Comment,
  type InsertComment,
  plates,
  comments,
} from "@shared/schema";
import { eq, sql, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// Database connection — uses DATABASE_URL environment variable
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool);

export interface IStorage {
  // Plates
  getPlates(): Promise<Plate[]>;
  getPlateByPlate(plate: string): Promise<Plate | undefined>;
  getPlateById(id: number): Promise<Plate | undefined>;
  createPlate(plate: InsertPlate): Promise<Plate>;
  searchPlates(query: string): Promise<Plate[]>;

  // Comments
  getCommentsByPlateId(plateId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Rankings
  getTopRated(limit: number): Promise<Array<{
    plate: Plate;
    avgGrade: number;
    commentCount: number;
    latestComments: Comment[];
  }>>;
  getWorstRated(limit: number): Promise<Array<{
    plate: Plate;
    avgGrade: number;
    commentCount: number;
    latestComments: Comment[];
  }>>;
}

export class PgStorage implements IStorage {
  async getPlates(): Promise<Plate[]> {
    return db.select().from(plates).orderBy(desc(plates.createdAt));
  }

  async getPlateByPlate(plateStr: string): Promise<Plate | undefined> {
    const result = await db
      .select()
      .from(plates)
      .where(eq(plates.plate, plateStr))
      .limit(1);
    return result[0];
  }

  async getPlateById(id: number): Promise<Plate | undefined> {
    const result = await db
      .select()
      .from(plates)
      .where(eq(plates.id, id))
      .limit(1);
    return result[0];
  }

  async createPlate(insertPlate: InsertPlate): Promise<Plate> {
    const result = await db
      .insert(plates)
      .values({ plate: insertPlate.plate })
      .returning();
    return result[0];
  }

  async searchPlates(query: string): Promise<Plate[]> {
    const normalized = query.toUpperCase().replace(/[^A-ZÄÖÜ0-9]/g, "");
    if (!normalized) return [];
    // Use ILIKE for fuzzy matching, search with spaces removed
    return db
      .select()
      .from(plates)
      .where(sql`REPLACE(${plates.plate}, ' ', '') ILIKE ${"%" + normalized + "%"}`)
      .limit(20);
  }

  async getCommentsByPlateId(plateId: number): Promise<Comment[]> {
    return db
      .select()
      .from(comments)
      .where(eq(comments.plateId, plateId))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const result = await db
      .insert(comments)
      .values({
        plateId: insertComment.plateId,
        username: insertComment.username,
        text: insertComment.text,
        grade: insertComment.grade,
      })
      .returning();
    return result[0];
  }

  private async getRankedPlates(order: "best" | "worst", limit: number) {
    // Get plates with their average grade and comment count
    const ranked = await db
      .select({
        plateId: comments.plateId,
        avgGrade: sql<number>`AVG(${comments.grade})::float`,
        commentCount: sql<number>`COUNT(*)::int`,
      })
      .from(comments)
      .groupBy(comments.plateId)
      .orderBy(
        order === "best"
          ? asc(sql`AVG(${comments.grade})`)
          : desc(sql`AVG(${comments.grade})`)
      )
      .limit(limit);

    const results: Array<{
      plate: Plate;
      avgGrade: number;
      commentCount: number;
      latestComments: Comment[];
    }> = [];

    for (const row of ranked) {
      const plate = await this.getPlateById(row.plateId);
      if (!plate) continue;

      const latestComments = await db
        .select()
        .from(comments)
        .where(eq(comments.plateId, row.plateId))
        .orderBy(desc(comments.createdAt))
        .limit(3);

      results.push({
        plate,
        avgGrade: row.avgGrade,
        commentCount: row.commentCount,
        latestComments,
      });
    }

    return results;
  }

  async getTopRated(limit: number) {
    return this.getRankedPlates("best", limit);
  }

  async getWorstRated(limit: number) {
    return this.getRankedPlates("worst", limit);
  }
}

export const storage = new PgStorage();
