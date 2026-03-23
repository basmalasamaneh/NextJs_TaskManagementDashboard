import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { initializeDatabase } from "./initDb";

// Local dev: file:./sqlite.db  |  Production (Vercel): Turso is required
const databaseUrl = (() => {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "[db] TURSO_DATABASE_URL is required on Vercel. Turso is mandatory for production persistence."
    );
  }

  return "file:./sqlite.db";
})();

if (process.env.VERCEL && !process.env.TURSO_AUTH_TOKEN) {
  throw new Error(
    "[db] TURSO_AUTH_TOKEN is required on Vercel."
  );
}

const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Initialize database tables
initializeDatabase().catch(console.error);