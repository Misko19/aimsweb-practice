Reviewed by Claude Opus 4.8 at high effort on 2026-07-20.

- PR: #3
- Branch: `agent/catalog-accessibility-hardening`
- Reviewed commit: `474c175bfe263ee375ba07e46bbcdbb89186a2cb`
- Merge base: `c0ec16ebe34e8842a952b289c98eef2bc109b177`
- Verdict: **UPVOTE**

## Triage and resolution

All seven P2 findings were confirmed and resolved before merge:

- F1: writing prompts now use injected randomness, remain stable during a session, and rotate on replay.
- F2: RC–PM and M–CAP now have distinct original generators instead of aliasing RC and Concepts & Applications.
- F3: speech synthesis now stops when a session finishes.
- F4: session duration is clamped to the server's 3,600-second limit, with a long-session regression test.
- F5: visible clocks now use the semantic `timer` role.
- F6: the writing count is exposed through `aria-describedby` without chatty live announcements.
- F7: each axe route is an independent test, and question/writing routes enter the active activity before analysis.

The noted coverage gaps were also addressed: generator validity runs for every supported grade, word-count validation and tracked API persistence are tested, and the speech assertion now tests behavior rather than an exact call count.

---

# PR #3 review - Complete catalog and accessibility hardening

## Summary

The diff adds three catalog entries (`reading-comprehension-progress`, `reading-maze`, `written-expression`, plus `math-cap`), introduces a third practice mode (`writing`) end-to-end (component → localStorage → `attemptInput` → API `expectedKind` → Drizzle enum → `ProgressHistory`), expands every thin item pool flagged in the PR #1 review, auto-ends the oral-reading clock at 60s, cancels speech on unmount, darkens two color tokens, and adds an axe-based Playwright audit plus a writing E2E flow.

The `word-count` plumbing is complete and consistent across all five layers — I checked each one, and there is no missing hop. The DB change is safe: `drizzle/0000_petite_franklin_storm.sql:32` declares `kind` as bare `text NOT NULL` with no `CHECK` constraint, so widening the Drizzle `enum` at `lib/db/schema.ts:53` is a type-level change only and needs no migration. No security issues found: no new input reaches SQL, shell, or the filesystem; `app/api/attempts/route.ts:23` correctly tightens rather than loosens the kind/mode pairing; ownership checks at `app/practice/[slug]/page.tsx:20-29` are untouched.

I found no P0 or P1 defects. The findings below are all P2: they concern content integrity in the new catalog entries, two accessibility patterns the new axe test cannot reach, and a data-loss edge in tracked writing attempts.

## Merge verdict

**UPVOTE**

Nothing here is broken, unsafe, or a regression for existing callers. The mode plumbing is complete, the item-pool expansion directly addresses a prior review finding, and the color changes are real contrast improvements (`--coral` #ff806f→#c94f43 on white text at `app/globals.css:158` goes from ~2.6:1 to ~5.0:1; `--green` #2d8a63→#1f6a4c as text on white at lines 88/263 goes to ~6.4:1). The P2 findings are worth follow-up commits but do not warrant blocking: the most consequential (F1, F2) are content-quality issues in newly added activities, not failures in existing ones.

## Findings

### F1 — `writingPromptForGrade` is a pure function of grade, so "Practice again" never changes the prompt and one authored prompt is unreachable

**Severity: P2 · Confidence: high**
`lib/practice.ts:125-133`, used at `components/PracticeSession.tsx:205`

`return prompts[numeric % prompts.length]` makes the prompt fully determined by grade. `begin()` (`components/PracticeSession.tsx:61-76`) regenerates `items` on every replay, but the writing panel does not read `items` — it calls `writingPromptForGrade(grade)` during render.

Failure scenario: a 2nd grader completes Written Expression, clicks "Practice again" (`components/PracticeSession.tsx:192`), and is handed the identical prompt — "Imagine you found a tiny door. What happens next?" — on every attempt, forever. Separately, `written-expression` is declared `grades: range(1, 12)` (`lib/assessments.ts:215`), so `numeric` is never 0 for this activity and the early-band prompt at index 0, "Describe a place where you like to learn.", is dead content that no user can ever reach.

Suggested fix: give the function an `rng: Rng = Math.random` parameter and use the existing `pick(prompts, rng)` helper (`lib/practice.ts:21`), then hold the chosen prompt in state seeded in `begin()` so it is stable within a session but varies across replays.

### F2 — Two new catalog entries are exact aliases of existing generators, producing identical items under different names

**Severity: P2 · Confidence: high**
`lib/practice.ts:198` (`slug === "concepts-applications" || slug === "math-cap"`), `lib/practice.ts:276` (`silent-reading-fluency || reading-comprehension || reading-comprehension-progress`)

`math-cap` (`lib/assessments.ts:311-321`, grades 2–12) shares its entire branch with `concepts-applications` (grades = all). `reading-comprehension-progress` (`lib/assessments.ts:188-196`, grades 2–5) shares its branch, its `passages[level]` context, and its `comprehensionQuestions[level]` pool with `reading-comprehension` (grades 2–12). For any overlapping grade the two activities are indistinguishable in content.

Failure scenario: a 3rd grader's parent sees "Reading Comprehension" and "Reading Comprehension Progress Monitoring" listed as separate activities on the grade picker. Both draw from the same 8-question early pool over the same Maya passage. The child does the first activity, memorizes all 8 answers, then does the second and scores 8/8. `ProgressHistory` records them as two separate series, and the dashboard shows an apparent jump in mastery that is pure recall of the same items. The README claim of a "27-activity catalog" (`README.md:9`) and the test assertion `expect(ASSESSMENTS).toHaveLength(27)` (`lib/assessments.test.ts:7`) both count these as distinct.

Suggested fix: either give the aliases their own item pools (M–CAP is meant to be mixed computation *and* applied problems; RC–PM is meant to be shorter passages on a clock), or drop the duplicate slugs and keep the catalog at 25.

### F3 — Speech is cancelled on unmount and on `begin()`, but not on transition to the result stage

**Severity: P2 · Confidence: high**
`components/PracticeSession.tsx:99-126` (`finish`), vs. the new cancels at lines 58 and 63

`finish()` sets `setStage("result")` without touching `window.speechSynthesis`. The component is not unmounted by a stage change, so the unmount cleanup at line 58 does not run.

Failure scenario: a child on the final Listening Comprehension question clicks 🔊 Listen (line 242), which speaks `passages.early.text` — the full ~60-word Window Garden passage, roughly 25 seconds of audio (`lib/practice.ts:270`). They already know the answer, select a choice, and click "Check answer". 700ms later `submitAnswer` calls `finish` (line 94) and the celebration screen renders while the passage continues reading aloud over it. There is no visible control to stop it; only "Practice again" (which calls `begin()` → `cancel()`) or leaving the page silences it.

Suggested fix: add `if ("speechSynthesis" in window) window.speechSynthesis.cancel();` at the top of `finish()`, alongside the existing `begin()` cancel.

### F4 — Long writing sessions silently fail to sync for tracked children

**Severity: P2 · Confidence: medium-high**
`components/PracticeSession.tsx:113` vs. `lib/validation.ts:28`

`durationSeconds: Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000))` is unbounded, while `attemptInput` enforces `z.number().int().positive().max(3_600)`. The writing panel (`components/PracticeSession.tsx:199-211`) has no clock enforcement at all — unlike oral reading, which the PR just capped at 60s (line 47) — despite the intro copy promising "write for up to three minutes" (line 165).

Failure scenario: a child with a parent-linked profile opens Written Expression, writes two sentences, wanders off for lunch, comes back 90 minutes later and clicks "Finish writing". `durationSeconds` is ~5400. The POST to `/api/attempts` is rejected 400 by Zod, `syncAttempt` falls to `setSaveStatus("error")` (line 149), and the attempt exists only in this browser's localStorage. The parent's dashboard never shows it. The child sees "Cloud save failed" with no way to retry.

Suggested fix: clamp at the source — `Math.min(3_600, Math.max(1, ...))` — and consider an explicit 3-minute soft cap for `mode === "writing"` mirroring the new oral-reading behavior at line 47.

### F5 — The new writing panel adds an `aria-label` on a role-less `<span>`, which axe flags as a WCAG 2.0 A violation

**Severity: P2 · Confidence: medium-high**
`components/PracticeSession.tsx:203`

`<span aria-label={elapsed + " seconds elapsed"}>{Math.floor(elapsed / 60)}:{...}</span>` places `aria-label` on an element with an implicit `generic` role. axe-core's `aria-prohibited-attr` rule (tagged `wcag2a`, `wcag412` — inside the tag set the new test selects at `tests/e2e/accessibility.spec.ts:8`) flags exactly this: the accessible name is not guaranteed to be exposed and is dropped by several AT/browser combinations.

Failure scenario: a screen-reader user on the writing screen encounters the timer and hears "zero colon four seven" as raw characters rather than "47 seconds elapsed", because the label on a generic element was ignored. More pointedly for a PR titled "accessibility hardening": this pattern already exists at line 219 for oral reading, and the newly added axe test never reaches either instance (see test-gap notes), so the audit passes while shipping the violation.

Suggested fix: `<span role="timer" aria-label={...}>` or move the text into a visually-hidden span and mark the digits `aria-hidden="true"`.

### F6 — The live word counter re-announces on every word typed

**Severity: P2 · Confidence: medium**
`components/PracticeSession.tsx:208`

`<p aria-live="polite">{words} {words === 1 ? "word" : "words"} written</p>` sits in the same panel as the textarea and updates whenever the count changes.

Failure scenario: a screen-reader user composing a 100-word response triggers ~100 polite announcements. Because polite announcements queue rather than replace, the reader falls progressively further behind, interleaving "fourteen words written", "fifteen words written" with the typing echo of the characters actually being entered — the counter becomes actively obstructive to the task it is meant to support.

Suggested fix: drop `aria-live` and expose the count via `aria-describedby` on the textarea (read once on focus), or move the announcement behind `onBlur`/a debounce so it fires at most every few seconds.

### F7 — The axe audit packs seven dev-server route loads into one test at the default 30s timeout

**Severity: P2 · Confidence: medium**
`tests/e2e/accessibility.spec.ts:5-10`

The Playwright `webServer` runs `npm run dev` (`playwright.config.ts:15`), so each of the seven routes pays a first-hit Next.js on-demand compile — commonly 3–10s each in CI — before `AxeBuilder.analyze()` adds another 1–3s. The loop runs inside a single `test()` with Playwright's default 30s timeout.

Failure scenario: on a cold CI runner the test times out partway through `/parent/signup`, reporting a timeout rather than an accessibility result. With `retries: 2` in CI (`playwright.config.ts:5`) this burns three full runs. Additionally, because all seven routes share one test, the first genuine violation aborts the loop and the remaining routes are never audited — a regression on `/privacy` masks any regression on the two practice routes.

Suggested fix: `for (const route of routes) test(\`${route} has no WCAG violations\`, ...)` so routes are independent and parallelizable, or at minimum `test.setTimeout(120_000)`.

## Test-gap notes

**The accessibility audit never reaches any new UI.** `tests/e2e/accessibility.spec.ts:6` visits `/practice/vocabulary?grade=2` and `/practice/written-expression?grade=2` but never clicks "Let's go". Both stop at the `stage === "intro"` branch (`components/PracticeSession.tsx:155-173`), which is identical markup for every activity. The textarea, the `aria-live` counter, the `aria-label` timer span, the choice grid with `aria-pressed`, the `role="status"` feedback banner, and the result panel are all unaudited — which is why F5 and F6 pass CI. Adding a `.click()` on "Let's go" before `analyze()` for one questions activity and one writing activity would make this test meaningful. The same gap means the `--coral`/`--green` contrast fixes are only incidentally covered: `--coral` is used exclusively on `.planet` (`app/globals.css:158`), a hero decoration, so `/` covers it, but `--green` at line 263 is `.feedback`, which only renders mid-question.

**Generator validity is now well covered, with one blind spot.** `lib/practice.test.ts:14-27` correctly raises the bar to ≥5 unique items from a request of 8 across every `mode === "questions"` entry, and the uniqueness key at `lib/practice.ts:292` includes `context`, so `letter-naming` and `nonsense-word-fluency` are genuinely exercised. But the test only ever uses `assessment.grades[0]`. For `math-cap` and `concepts-applications` the branch at `lib/practice.ts:203` computes `groups = 2 + floor(rng * min(8, Number(grade) || 2))`, so pool size scales with grade — grade 2 yields only 2 distinct `groups` values. Nothing tests the *last* grade of each activity, where `levelForGrade` selects a different pool entirely. A loop over `assessment.grades` rather than `grades[0]` would be strictly better and cheap.

**Writing persistence is tested at the boundary but not past it.** `components/PracticeSession.hardening.test.tsx:47-55` asserts `saved[0].kind === "word-count"` in localStorage, and `tests/e2e/writing-practice.spec.ts:12` repeats it. Neither covers the `childId` path: no test asserts that a writing attempt POSTs `kind: "word-count"` and is accepted by the new `expectedKind` branch at `app/api/attempts/route.ts:23`. Given that `lib/validation.test.ts:22` only exercises `kind: "accuracy"`, the entire server-side acceptance of `word-count` — the change most likely to be silently wrong — has zero coverage. A `lib/validation.test.ts` case for `word-count` plus a route test for the mismatch rejection (writing activity + `kind: "accuracy"` → 400) would close this.

**The 60-second timer test is correct but tests only the happy path.** `components/PracticeSession.hardening.test.tsx:19-25` works — `vi.useFakeTimers()` fakes `Date` by default, and `startedAt.current` is captured inside `begin()` after the fake clock is installed, so the arithmetic at `components/PracticeSession.tsx:45` is consistent. Untested: that the auto-end does *not* clobber a count the child already entered before 60s, and that the interval is actually torn down on transition to `result` (the `return` at line 43 combined with the cleanup at line 49 handles it, but nothing asserts it).

**The speech-cancel test over-constrains.** `components/PracticeSession.hardening.test.tsx:32` asserts `toHaveBeenCalledTimes(2)`, coupling the assertion to the fact that `begin()` also cancels. It will break on any unrelated added cancel — including the one F3 recommends. `expect(cancelSpeech).toHaveBeenCalled()` after clearing the mock immediately before `unmount()` expresses the actual intent.

## What looks good

- **The `word-count` mode is plumbed completely.** I traced all five layers — component union (`components/PracticeSession.tsx:20`), Zod enum (`lib/validation.ts:29`), API `expectedKind` (`app/api/attempts/route.ts:23`), Drizzle enum (`lib/db/schema.ts:53`), and display (`components/ProgressHistory.tsx:24-28`) — and there is no missing hop. The extraction of `formatResult` out of the JSX is the right call, since the old inline ternary would have silently rendered a writing attempt as "N words read accurately".
- **No migration needed, and correctly so.** The `kind` column is plain `text NOT NULL` in `drizzle/0000_petite_franklin_storm.sql:32`; the Drizzle `enum` is a TypeScript-only refinement. Widening it does not require a schema change, and the PR correctly did not fabricate one.
- **`expectedKind` tightens rather than loosens.** The nested ternary at `app/api/attempts/route.ts:23` means a writing activity now *rejects* `kind: "accuracy"`, which previously would have been the expected value. Existing callers for `questions` and `oral-reading` modes are byte-identical in behavior.
- **The item-pool expansion directly closes a documented prior finding.** `docs/pr-1-practice-foundation-review.md:131` called out `print-concepts` (2 items), `phoneme-segmentation` (5), and `word-reading-fluency` (3) producing sessions that "are not practice after the first item". All three are now at 8, and the shared `comprehensionQuestions` record replaces the previous single hardcoded Q&A per level — the same passage now supports 8 distinct questions instead of 1.
- **The `number-comparison-pairs` fix is correct.** The old `values = a === b ? [a, b + 1] : [a, b]` put the answer in a position correlated with `a`/`b` ordering; the new independent draws plus `shuffle` (`lib/practice.ts:174-181`) genuinely randomize position, and the collision fallback `first === limit ? first - 1 : first + 1` provably stays within `[1, limit]` for every `numberLimit` value (min 5). The accompanying test at `lib/practice.test.ts:33-38` asserts the right property.
- **Color token changes are real fixes, not cosmetic churn.** Both tokens are used as foreground-vs-white or white-text-on-background pairs, and both moved from failing to passing 4.5:1.
- **The E2E writing flow asserts the right things.** `tests/e2e/writing-practice.spec.ts` checks the live counter, the result copy, *and* the persisted `kind` — and the expected count of 12 matches the fixture string exactly.

