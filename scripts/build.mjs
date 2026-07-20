import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "build"], {
  env: {
    ...process.env,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? randomBytes(32).toString("base64url"),
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
