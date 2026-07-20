import { notFound } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { PracticeSession } from "@/components/PracticeSession";
import { GRADES, findAssessment, gradeLabel, type Grade } from "@/lib/assessments";

export default async function PracticePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ grade?: string; child?: string }> }) {
  const { slug } = await params;
  const { grade: requestedGrade, child } = await searchParams;
  const assessment = findAssessment(slug);
  if (!assessment) notFound();
  const grade = GRADES.includes(requestedGrade as Grade) ? requestedGrade as Grade : assessment.grades[0];
  if (!assessment.grades.includes(grade)) notFound();

  return (
    <>
      <header className="site-header practice-header">
        <Brand />
        <span>{gradeLabel(grade)}</span>
        <Link className="button button-quiet" href="/">Exit practice</Link>
      </header>
      <main id="main-content" className="practice-shell">
        <PracticeSession assessment={assessment} grade={grade} childId={typeof child === "string" && child.length <= 100 ? child : undefined} />
      </main>
    </>
  );
}
