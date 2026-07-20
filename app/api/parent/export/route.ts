import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { childProfile, parentSettings, practiceAttempt } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [settings, children, attempts] = await Promise.all([
    db.select().from(parentSettings).where(eq(parentSettings.userId, session.user.id)).get(),
    db.select().from(childProfile).where(eq(childProfile.parentUserId, session.user.id)),
    db.select().from(practiceAttempt).where(eq(practiceAttempt.parentUserId, session.user.id)),
  ]);
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), parent: { email: session.user.email }, settings, children, attempts }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=brightpath-data.json" },
  });
}
