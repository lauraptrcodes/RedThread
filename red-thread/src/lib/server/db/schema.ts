// schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const tracks = sqliteTable("tracks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  bpm: real("bpm").notNull(),
  camelotKey: text("camelot_key").notNull(), // z. B. "8A"
  energy: integer("energy"),                 // 1–10
});