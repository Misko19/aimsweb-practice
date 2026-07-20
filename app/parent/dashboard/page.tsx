import Link from "next/link";
import { redirect } from "next/navigation";
import { count, desc, eq, sql } from "drizzle-orm";
import { Brand } from "@/components/Brand";
import { AccountDeletion } from "@/components/AccountDeletion";
import { ParentDashboard } from "@/components/ParentDashboard";
import { ProgressHistory } from "@/components/ProgressHistory";
import { getCurrentConsent } from "@/lib/consent";
import { db } from "@/lib/db";
import { childProfile, practiceAttempt } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/session";
import type { Grade } from "@/lib/assessments";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/parent/login");
  const settings = await getCurrentConsent(session.user.id);
  if (!settings) redirect("/parent/consent");

  const children = await db.select().from(childProfile).where(eq(childProfile.parentUserId, session.user.id)).orderBy(childProfile.createdAt);
  const counts = await db.select({ childProfileId: practiceAttempt.childProfileId, value: count() })
    .from(practiceAttempt)
    .where(eq(practiceAttempt.parentUserId, session.user.id))
    .groupBy(practiceAttempt.childProfileId);
  const ranked = db.select({
    childProfileId: practiceAttempt.childProfileId,
    correct: practiceAttempt.correct,
    total: practiceAttempt.total,
    kind: practiceAttempt.kind,
    completedAt: practiceAttempt.completedAt,
    rowNumber: sql<number>`row_number() over (partition by ${practiceAttempt.childProfileId} order by ${practiceAttempt.createdAt} desc)`.as("row_number"),
  }).from(practiceAttempt).where(eq(practiceAttempt.parentUserId, session.user.id)).as("ranked_attempts");
  const latestAttempts = await db.select().from(ranked).where(eq(ranked.rowNumber, 1));
  const recent = await db.select().from(practiceAttempt)
    .where(eq(practiceAttempt.parentUserId, session.user.id))
    .orderBy(desc(practiceAttempt.createdAt))
    .limit(50);

  const countByChild = new Map(counts.map((entry) => [entry.childProfileId, entry.value]));
  const latestByChild = new Map(latestAttempts.map((attempt) => [attempt.childProfileId, attempt]));
  const summaries = children.map((child) => {
    const latest = latestByChild.get(child.id);
    return {
      id: child.id,
      nickname: child.nickname,
      grade: child.grade as Grade,
      avatar: child.avatar,
      attempts: countByChild.get(child.id) ?? 0,
      recentScore: latest ? (latest.kind === "accuracy" ? `${latest.correct}/${latest.total}` : `${latest.correct} words`) : null,
      lastPracticed: latest ? formatDate(latest.completedAt, settings.timezone) : null,
    };
  });

  const childNames = new Map(children.map((child) => [child.id, child.nickname]));
  const recentAttempts = recent.map((attempt) => ({
    id: attempt.id,
    childName: childNames.get(attempt.childProfileId) ?? "Child",
    assessmentSlug: attempt.assessmentSlug,
    correct: attempt.correct,
    total: attempt.total,
    kind: attempt.kind,
    durationSeconds: attempt.durationSeconds,
    completedAt: formatDate(attempt.completedAt, settings.timezone),
  }));

  return <><header className="site-header"><Brand /><Link className="button button-quiet" href="/">Practice home</Link></header><main id="main-content" className="dashboard-shell"><ParentDashboard email={session.user.email} initialChildren={summaries} /><ProgressHistory attempts={recentAttempts} /><AccountDeletion /></main></>;
}

function formatDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: timezone }).format(date);
}
