import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { childProfile, practiceAttempt } from "@/lib/db/schema";
import { findAssessment } from "@/lib/assessments";
import { getCurrentSession } from "@/lib/session";
import { attemptInput } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in to save progress." }, { status: 401 });
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

  const attempt = {
    id: crypto.randomUUID(),
    parentUserId: session.user.id,
    ...parsed.data,
    completedAt: new Date(parsed.data.completedAt),
    createdAt: new Date(),
  };
  await db.insert(practiceAttempt).values(attempt).onConflictDoNothing({
    target: [practiceAttempt.parentUserId, practiceAttempt.clientAttemptId],
  });
  return NextResponse.json({ ok: true });
}
