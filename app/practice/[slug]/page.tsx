import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { PracticeSession } from "@/components/PracticeSession";
import { GRADES, findAssessment, gradeLabel, type Grade } from "@/lib/assessments";
import { db } from "@/lib/db";
import { childProfile } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/session";

export default async function PracticePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ grade?: string; child?: string }> }) {
  const { slug } = await params;
  const { grade: requestedGrade, child } = await searchParams;
  const assessment = findAssessment(slug);
  if (!assessment) notFound();

  const requestedChildId = typeof child === "string" && child.length <= 100 ? child : undefined;
  let childId: string | undefined;
  let grade: Grade;
  if (requestedChildId) {
    const session = await getCurrentSession();
    if (!session) redirect("/parent/login");
    const profile = await db.select({ id: childProfile.id, grade: childProfile.grade }).from(childProfile).where(and(
      eq(childProfile.id, requestedChildId),
      eq(childProfile.parentUserId, session.user.id),
    )).get();
    if (!profile) notFound();
    childId = profile.id;
    grade = profile.grade as Grade;
  } else {
    grade = GRADES.includes(requestedGrade as Grade) ? requestedGrade as Grade : assessment.grades[0];
  }
  if (!assessment.grades.includes(grade)) notFound();

  const exitHref = childId ? `/?grade=${grade}&child=${encodeURIComponent(childId)}` : `/?grade=${grade}`;
  return (
    <>
      <header className="site-header practice-header">
        <Brand />
        <span>{gradeLabel(grade)}</span>
        <Link className="button button-quiet" href={exitHref}>Exit practice</Link>
      </header>
      <main id="main-content" className="practice-shell">
        <PracticeSession assessment={assessment} grade={grade} childId={childId} />
      </main>
    </>
  );
}
