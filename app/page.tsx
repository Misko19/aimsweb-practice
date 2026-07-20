import { HomePage } from "@/components/HomePage";
import { GRADES, type Grade } from "@/lib/assessments";

export default async function Page({ searchParams }: { searchParams: Promise<{ grade?: string; child?: string }> }) {
  const { grade, child } = await searchParams;
  const initialGrade = GRADES.includes(grade as Grade) ? grade as Grade : "2";
  const childId = typeof child === "string" && child.length <= 100 ? child : undefined;

  return <HomePage initialGrade={initialGrade} childId={childId} />;
}
