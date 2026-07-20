import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { schema } from "./schema";

const databasePath = process.env.DATABASE_PATH ?? "data/brightpath.db";
const globalDatabase = globalThis as typeof globalThis & { brightpathSqlite?: Database.Database };
const sqlite = globalDatabase.brightpathSqlite ?? new Database(databasePath);
if (process.env.NODE_ENV !== "production") globalDatabase.brightpathSqlite = sqlite;
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };
