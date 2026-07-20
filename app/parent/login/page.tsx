import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentSession } from "@/lib/session";

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/parent/dashboard");
  return <><header className="site-header"><Brand /><Link className="button button-quiet" href="/">Guest practice</Link></header><main id="main-content" className="auth-shell"><section className="auth-card"><p className="eyebrow">For grown-ups</p><h1>Welcome back</h1><p>Sign in to see child profiles and saved practice progress.</p><AuthForm mode="login" /></section></main></>;
}
