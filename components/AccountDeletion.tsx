"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AccountDeletion() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("confirm") !== "DELETE") {
      setError("Type DELETE exactly to confirm.");
      return;
    }
    setBusy(true);
    const response = await authClient.deleteUser({ password: String(data.get("password") ?? "") });
    if (response.error) {
      setError(response.error.message ?? "The account could not be deleted.");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <section className="danger-zone">
      <div><h2>Delete parent account</h2><p>This permanently deletes the account, every child profile, and all cloud-saved practice history.</p></div>
      {!open ? <button className="button button-danger" onClick={() => setOpen(true)}>Delete account…</button> : (
        <form onSubmit={remove}>
          <label>Current password<input name="password" type="password" autoComplete="current-password" required /></label>
          <label>Type DELETE to confirm<input name="confirm" autoComplete="off" required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions"><button className="button button-danger" disabled={busy}>{busy ? "Deleting…" : "Permanently delete"}</button><button className="button button-quiet" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      )}
    </section>
  );
}
