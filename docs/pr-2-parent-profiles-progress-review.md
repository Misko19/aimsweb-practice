# External review metadata

- Reviewer: Claude Opus 4.8, high effort
- Date: 2026-07-20
- Pull request: #2
- Branch: `agent/parent-profiles-progress`
- Reviewed commit: `e3b0a3b7f091866d4e3e6bab097c1a9c955d3541`
- Merge base: `0dd765d9c7e8737611dbc17de011e1cd7ac46650`

# PR #2 review - Add parent profiles and progress tracking

## Summary

This PR adds parent accounts (Better Auth + email/password), nickname-only child profiles, SQLite/Drizzle persistence, server-side attempt sync, a parent dashboard with progress history, JSON export, and account/profile deletion. The authorization model is sound: every custom route resolves the caller through `getCurrentSession()` and scopes each query by `parentUserId`, all SQL goes through parameterized Drizzle builders, and the migration declares `ON DELETE cascade` for all three new tables. The e2e tenant-isolation spec is a genuinely good addition.

The blocking problems are not authorization but correctness in the primary "practice as a child" flow: a strict server-side grade equality check makes attempts silently fail to save whenever the parent touches the grade picker, and privacy consent is recorded in a non-atomic client-driven second request that can be lost or bypassed entirely. There are also several hot-path/unbounded-growth issues on the dashboard and export paths.

## Merge verdict

DOWNVOTE

Two P1s land in the feature's core promise: signed-in practice silently reverts to local-only saving in a reachable UI path (F1), and the privacy-acceptance record — the compliance artifact this product advertises — is written by a best-effort client fetch that can be lost or skipped (F2). Both are small, contained fixes; I'd re-review quickly.

## Findings

### F1 (P1, high confidence) — Attempts silently fail to save when the practice grade differs from the child's profile grade

`app/api/attempts/route.ts:24` rejects any attempt whose `grade` does not exactly equal the child profile's stored grade. But the grade travelling to that route comes from the URL, and the home page lets the parent change it while keeping `childId`:

- `components/ParentDashboard.tsx:90` links to `/?grade=${child.grade}&child=${child.id}`.
- `components/HomePage.tsx:63` / `:17` let the parent click any grade chip, which only updates `grade` state.
- `components/HomePage.tsx:97` then builds `/practice/${slug}?grade=${grade}&child=${childId}` — new grade, same child.
- `app/practice/[slug]/page.tsx:12,23` pass that grade and childId straight into `PracticeSession`.

**Failure scenario:** Parent clicks "Practice as Sunny" (grade 2), lands on the home page, uses the prominent "Step 1 — Choose a grade" chips to pick grade 3 (entirely reasonable: trying a harder activity, or the activity they want isn't offered for grade 2), completes the session. `POST /api/attempts` returns 400 "Attempt grade does not match the child profile." `components/PracticeSession.tsx:133` sets `saveStatus = "error"`, and the child sees only "Cloud save failed; the result is still on this device." (`:172`). Nothing appears on the dashboard, and no error names the actual cause. Every session at an off-profile grade is lost.

**Suggested fix:** Drop the equality check at `app/api/attempts/route.ts:24` and persist `parsed.data.grade` as the grade the attempt was practiced at — it is already validated against `assessment.grades` at `:15`, which is the check that actually matters. If the profile grade must constrain practice, enforce it in the UI instead (lock/disable the grade picker when `childId` is present, per `components/HomePage.tsx:17-20`).

---

### F2 (P1, high confidence) — Privacy consent is recorded by a best-effort client request and is not enforced server-side

`components/AuthForm.tsx:23-33` creates the account first, then issues a separate `POST /api/parent/consent`. The consent checkbox at `:49` is enforced only by the HTML `required` attribute. `app/api/parent/consent/route.ts:6-8` accepts any authenticated caller and takes no body.

**Failure scenario A (lost record):** Parent signs up successfully; the follow-up consent fetch fails on a flaky mobile connection. Line 32 throws, the catch at `:36` shows an error, and `router.push("/parent/dashboard")` never runs — but the account exists and the session cookie is already set. The parent navigates to `/parent/dashboard` (or just reloads), creates child profiles, and stores children's practice data with **no** `parent_settings` row. Nothing in the app retries or blocks: `app/parent/dashboard/page.tsx` never checks consent, and `app/api/children/route.ts:15-27` and `app/api/attempts/route.ts:9` do not either. `GET /api/parent/export` then returns `settings: undefined` (`app/api/parent/export/route.ts:11,15`) for an account holding a child's data.

**Failure scenario B (bypass):** `POST /api/auth/sign-up/email` directly against `app/api/auth/[...all]/route.ts` creates a fully functional account that never sees the checkbox at all.

**Suggested fix:** Write the `parent_settings` row atomically with user creation via a Better Auth `databaseHooks.user.create.after` hook in `lib/auth.ts`, rather than from the client. If per-request consent versioning is needed, have `/api/parent/consent` accept and validate an explicit version rather than hardcoding `"2026-07-20"` in two places (`app/api/parent/consent/route.ts:13,19`), and gate `POST /api/children` on a present, current `parent_settings` row.

---

### F3 (P2, high confidence) — Dashboard loads every attempt ever recorded on each render

`app/parent/dashboard/page.tsx:17-22` selects *all* `practice_attempt` rows for the parent with no `LIMIT`, then `:24` runs an O(children × attempts) `Array.filter` per child, and `:38` throws away everything past the first 50. Because `better-sqlite3` is a synchronous driver (`lib/db/index.ts:6`), this runs on the Node event loop and blocks it.

**Failure scenario:** A family practicing daily across 4 children accumulates tens of thousands of rows over a year (and nothing caps this — see F4). Every dashboard view materializes all of them into JS objects, sorts them, and discards 99% — stalling the single-threaded server for every other concurrent request during that window.

**Suggested fix:** Two queries: `.limit(50)` on the history query (the composite index `attempt_child_completed_idx` already supports the ordering), plus a `GROUP BY child_profile_id` aggregate for the per-child `attempts` count and latest result.

---

### F4 (P2, high confidence) — Unbounded attempt growth; no rate limiting on the custom routes

`app/api/children/route.ts:21-22` caps profiles at 12, but `app/api/attempts/route.ts` has no equivalent cap or throttle. Better Auth's built-in rate limiting only covers `/api/auth/*`, not these handlers.

**Failure scenario:** Any registered parent (self-service signup, no email verification — `lib/auth.ts:11-14`) loops `POST /api/attempts` with a fresh `clientAttemptId` each time. The unique index at `lib/db/schema.ts:59` deduplicates replays but not distinct IDs. The SQLite file grows without limit on a single-file, single-disk deployment, and each write blocks the event loop. `GET /api/parent/export` (`app/api/parent/export/route.ts:15`) then serializes the entire result set into one in-memory string with 2-space indentation, which will OOM the process well before the disk fills.

**Suggested fix:** Rate-limit `/api/attempts` (per session, e.g. a few per minute), cap retained attempts per child, and stream or paginate the export rather than `JSON.stringify(..., null, 2)` on the full set.

---

### F5 (P2, high confidence) — Dates are formatted with the server's locale and timezone

`app/parent/dashboard/page.tsx:33` and `:46` call `completedAt.toLocaleDateString()` in a server component, so the output reflects the server's `TZ` and `LANG`, not the parent's.

**Failure scenario:** Server runs UTC (the default nearly everywhere). A parent in `America/Los_Angeles` finishes practice at 6:30 pm on July 19 → stored as `2026-07-20T01:30Z` → dashboard shows "7/20/2026". Every evening session is attributed to the next day, making the streak/recency display wrong. Separately, a container without an explicit locale renders `7/20/2026` vs `20/07/2026` depending on host config.

**Suggested fix:** Pass ISO strings to `ProgressHistory` / `ParentDashboard` and format in a client component (or render `<time dateTime={iso}>` and format on mount) so the browser's timezone and locale apply.

---

### F6 (P2, high confidence) — `changeGrade` drops `child` from the URL, and the "Guest mode" pill lies while data is being saved

`components/HomePage.tsx:19` rewrites the URL to `/?grade=${next}` unconditionally, discarding the `child` query param that `app/page.tsx:7` reads to derive `childId`.

**Failure scenario:** Parent opens `/?grade=2&child=abc`, changes the grade, then refreshes (or bookmarks/shares the link, or hits back later). `searchParams.child` is now absent, `childId` is `undefined`, and `components/PracticeSession.tsx:112` skips `syncAttempt` entirely — results are stored only in `localStorage` (`:104-109`) with no visible indication that the "practice as Sunny" context was lost.

Relatedly, `components/HomePage.tsx:27` renders the `Guest mode` pill unconditionally, so during signed-in child practice the UI displays "Guest mode" and "Guest practice stays on this device" (`:37`) while attempts are in fact being persisted server-side. In a privacy-first product this indicator being wrong is more than cosmetic.

**Suggested fix:** Preserve `child` in the `replaceState` URL, and make the pill/privacy-note conditional on `childId`.

---

### F7 (P2, medium confidence) — Child-profile cap is a check-then-insert race

`app/api/children/route.ts:21-26` counts existing profiles and then inserts in a separate statement, with no transaction.

**Failure scenario:** A parent with 11 profiles double-submits the form (double click, or the dashboard is open in two tabs). Both requests read `count = 11`, both pass the `>= 12` guard, both insert → 13 profiles, silently exceeding the documented limit. Low impact today, but the same pattern will be wrong if the cap ever backs a billing or storage guarantee.

**Suggested fix:** Wrap the count and insert in `db.transaction(...)`; `better-sqlite3` transactions are synchronous and make this trivially atomic.

---

### F8 (P2, medium confidence) — Client-supplied `completedAt` is unbounded and drives ordering

`lib/validation.ts:21` validates only that `completedAt` is an ISO datetime — any value from 1970 to 9999 is accepted and stored verbatim (`app/api/attempts/route.ts:30`). `app/parent/dashboard/page.tsx:21` orders by `desc(completedAt)`, and `:26-33` takes `history[0]` as "Latest"/"Last practice".

**Failure scenario:** A kid's tablet with a wrong clock (common — a dead battery resets to a manufacturer default, or the child changes it) reports `2031-04-01`. That attempt sorts permanently to the top of "Recent practice" and pins the child card's "Latest" score forever, so genuinely recent sessions never surface.

**Suggested fix:** Reject `completedAt` outside a sane window relative to server time (e.g. more than 24h in the future or 30 days in the past), or order the dashboard by the server-generated `createdAt` (`lib/db/schema.ts:54`) while still displaying `completedAt`.

---

### F9 (P2, medium confidence) — Module-scope database handle is opened at import time and never closed

`lib/db/index.ts:6-8` opens the `Database` as an import side effect at module scope with no singleton guard.

**Failure scenario:** Under `next dev`, the server module graph is re-evaluated on HMR. Each reload constructs a new `better-sqlite3` handle while the previous one is never `close()`d, leaking a file descriptor and a WAL reader per reload; a long editing session exhausts the process fd limit. The same import-time side effect also creates an empty `data/brightpath.db` during `next build`, since route modules importing `@/lib/db` are evaluated at build time.

**Suggested fix:** Use the standard `globalThis` singleton guard for the connection in dev, as is conventional for long-lived DB handles in Next.js.

---

### F10 (P2, medium confidence) — `scripts/build.mjs` synthesizes a random secret, defeating Better Auth's production guard at the only point it would fire

`scripts/build.mjs:10` injects `randomBytes(32)` as `BETTER_AUTH_SECRET` when the variable is absent. Better Auth throws on a missing/default secret in production (`node_modules/better-auth/dist/context/create-context.mjs:41-42`), and module evaluation during `next build` is where that guard would otherwise surface a misconfiguration.

**Failure scenario:** A CI pipeline with no `BETTER_AUTH_SECRET` configured runs `npm run build` → green. Deploy runs `next start` → `lib/auth.ts` throws on first request, and every route 500s in production. The failure moves from build time to post-deploy.

**Suggested fix:** Fail the build when `BETTER_AUTH_SECRET` is absent and `NODE_ENV === "production"`; keep the random fallback for local/dev builds only.

## Test-gap notes

- **Account-deletion cascade is untested.** `tests/e2e/parent-progress.spec.ts:47-51` deletes the account and asserts only a redirect to `/`. The removal of `child_profile` and `practice_attempt` rows depends entirely on `sqlite.pragma("foreign_keys = ON")` at `lib/db/index.ts:8` — a per-connection, easily-dropped setting. If that line is ever removed or the DB is opened elsewhere without it, children's practice data silently survives account deletion, which directly contradicts the copy in `components/AccountDeletion.tsx:33`. Add an assertion (or an integration test) that the rows are actually gone.
- **No test for duplicate-attempt replay.** `app/api/attempts/route.ts:33-35` uses `onConflictDoNothing` against the composite unique index `attempt_parent_client_unique`. Composite conflict targets are easy to get wrong (a mismatch between the `target` columns and the index silently degrades to an unhandled constraint error). Post the same `clientAttemptId` twice and assert 200 plus exactly one row.
- **No test for the grade/kind mismatch rejections** at `app/api/attempts/route.ts:15,17,24` — the very checks that produce F1. A test asserting the intended behavior here would have forced the question of whether a 400 is right.
- **No test for the 12-profile cap** (`app/api/children/route.ts:22`) or for `DELETE` without an `id` (`:34`).
- **No test for the consent path.** Neither the success case (`parent_settings` row written after signup) nor the failure case in `components/AuthForm.tsx:31-32` is covered; `lib/validation.test.ts` covers only Zod schemas.
- **Both new e2e specs `test.skip` on non-chromium** (`tests/e2e/parent-progress.spec.ts:4`, `tests/e2e/tenant-isolation.spec.ts:13`), yet `README.md` now instructs running `--project=chromium --project=mobile`. The mobile project adds no coverage for any of this PR's behavior.

## What looks good

- Authorization is consistently correct: `app/api/children/route.ts:11,21,35`, `app/api/attempts/route.ts:19-22`, `app/api/parent/export/route.ts:11-13`, and `app/parent/dashboard/page.tsx:16,19` all constrain by `session.user.id`. The `DELETE` at `app/api/children/route.ts:35` correctly folds the ownership predicate into the delete rather than doing a read-then-delete, and returns 404 (not 403) for another tenant's ID — no existence oracle.
- `tests/e2e/tenant-isolation.spec.ts` explicitly tests cross-account access with two browser contexts and asserts the victim's profile survives. This is the right test to have written.
- The schema is well-indexed for the access patterns it has: `attempt_child_completed_idx` matches the dashboard's ordering and `attempt_parent_client_unique` gives idempotent attempt sync a real database-level guarantee rather than an application-level one.
- Data minimization is genuine, not just claimed: no child email/password, nickname capped at 30 chars (`lib/validation.ts:7`), avatars constrained to a 4-value enum in both Zod and the SQLite column (`lib/db/schema.ts:29`), and the export deliberately returns only `session.user.email` rather than the whole user row (`app/api/parent/export/route.ts:15`) — no password hash leakage.
- `components/PracticeSession.tsx` handles the local/remote split carefully: the `submitLocked` ref guards double-submit, the feedback timeout is cleared on unmount (`:51-53`), `localStorage` failures are caught so practice still works (`:104-109`), and a failed cloud sync degrades to the local result instead of losing it.
- `scripts/build.mjs` uses `process.execPath` with a resolved JS entry point instead of a shell string, which is the correct cross-platform way to spawn a local bin.

## Triage

- **F1 — CONFIRM.** A tracked child could select a different grade while the API correctly enforced the profile grade. The tracked-profile UI now locks the grade selector and chips, explains why, and has browser coverage for that constraint.
- **F2 — CONFIRM.** Consent was not enforced after a failed or bypassed client request. Child creation and attempt saving now require the current server-side acceptance record, the consent request validates an explicit current version and timezone, and a dedicated recovery page gates the dashboard. The suggested auto-accept hook was not used because creating an acceptance record for a direct API signup would falsely record consent.
- **F3 — CONFIRM.** The dashboard no longer loads all attempts. It uses a grouped count query, a window query for one latest attempt per child, and a server-ordered recent-history query capped at 50.
- **F4 — CONFIRM.** Attempt saves are limited to 30 per minute per parent in this single-node SQLite deployment, and storage is bounded to the latest 1,000 attempts per child. The retention rule is disclosed in the privacy notice, which bounds export size as well.
- **F5 — CONFIRM.** The accepted IANA timezone is stored with parent settings and all dashboard dates are formatted in that timezone with an explicit locale.
- **F6 — CONFIRM.** Tracked practice now shows “Profile tracking” and accurate cloud/local copy. Its grade is locked, so it cannot rewrite the tracked URL into a misleading off-profile state.
- **F7 — CONFIRM.** The profile count and insert now execute in one synchronous SQLite transaction, preventing concurrent requests from exceeding the 12-profile cap.
- **F8 — CONFIRM.** Attempt timestamps are rejected beyond 24 hours in the future or 30 days in the past, and “latest” ordering now uses the server-generated creation time.
- **F9 — CONFIRM.** The SQLite connection is guarded on `globalThis` during development so hot reload reuses one handle.
- **F10 — CONFIRM.** The build wrapper no longer synthesizes a secret. It loads local Next environment files and exits nonzero unless a non-placeholder 32+ character secret and canonical URL are configured.

The deletion-cascade, duplicate-attempt replay, consent-bypass recovery, and tracked-grade test gaps were also closed. The remaining 12-profile/missing-id edge assertions are lower-level coverage opportunities rather than unresolved merge blockers.
