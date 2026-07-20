import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";

export default async function ParentPage() {
  const session = await getCurrentSession();
  redirect(session ? "/parent/dashboard" : "/parent/login");
}
