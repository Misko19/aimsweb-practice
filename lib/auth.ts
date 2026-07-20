import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db";
import { schema } from "./db/schema";

export const auth = betterAuth({
  appName: "BrightPath Practice",
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  user: { deleteUser: { enabled: true } },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    freshAge: 60 * 15,
  },
  advanced: {
    cookiePrefix: "brightpath",
  },
});
