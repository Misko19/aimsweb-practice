import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { findAssessment } from "@/lib/assessments";
import { getCurrentConsent } from "@/lib/consent";
import { db } from "@/lib/db";
import { childProfile, practiceAttempt } from "@/lib/db/schema";
import { takeRateLimit } from "@/lib/rate-limit";
import { getCurrentSession } from "@/lib/session";
import { attemptInput } from "@/lib/validation";

const MAX_ATTEMPTS_PER_CHILD = 1_000;

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to save progress." }, { status: 401 });
  if (!await getCurrentConsent(session.user.id)) return NextResponse.json({ error: "Privacy notice acceptance is required." }, { status: 403 });
  const limit = takeRateLimit(`${session.user.id}:attempts`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many saves. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const parsed = attemptInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid attempt." }, { status: 400 });
  const assessment = findAssessment(parsed.data.assessmentSlug);
  if (!assessment || !assessment.grades.includes(parsed.data.grade)) return NextResponse.json({ error: "Invalid activity for this grade." }, { status: 400 });
  const expectedKind = assessment.mode === "oral-reading" ? "words-read" : "accuracy";
  if (parsed.data.kind !== expectedKind) return NextResponse.json({ error: "Attempt type does not match the activity." }, { status: 400 });

  const child = await db.select({ id: childProfile.id, grade: childProfile.grade }).from(childProfile).where(and(
    eq(childProfile.id, parsed.data.childProfileId),
    eq(childProfile.parentUserId, session.user.id),
  )).get();
  if (!child) return NextResponse.json({ error: "Child profile not found." }, { status: 404 });
  if (child.grade !== parsed.data.grade) return NextResponse.json({ error: "Attempt grade does not match the child profile." }, { status: 400 });

  const now = new Date();
  const completedAt = new Date(parsed.data.completedAt);
  if (completedAt.getTime() > now.getTime() + 24 * 60 * 60 * 1000 || completedAt.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Attempt time is outside the accepted range." }, { status: 400 });
  }
  const attempt = { id: crypto.randomUUID(), parentUserId: session.user.id, ...parsed.data, completedAt, createdAt: now };
  await db.insert(practiceAttempt).values(attempt).onConflictDoNothing({ target: [practiceAttempt.parentUserId, practiceAttempt.clientAttemptId] });
  await db.run(sql`delete from ${practiceAttempt}
    where ${practiceAttempt.childProfileId} = ${child.id}
      and ${practiceAttempt.id} not in (
        select ${practiceAttempt.id} from ${practiceAttempt}
        where ${practiceAttempt.childProfileId} = ${child.id}
        order by ${practiceAttempt.createdAt} desc
        limit ${MAX_ATTEMPTS_PER_CHILD}
      )`);
  return NextResponse.json({ ok: true });
}
