import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { initializeDatabase } from "./initDb";

// Local dev: file:./sqlite.db  |  Production: libsql://... (Turso)
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./sqlite.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Initialize database tables
initializeDatabase().catch(console.error);