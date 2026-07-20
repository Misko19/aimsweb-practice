# External follow-up review metadata

- Reviewer: Claude Opus 4.8, high effort
- Date: 2026-07-20
- Pull request: #2
- Branch: `agent/parent-profiles-progress`
- Reviewed commit: `2034b80`
- Merge base: `0dd765d9c7e8737611dbc17de011e1cd7ac46650`

# PR #2 follow-up review - Add parent profiles and progress tracking

## Summary

All ten findings from the initial review are genuinely addressed in `2034b80`, not merely claimed. I verified each against the code:

- **F1** — `components/HomePage.tsx:56,64` disable the grade `<select>` and chips when `childId` is present, `changeGrade` early-returns at `:18`, and `tests/e2e/parent-progress.spec.ts:26` asserts the disabled state. The server check at `app/api/attempts/route.ts:31` remains, so the mismatch is now unreachable through the normal UI (see F11 for the residual path).
- **F2** — `lib/consent.ts:7-10` is a real server-side gate, enforced at `app/api/children/route.ts:20`, `app/api/attempts/route.ts:16`, and `app/parent/dashboard/page.tsx:17-18`. `lib/validation.ts:7-13` validates an explicit `privacyVersion` literal and an `Intl`-checked timezone. `tests/e2e/consent-gate.spec.ts` covers the direct-API-signup bypass end to end (403, redirect to `/parent/consent`, recovery). The decision not to auto-write consent in a Better Auth hook is correct and better than my original suggestion.
- **F3** — `app/parent/dashboard/page.tsx:21-37` is now three bounded queries (grouped count, `row_number()` window for one latest row per child, `.limit(50)` history). No unbounded materialization remains.
- **F4** — `lib/rate-limit.ts` + `app/api/attempts/route.ts:17` (30/min) and `app/api/children/route.ts:21` (20/hr); retention capped at 1,000 attempts/child (`:11,40-47`) and disclosed in `app/privacy/page.tsx:27`.
- **F5** — `parent_settings.timezone` (`lib/db/schema.ts:16`, migration `0001`) drives `formatDate` at `app/parent/dashboard/page.tsx:69-71` with an explicit locale.
- **F6** — pill/copy are conditional (`components/HomePage.tsx:28,37,38`); `child` is preserved in activity links at `:99`.
- **F7** — `app/api/children/route.ts:26-33` wraps count+insert in a synchronous `db.transaction`.
- **F8** — `app/api/attempts/route.ts:33-37` enforces the ±window; ordering moved to `createdAt`.
- **F9** — `lib/db/index.ts:6-8` uses the `globalThis` guard.
- **F10** — `scripts/build.mjs:6-14` fails closed on a missing/placeholder secret and missing URL; no `randomBytes` fallback.

No authorization regressions were introduced. The remaining issues are all P2 and are second-order consequences of the fixes themselves: the ordering key moved to a column no index covers, the rate limiter's pruning crosses window sizes, and every server-side rejection still collapses into one opaque client message.

## Merge verdict

UPVOTE

Every P1 is resolved with server-side enforcement plus browser coverage, and the fixes did not weaken the authorization model. The four findings below are P2 performance/UX issues that do not block merge; F12 (the now-unindexed sort on every write) is the one I'd fix soonest, since it is a one-line migration.

## Findings

### F11 (P2, medium confidence) — All attempt-save rejections collapse into one unactionable message, and two of them are still reachable

`components/PracticeSession.tsx:133` maps every non-2xx response to `saveStatus = "error"`, and `:172` renders exactly one string for it: "Cloud save failed; the result is still on this device." Two distinct server rejections reach that branch:

1. **Grade fallback.** `app/practice/[slug]/page.tsx:12` falls back to `assessment.grades[0]` whenever the `grade` query param is absent or invalid, while still honoring `child` at `:23`. The F1 fix locked the *picker*, but the grade sent to the API still originates in the URL rather than in the child's profile row. A tracked practice link that loses its `grade` param — hand-edited, truncated by a messaging client, or produced by any future entry point that forgets it — sends grade `k` for a grade-2 child, `app/api/attempts/route.ts:31` returns 400, and the completed session is silently local-only.
2. **Consent version bump.** Changing `PRIVACY_VERSION` (`lib/privacy.ts:1`) makes `getCurrentConsent` return `null` for every existing parent, so `app/api/attempts/route.ts:16` returns 403. Children keep practicing and every session shows "Cloud save failed" until the parent independently visits the dashboard and re-accepts. Nothing in the practice UI tells them what to do.

**Failure scenario:** A parent bumps to a new privacy notice on Monday. Their two children each complete four sessions Monday evening. All eight are stored only in `localStorage`; the dashboard shows nothing new, and the only feedback anyone saw was "Cloud save failed."

**Suggested fix:** Resolve the grade from the child profile server-side (the row is already loaded at `app/api/attempts/route.ts:26-29`) rather than trusting `parsed.data.grade`, and have `syncAttempt` branch on `response.status` so 403 renders a "A parent needs to accept the updated privacy notice" message linking to `/parent/consent`.

---

### F12 (P2, high confidence) — The F3/F8 fixes moved every hot query onto `created_at`, for which no index exists

`lib/db/schema.ts:59` still declares `attempt_child_completed_idx` on `(child_profile_id, completed_at)`, but after this commit nothing orders by `completed_at` anymore. All three hot paths order by `created_at`:

- `app/api/attempts/route.ts:45` — retention subquery, `order by created_at desc limit 1000`, on **every** POST.
- `app/parent/dashboard/page.tsx:31` — `row_number() over (partition by child_profile_id order by created_at desc)`.
- `app/parent/dashboard/page.tsx:36` — `where parent_user_id = ? order by created_at desc limit 50`; the closest index is `attempt_parent_child_idx` on `(parent_user_id, child_profile_id)`, which cannot satisfy this ordering.

SQLite therefore builds a transient B-tree sort for each of these. `better-sqlite3` is synchronous (`lib/db/index.ts:7`), so the sort happens on the Node event loop.

**Failure scenario:** A family at the documented ceiling — 12 profiles × 1,000 retained attempts — has 12,000 rows. Every single attempt save sorts up to 1,000 rows to evaluate the retention `NOT IN`, including replays that `onConflictDoNothing` turned into no-ops at `:39`. Every dashboard render sorts up to 12,000 rows twice (window partition + recent list). Under the 30 saves/min limit this is sustained sorting work blocking all other requests on a single-node deployment.

**Suggested fix:** In a new migration, add `(child_profile_id, created_at)` and `(parent_user_id, created_at)` indexes and drop the now-unused `attempt_child_completed_idx`. Optionally skip the retention delete when the insert reported zero changes.

---

### F13 (P2, medium confidence) — `pruneBuckets` evicts buckets belonging to a different rate-limit window

`lib/rate-limit.ts:21-26` prunes using the `windowMs` of whichever call happened to trigger it. Two different windows share the one map: 60 s for `:attempts` (`app/api/attempts/route.ts:17`) and 3,600 s for `:children` (`app/api/children/route.ts:21`).

**Failure scenario:** On an instance with ≥2,000 live buckets, any `/api/attempts` request that starts a fresh bucket calls `pruneBuckets(now, 60_000)` and deletes every `:children` bucket older than 60 seconds. The 20-per-hour profile-creation limit silently becomes 20 per minute — a 60× weakening of the throttle the F4 fix added, reachable by a caller who simply interleaves attempt saves with profile creations.

**Suggested fix:** Store `windowMs` on the `Bucket` record and prune with `now - bucket.startedAt >= bucket.windowMs`.

---

### F14 (P2, high confidence) — The 20/hour child-profile limit can lock a parent out below the documented 12-profile cap

`app/api/children/route.ts:21` counts *creation attempts*, not net profiles, and deletions do not refund. The documented cap is 12 (`:28,34`).

**Failure scenario:** A parent sets up profiles for 6 children on signup day, fixes 8 nickname typos by delete-and-recreate (there is no edit UI — `components/ParentDashboard.tsx` offers only add and delete), then tries to add the remaining 6. Request 21 returns 429 with "Too many profile changes. Please try again later." — no time given in the visible copy, and `router.refresh()` at `:44` never runs, so the form appears simply broken for up to an hour during the exact session where onboarding happens.

**Suggested fix:** Raise the hourly ceiling well above the 12-profile cap (the cap already bounds storage), or key the limit on net profile growth rather than request count.

## Test-gap notes

The deletion-cascade (`tests/e2e/parent-progress.spec.ts:58-66`), duplicate-replay idempotency (`tests/e2e/tenant-isolation.spec.ts:46-49`), consent-bypass recovery (`tests/e2e/consent-gate.spec.ts`), and tracked-grade-lock (`parent-progress.spec.ts:26`) gaps are all genuinely closed, and the cascade test asserting on the actual SQLite rows is exactly the right shape. Remaining gaps, all introduced by this commit's fixes:

- **The 1,000-attempt retention cap is untested.** `app/api/attempts/route.ts:40-47` is hand-written SQL with a `NOT IN (SELECT … LIMIT n)` subquery — the kind of statement that fails silently in the wrong direction (deleting too much). Nothing exercises it. An integration test inserting 1,002 rows and asserting exactly 1,000 survive, oldest-first, would be cheap.
- **The ±24h/30d timestamp window is untested.** `app/api/attempts/route.ts:33-37` is pure server logic with no coverage; `lib/validation.test.ts` only covers the Zod layer, which still accepts any ISO datetime (`lib/validation.ts:30`).
- **No test asserts a 429.** Neither `takeRateLimit` call site is exercised end to end, so a mis-ordered guard (e.g. limiting after the DB write) would not be caught. `lib/rate-limit.test.ts` covers only the pure function, and not `pruneBuckets` — the path F13 lives in.
- **Timezone formatting is untested.** `app/parent/dashboard/page.tsx:69-71` is the entire F5 fix; a test asserting a `2026-07-20T01:30Z` attempt renders as "Jul 19, 2026" for a `America/Los_Angeles` setting would pin the behavior.
- **Still open from the first review:** no test for the 12-profile cap (`app/api/children/route.ts:28`) or `DELETE` without `id` (`:42`).
- **`--project=mobile` still adds no coverage for this PR.** All three new specs `test.skip` off chromium, yet `README.md:27` now instructs running both projects — the mobile run is pure cost.

## What looks good

- The consent design is better than what I suggested. Declining the `databaseHooks.user.create.after` auto-accept and instead gating `POST /api/children`, `POST /api/attempts`, and the dashboard on a *current-version* server record is the honest implementation: a direct API signup gets an account but no ability to store child data, and `tests/e2e/consent-gate.spec.ts` proves it. `lib/validation.ts:9` pinning `privacyVersion` to a `z.literal` means a stale client cannot record consent to a superseded notice.
- `app/parent/dashboard/page.tsx:25-33` uses a window function rather than N per-child queries, and the count/latest/history split means the dashboard's cost no longer scales with history length.
- `app/api/children/route.ts:26-33` correctly uses `better-sqlite3`'s synchronous transaction and returns `null` from the callback rather than throwing to signal the cap — clean and genuinely atomic.
- `scripts/build.mjs:6-14` failing closed with a specific message and nonzero exit, plus the `startsWith("replace-")` placeholder check, moves the misconfiguration back to build time where it belongs. `.env.example` shipping an empty secret is the right default.
- `app/privacy/page.tsx:27` discloses the 1,000-attempt retention rule rather than silently enforcing it, and `:33` is candid that this is a template requiring real COPPA review before deployment — unusually honest for generated privacy copy.
- The authorization model from the first review is fully intact: no route lost its `parentUserId` predicate, `DELETE` still folds ownership into the statement (`app/api/children/route.ts:43`), and the new consent gate was added *before* the body parse and DB work in both routes.

## Triage

- **F11 — CONFIRM.** A tracked practice route now authenticates the parent, loads the owned child profile, and derives the grade from that row even when the URL grade is missing or altered. A 403 save response also renders a direct, actionable link to the current consent notice; throttling has its own message.
- **F12 — CONFIRM.** Migration 0002 replaces the obsolete completed-time indexes with child/created, parent/created, and parent/child/created indexes matching retention, latest-per-child, grouped counts, and recent-history access.
- **F13 — CONFIRM.** Each rate bucket now stores its own window and pruning compares against that value. A unit test creates 2,000 short-window buckets and proves the hour-long profile bucket remains enforced.
- **F14 — CONFIRM.** The profile-creation throttle is raised to 100/hour while the atomic 12-profile cap remains the actual storage bound, allowing delete-and-recreate corrections during onboarding.

The follow-up verdict is **UPVOTE**. Per the review workflow, no additional Claude cycle is required.
