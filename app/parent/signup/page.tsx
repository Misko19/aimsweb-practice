import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentSession } from "@/lib/session";

export default async function SignupPage() {
  if (await getCurrentSession()) redirect("/parent/dashboard");
  return <><header className="site-header"><Brand /><Link className="button button-quiet" href="/">Guest practice</Link></header><main id="main-content" className="auth-shell"><section className="auth-card"><p className="eyebrow">Parent-owned tracking</p><h1>Create your account</h1><p>Children never need an email or password. You&apos;ll create nickname-only profiles after signing up.</p><AuthForm mode="signup" /><p className="privacy-fine">No advertising, social profiles, or voice recordings. Public deployment requires a legally reviewed parental-consent process.</p></section></main></>;
}
