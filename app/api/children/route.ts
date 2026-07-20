import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { getCurrentConsent } from "@/lib/consent";
import { db } from "@/lib/db";
import { childProfile } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/session";
import { takeRateLimit } from "@/lib/rate-limit";
import { childProfileInput } from "@/lib/validation";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const children = await db.select().from(childProfile).where(eq(childProfile.parentUserId, session.user.id)).orderBy(childProfile.createdAt);
  return NextResponse.json({ children });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await getCurrentConsent(session.user.id)) return NextResponse.json({ error: "Privacy notice acceptance is required." }, { status: 403 });
  const limit = takeRateLimit(`${session.user.id}:children`, 20, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many profile changes. Please try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const parsed = childProfileInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile." }, { status: 400 });

  const profile = db.transaction((tx) => {
    const total = tx.select({ value: count() }).from(childProfile).where(eq(childProfile.parentUserId, session.user.id)).get();
    if ((total?.value ?? 0) >= 12) return null;
    const now = new Date();
    const next = { id: crypto.randomUUID(), parentUserId: session.user.id, ...parsed.data, createdAt: now, updatedAt: now };
    tx.insert(childProfile).values(next).run();
    return next;
  });
  if (!profile) return NextResponse.json({ error: "An account can have up to 12 child profiles." }, { status: 409 });
  return NextResponse.json({ child: profile }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Profile id is required." }, { status: 400 });
  const deleted = await db.delete(childProfile).where(and(eq(childProfile.id, id), eq(childProfile.parentUserId, session.user.id))).returning({ id: childProfile.id });
  if (!deleted.length) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
