import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { ConsentForm } from "@/components/ConsentForm";
import { getCurrentConsent } from "@/lib/consent";
import { getCurrentSession } from "@/lib/session";

export default async function ConsentPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/parent/login");
  if (await getCurrentConsent(session.user.id)) redirect("/parent/dashboard");
  return <><header className="site-header"><Brand /><Link className="button button-quiet" href="/">Guest practice</Link></header><main id="main-content" className="auth-shell"><section className="auth-card"><p className="eyebrow">One parent step</p><h1>Review the privacy notice</h1><p>Cloud child profiles stay unavailable until a parent or guardian accepts the current notice. Guest practice remains available without accepting.</p><ConsentForm /></section></main></>;
}
