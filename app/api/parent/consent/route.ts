import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parentSettings } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/session";
import { consentInput } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = consentInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Accept the current privacy notice to continue." }, { status: 400 });

  const now = new Date();
  await db.insert(parentSettings).values({
    userId: session.user.id,
    privacyVersion: parsed.data.privacyVersion,
    privacyAcceptedAt: now,
    timezone: parsed.data.timezone,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: parentSettings.userId,
    set: { privacyVersion: parsed.data.privacyVersion, privacyAcceptedAt: now, timezone: parsed.data.timezone, updatedAt: now },
  });
  return NextResponse.json({ ok: true });
}
