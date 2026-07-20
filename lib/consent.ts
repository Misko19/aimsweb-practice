import { eq } from "drizzle-orm";
import { db } from "./db";
import { parentSettings } from "./db/schema";

import { PRIVACY_VERSION } from "./privacy";

export async function getCurrentConsent(userId: string) {
  const settings = await db.select().from(parentSettings).where(eq(parentSettings.userId, userId)).get();
  return settings?.privacyVersion === PRIVACY_VERSION ? settings : null;
}
