"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRIVACY_VERSION } from "@/lib/privacy";

export function ConsentForm() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!accepted) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/parent/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accepted: true,
        privacyVersion: PRIVACY_VERSION,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }),
    });
    if (!response.ok) {
      setError("We couldn't save your acceptance. Please try again.");
      setBusy(false);
      return;
    }
    router.push("/parent/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-form">
      <label className="consent-check">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>I am a parent or guardian, and I accept the <Link href="/privacy" target="_blank" rel="noreferrer">privacy notice</Link> for saving child practice data.</span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-large" disabled={!accepted || busy} onClick={save}>{busy ? "Saving…" : "Accept and continue"}</button>
    </div>
  );
}
