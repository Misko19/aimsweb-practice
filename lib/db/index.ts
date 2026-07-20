import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { schema } from "./schema";

const databasePath = process.env.DATABASE_PATH ?? "data/brightpath.db";
const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };
