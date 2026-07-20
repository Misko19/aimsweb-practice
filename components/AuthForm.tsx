"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PRIVACY_VERSION } from "@/lib/privacy";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    try {
      const response = signup
        ? await authClient.signUp.email({ name: "Parent", email, password })
        : await authClient.signIn.email({ email, password });
      if (response.error) {
        setError(response.error.message ?? "We couldn't complete that request.");
        return;
      }
      if (signup) {
        const consent = await fetch("/api/parent/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accepted: true, privacyVersion: PRIVACY_VERSION, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }),
        });
        if (!consent.ok) { router.push("/parent/consent"); return; }
      }
      router.push("/parent/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={10} required /></label>
      {signup && (
        <label className="consent-check">
          <input name="consent" type="checkbox" required />
          <span>I am a parent or guardian, and I accept the privacy notice for saving child practice data. <Link href="/privacy" target="_blank" rel="noreferrer">Read the notice</Link>.</span>
        </label>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-large" disabled={busy}>{busy ? "Working…" : signup ? "Create parent account" : "Sign in"}</button>
      <p className="auth-switch">{signup ? "Already have an account?" : "New to BrightPath?"} <Link href={signup ? "/parent/login" : "/parent/signup"}>{signup ? "Sign in" : "Create an account"}</Link></p>
    </form>
  );
}
