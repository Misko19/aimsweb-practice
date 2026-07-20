"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { GRADES, gradeLabel, type Grade } from "@/lib/assessments";
import { avatars } from "@/lib/validation";

type ChildSummary = {
  id: string;
  nickname: string;
  grade: Grade;
  avatar: (typeof avatars)[number];
  attempts: number;
  recentScore: string | null;
  lastPracticed: string | null;
};

const avatarEmoji = { fox: "🦊", owl: "🦉", otter: "🦦", turtle: "🐢" } as const;

export function ParentDashboard({ email, initialChildren }: { email: string; initialChildren: ChildSummary[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(initialChildren.length === 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function addChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: data.get("nickname"), grade: data.get("grade"), avatar: data.get("avatar") }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Could not create that profile.");
    else {
      form.reset();
      setShowForm(false);
      router.refresh();
    }
    setBusy(false);
  }

  async function removeChild(child: ChildSummary) {
    if (!window.confirm(`Delete ${child.nickname}'s profile and all saved practice history? This cannot be undone.`)) return;
    const response = await fetch(`/api/children?id=${encodeURIComponent(child.id)}`, { method: "DELETE" });
    if (!response.ok) setError("The profile could not be deleted.");
    else router.refresh();
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="dashboard-heading">
        <div><p className="eyebrow">Parent dashboard</p><h1>Your bright learners</h1><p>Signed in as {email}</p></div>
        <div className="dashboard-actions"><button className="button button-primary" onClick={() => setShowForm((value) => !value)}>+ Add child</button><button className="button button-quiet" onClick={signOut}>Sign out</button></div>
      </div>

      {showForm && (
        <form className="child-form" onSubmit={addChild}>
          <h2>Create a child profile</h2>
          <p>Use a nickname—please don&apos;t enter a full legal name.</p>
          <div className="form-row">
            <label>Nickname<input name="nickname" maxLength={30} required /></label>
            <label>Grade<select name="grade" defaultValue="2">{GRADES.map((grade) => <option key={grade} value={grade}>{gradeLabel(grade)}</option>)}</select></label>
          </div>
          <fieldset><legend>Choose an avatar</legend><div className="avatar-options">{avatars.map((avatar, index) => <label key={avatar}><input type="radio" name="avatar" value={avatar} defaultChecked={index === 0} /><span>{avatarEmoji[avatar]} {avatar}</span></label>)}</div></fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button><button className="button button-quiet" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      )}

      {error && !showForm && <p className="form-error" role="alert">{error}</p>}
      <div className="children-grid">
        {initialChildren.map((child) => (
          <article className="child-card" key={child.id}>
            <div className="child-avatar" aria-hidden="true">{avatarEmoji[child.avatar]}</div>
            <div><h2>{child.nickname}</h2><p>{gradeLabel(child.grade)}</p></div>
            <dl><div><dt>Sessions</dt><dd>{child.attempts}</dd></div><div><dt>Latest</dt><dd>{child.recentScore ?? "—"}</dd></div><div><dt>Last practice</dt><dd>{child.lastPracticed ?? "Not yet"}</dd></div></dl>
            <Link className="button button-primary" href={`/?grade=${child.grade}&child=${child.id}`}>Practice as {child.nickname}</Link>
            <button className="delete-link" onClick={() => removeChild(child)}>Delete profile</button>
          </article>
        ))}
      </div>
      {!initialChildren.length && !showForm && <div className="empty-state"><h2>No child profiles yet</h2><p>Add a nickname and grade to start tracking practice.</p></div>}

      <section className="privacy-controls">
        <div><h2>Your privacy controls</h2><p>Download the account&apos;s saved profiles and practice history. Deleting a child removes that profile and its attempts immediately.</p></div>
        <a className="button button-quiet" href="/api/parent/export">Download my data</a>
      </section>
    </>
  );
}
