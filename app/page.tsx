import { HomePage } from "@/components/HomePage";
import { GRADES, type Grade } from "@/lib/assessments";

export default async function Page({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const { grade } = await searchParams;
  const initialGrade = GRADES.includes(grade as Grade) ? grade as Grade : "2";

  return <HomePage initialGrade={initialGrade} />;
}
