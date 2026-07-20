import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { db } from "@/lib/db";
import { parentSettings } from "@/lib/db/schema";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  await db.insert(parentSettings).values({
    userId: session.user.id,
    privacyVersion: "2026-07-20",
    privacyAcceptedAt: now,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: parentSettings.userId,
    set: { privacyVersion: "2026-07-20", privacyAcceptedAt: now, updatedAt: now },
  });

  return NextResponse.json({ ok: true });
}
