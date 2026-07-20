import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Brand } from "@/components/Brand";
import { AccountDeletion } from "@/components/AccountDeletion";
import { ParentDashboard } from "@/components/ParentDashboard";
import { ProgressHistory } from "@/components/ProgressHistory";
import { db } from "@/lib/db";
import { childProfile, practiceAttempt } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/session";
import type { Grade } from "@/lib/assessments";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/parent/login");
  const children = await db.select().from(childProfile).where(eq(childProfile.parentUserId, session.user.id)).orderBy(childProfile.createdAt);
  const attempts = children.length
    ? await db.select().from(practiceAttempt).where(and(
        eq(practiceAttempt.parentUserId, session.user.id),
        inArray(practiceAttempt.childProfileId, children.map(({ id }) => id)),
      )).orderBy(desc(practiceAttempt.completedAt))
    : [];
  const summaries = children.map((child) => {
    const history = attempts.filter((attempt) => attempt.childProfileId === child.id);
    const recent = history[0];
    return {
      id: child.id,
      nickname: child.nickname,
      grade: child.grade as Grade,
      avatar: child.avatar,
      attempts: history.length,
      recentScore: recent ? (recent.kind === "accuracy" ? `${recent.correct}/${recent.total}` : `${recent.correct} words`) : null,
      lastPracticed: recent ? recent.completedAt.toLocaleDateString() : null,
    };
  });

  const childNames = new Map(children.map((child) => [child.id, child.nickname]));
  const recentAttempts = attempts.slice(0, 50).map((attempt) => ({
    id: attempt.id,
    childName: childNames.get(attempt.childProfileId) ?? "Child",
    assessmentSlug: attempt.assessmentSlug,
    correct: attempt.correct,
    total: attempt.total,
    kind: attempt.kind,
    durationSeconds: attempt.durationSeconds,
    completedAt: attempt.completedAt.toLocaleDateString(),
  }));

  return <><header className="site-header"><Brand /><Link className="button button-quiet" href="/">Practice home</Link></header><main id="main-content" className="dashboard-shell"><ParentDashboard email={session.user.email} initialChildren={summaries} /><ProgressHistory attempts={recentAttempts} /><AccountDeletion /></main></>;
}
