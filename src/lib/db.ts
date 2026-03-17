import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";
import { initializeDatabase } from "./initDb";

function resolveDatabasePath(): string {
	const explicitPath = process.env.DATABASE_PATH?.trim();
	if (explicitPath) {
		return explicitPath;
	}

	// Vercel serverless functions can only write to /tmp.
	if (process.env.VERCEL) {
		return path.join("/tmp", "task-dashboard.sqlite");
	}

	return path.join(process.cwd(), "sqlite.db");
}

const databasePath = resolveDatabasePath();
if (databasePath !== ":memory:") {
	fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

const sqlite = new Database(databasePath);
export const db = drizzle(sqlite, { schema });

// Initialize database tables
initializeDatabase().catch(console.error);