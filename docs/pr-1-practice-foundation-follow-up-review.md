# PR #1 external follow-up review

- Reviewer: Claude Opus 4.8, high effort
- Date: 2026-07-20
- PR: #1 — Add anonymous Pre-K–12 practice foundation
- Branch: feat/practice-foundation
- Reviewed commit: e4d5f07

# PR #1 follow-up review - Add anonymous Pre-K–12 practice foundation

## Summary

I re-verified every confirmed finding from `docs/pr-1-practice-foundation-review.md` against the updated diff (`4dcace4...e4d5f07`) rather than trusting the triage list, and then re-read the whole diff for new defects.

All three P1s are genuinely fixed, and fixed correctly rather than superficially:

- **Enter double-submit** — `submitLocked` is a ref set synchronously at `components/PracticeSession.tsx:64-65` before any state update, so both keydown handlers cannot observe the pre-update value. It is also reset in `begin()` (line 45) and inside the timeout (line 72). Correct.
- **`crypto.randomUUID` secure-context throw** — replaced by `localAttemptId()` (`components/PracticeSession.tsx:191-194`), which feature-detects via `globalThis.crypto?.randomUUID` and falls back. Correct.
- **Dead `/parent` link** — removed; the header now links to `/about` (`components/HomePage.tsx:28`). No `parent` reference remains anywhere in the source.

The P2s are also mostly addressed: the feedback timeout is cleared on unmount (`PracticeSession.tsx:39-41`), oral word counts are validated with a single integer/bounds guard used for both the disabled state and persistence (`PracticeSession.tsx:80`, `PracticeSession.tsx:145`), grade now round-trips through `?grade=` server-side (`app/page.tsx:4-8`) with the unguarded `localStorage` write deleted entirely, `shuffle` is a real seeded Fisher–Yates (`lib/practice.ts:22-29`), `math-facts-one-digit` has its own 0–9 branch (`lib/practice.ts:111-116`), grade 1 `concepts-applications` routes to the additive branch (`lib/practice.ts:128-131`), and the `letter-naming` prompt now matches its answer key (`lib/practice.ts:166`).

What remains are four P2s. Three are pre-existing quality problems that the fixes did not reach, and one — the de-duplication in `generatePracticeItems` — is a *correct* fix whose consequence was not followed through: several activities now produce one- or two-question "sessions" because their fixed content pools are that small, and the new tests were written with an upper bound only (`toBeLessThanOrEqual`), so the collapse is invisible to the suite. Nothing here is a correctness, security, or data-integrity defect.

## Merge verdict

**UPVOTE**

Every P1 is fixed at the root rather than papered over, and the fixes are the ones I would have written. The residual issues are all P2 content/UX quality: short question pools, a positional answer bias in one math activity, speech that outlives the component, and one vacuous test. None corrupts stored data, blocks the primary flow, or introduces a security or concurrency hazard. These are reasonable follow-ups rather than merge blockers, though I would want the one-question sessions addressed before this is put in front of children.

## Findings

### P2: De-duplication silently collapses three activities to a one-question session

**Confidence: high.** `lib/practice.ts:200-216`, `lib/practice.ts:186-188`, `lib/practice.ts:189-196`

`generatePracticeItems` now dedupes on `prompt\0context\0answer` and returns whatever it accumulated when `maxAttempts` runs out. That is the right fix for the eight-identical-items problem, but three builders are fully deterministic given the grade, so their unique pool size is exactly 1:

- `listening-comprehension` (line 187) returns one hard-coded item about Maya and the sprout, unchanged from the previous revision.
- `reading-comprehension` and `silent-reading-fluency` (lines 190-195) select `qa` solely from `level`, so prompt, answer, and context are all constant within a grade band.

`print-concepts` yields 2 (line 145-148), `word-reading-fluency` 3 (line 181), `phoneme-segmentation` and `nonsense-word-fluency` 5, and `vocabulary`/`spelling`/`initial-sounds` 4.

Failure scenario: a 5th grader opens Reading Comprehension. The intro promises "Answer a short set of original practice questions" (`components/PracticeSession.tsx:111`). They get a progress header reading "Question 1 of 1" and a progress bar already at 100% (`PracticeSession.tsx:167-170`), answer once, and land on the result screen showing "1 of 1 correct · 100% practice accuracy". A stored attempt with `total: 1` is written to `brightpath-attempts`, so the history a parent later reviews is a series of one-question 0%/100% swings with no useful signal. The same happens for Listening Comprehension at grades K–2.

Fix: expand the fixed pools — give `listening-comprehension` and each `reading-comprehension`/`silent-reading-fluency` band at least 4–6 questions over the existing passages (the passages easily support more) — and have `generatePracticeItems` cap `count` at the known pool size rather than emitting a session shorter than the UI implies. A related off-by-one is worth folding in here: `Math.floor(rng() * limit)` at `lib/practice.ts:89` means `number-naming` can never show the top number of its grade band (never 5 for Pre-K, never 10 for K).

### P2: `number-comparison-pairs` always puts the greater number first

**Confidence: high.** `lib/practice.ts:106-110`, `lib/practice.ts:89-90`

The shuffle-bias fix (Fisher–Yates at lines 22-29) does not reach this builder, because it never called `shuffle` at all:

```ts
const a = Math.max(1, Math.floor(rng() * limit));
const b = Math.max(1, Math.floor(rng() * Math.min(limit, a + 1)));
...
const values = a === b ? [a, b + 1] : [a, b];
const answer = String(Math.max(...values));
return item(id, "Choose the greater number.", answer, values.map(String));
```

`b` is drawn from `[1, a]`, so `b <= a` always holds. When `a > b` the answer is `a`, which is `values[0]`. Only in the `a === b` case is the answer second.

Failure scenario: a first grader opens "Number Comparison Fluency – Pairs". The correct answer is the left-hand button in roughly 85–95% of items (the exact rate is the complement of `P(a === b)`, which is small for `limit = 20`). A child who reflexively taps the left choice scores near-perfect without comparing anything, which is precisely the practice signal this measure exists to produce. Nothing in the suite catches it: `lib/practice-grades.test.ts:23` only asserts `choices` contains the answer, never its position.

Fix: draw `b` independently of `a` (`Math.max(1, Math.floor(rng() * limit))`), regenerate on ties, and wrap the options in the existing `shuffle(values, rng)` so the same seeded-Fisher–Yates guarantee applies here as everywhere else. Add an assertion that the answer index is not fixed across a generated set.

### P2: Speech synthesis is never cancelled, so a spoken prompt continues after leaving practice

**Confidence: high.** `components/PracticeSession.tsx:57-61`, `components/PracticeSession.tsx:39-41`, `components/PracticeSession.tsx:171`

`speak()` queues a `SpeechSynthesisUtterance` on the global `window.speechSynthesis`, which is a browser-level singleton with a lifetime independent of the React tree. The unmount cleanup at lines 39-41 clears the feedback timeout but does not call `speechSynthesis.cancel()`.

Failure scenario: a kindergartner on Listening Comprehension taps 🔊 Listen, which speaks the entire ~62-word early passage (`lib/practice.ts:187` passes `passages.early.text`). Two seconds in they tap "Exit practice" in the header (`app/practice/[slug]/page.tsx:20`). The component unmounts, but the utterance keeps reading the passage aloud over the home page for another 20+ seconds, with no visible control anywhere in the app to stop it — the Listen button only exists inside the session. The same happens on browser-back or on any navigation via the result screen's "Choose another activity" link.

Fix: add `if ("speechSynthesis" in window) window.speechSynthesis.cancel();` to the existing unmount cleanup at `PracticeSession.tsx:39-41`, and to `begin()` alongside the timeout clear at line 44.

### P2: Oral reading displays a capped timer but stores the uncapped duration

**Confidence: medium.** `components/PracticeSession.tsx:148`, `components/PracticeSession.tsx:87`

The oral panel renders `{Math.min(elapsed, 60)} sec`, but nothing stops the interval at 60 seconds and `finish()` persists `durationSeconds: Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000))` uncapped. The `aria-label` on the same element (`${elapsed} seconds elapsed`) reports the uncapped value while the visible text reports the capped one, so a screen-reader user and a sighted user see different numbers.

Failure scenario: a parent and child work through the Grade 2 passage slowly, pausing to sound out words, and finish at 3 minutes. The screen has read a frozen "60 sec" for the last two of those minutes, implying the one-minute window described in the intro ("Read the original passage aloud for up to one minute", line 111) was respected. They enter 58 words. The stored record is `{correct: 58, total: 62, durationSeconds: 187}`. Oral Reading Fluency is a *rate* measure; any future progress view computing words-per-minute from this record reports ~19 WPM while the child and parent believe they observed 58 in a minute.

Fix: either stop the interval and disable further reading at 60 seconds so the cap is real, or drop the `Math.min(elapsed, 60)` display cap so what is shown matches what is stored. Make the `aria-label` and the visible text agree either way.

## Test-gap notes

- **The unmount test does not test the unmount fix.** `components/PracticeSession.test.tsx:39-49` renders `vocabulary` at grade 2, which generates 4 items, submits **item 1**, unmounts, advances timers, and asserts `brightpath-attempts` is null. On item 1 the timeout takes the `setIndex` branch (`PracticeSession.tsx:74`) and never calls `finish()`, so the assertion passes identically with the cleanup at lines 39-41 deleted. I verified this by tracing the branch, not by running the suite. The test needs to advance to the *final* item before unmounting; only then does the pending timeout call `finish()` and attempt the write. As written this is a green test protecting nothing.
- **The double-submit test is sound.** `PracticeSession.test.tsx:25-37` asserts "Question 2 of" after two Enter presses; an unguarded double-submit would advance to "Question 3 of", so the assertion genuinely discriminates. Good.
- **No test asserts a minimum item count.** Both `lib/practice.test.ts:18` and `lib/practice-grades.test.ts:19` assert only `toBeLessThanOrEqual(4)` with `count = 4`. That is exactly the assertion that cannot detect the one-question sessions above. Requesting `count = 8` and asserting a per-slug expected minimum would surface it immediately.
- **No test asserts answer-position distribution.** `lib/practice-grades.test.ts:23` checks membership but not index. A test generating ~50 items for `number-comparison-pairs` and asserting the answer is not at index 0 more than ~60% of the time would catch the bias above and would also have caught the original comparator-shuffle bug.
- **The `localStorage` failure path is still untested.** The `catch` at `PracticeSession.tsx:94` remains unexercised. The suite already installs a stub `localStorage` in `beforeEach` (`PracticeSession.test.tsx:6-16`), so making `setItem` throw is a two-line addition that would pin the "practice still works when storage is unavailable" contract the comment claims.
- **The e2e feedback race is reduced but not eliminated.** `tests/e2e/guest-practice.spec.ts:15-21` now waits for `toBeEnabled()` before clicking and asserts the status is hidden after. But `expect(getByRole("status")).toBeHidden()` passes immediately when the element does not yet exist, so if the assertion round-trips before React paints the feedback div, the loop proceeds while the 700 ms timeout is still pending; the next choice click sets `answer`, the timeout then clears it, and `toBeEnabled()` waits on a permanently disabled button until timeout. Await `toBeVisible()` *then* `toBeHidden()`, or wait on the "Question N of" text to change. `retries: 2` in CI (`playwright.config.ts:6`) will mask this intermittently rather than surface it.
- **Route-level grade/slug validation is still untested.** `app/practice/[slug]/page.tsx:11-13` and `app/page.tsx:6` have distinct outcomes (unknown slug → 404, absent grade → `assessment.grades[0]` / `"2"`, valid-but-not-offered grade → 404, array-valued `?grade=1&grade=2` → default). None are exercised. These are pure functions of the request and cheap to cover.

## What looks good

- **The P1 fixes are root-cause fixes, not symptom patches.** Using a ref rather than `showFeedback` for the submit lock is the correct choice — it is immune to React batching, which a state-based guard is not — and it is reset in all three places it needs to be (`begin`, the timeout, and implicitly by the early return). `localAttemptId()` feature-detects rather than assuming secure context, and the fallback is appropriate since the id is only a local record key.
- **Grade persistence was solved at the right layer.** Rather than reading back the dead `brightpath-grade` key, `app/page.tsx:4-8` validates `?grade=` against `GRADES` server-side and seeds `HomePage` via a prop, and `changeGrade` keeps the URL in sync with `history.replaceState` (`HomePage.tsx:19`). This removes the unguarded storage write entirely instead of wrapping it, so the Safari-private-browsing throw is gone rather than caught. The `/?grade=${grade}` link on the result screen now actually works.
- **`shuffle` is a correct seeded Fisher–Yates** (`lib/practice.ts:22-29`) with proper `[0, index]` index selection — not the subtly-wrong `[0, length)` variant — and it still threads the injected `rng`, so `lib/practice.test.ts:28-31` determinism holds.
- **The oral-count validation is expressed once and reused.** `validOralCount` (`PracticeSession.tsx:145`) drives the disabled state, and `finish()` re-checks the same predicate independently at line 80 rather than trusting the UI. Defence in depth on the persistence boundary is the right instinct.
- **Route input handling remains correct.** `slug` is resolved through `findAssessment` rather than used directly, and `grade` is checked against both the `GRADES` allow-list and the specific assessment's grade list (`app/practice/[slug]/page.tsx:10-13`). No unvalidated input reaches anything with side effects; there is no SQL, shell, or filesystem surface in this diff.
- **No secrets or credentials.** `.env.example` is a single comment, `.gitignore` correctly ignores `.env*` while negating `!.env.example`, and no network calls are introduced. Security headers in `next.config.ts:7-19` are a sensible baseline.
- **Storage growth stays bounded** at 100 entries with a `try`/`catch` that also absorbs a corrupted non-array value (`PracticeSession.tsx:91-96`).
- **The dedup loop is bounded and cheap** — `maxAttempts` caps at `count * 20` (`lib/practice.ts:203`), so a degenerate one-item pool costs 160 trivial iterations rather than spinning. The failure mode is a short session, not a hang, which is the right way to fail.
- **Accessibility remains attentive**: skip link, `aria-pressed` on toggles, `aria-live` on the result panel, labeled groups, `aria-hidden` on decorative glyphs, and a focus effect that follows the question index (`PracticeSession.tsx:35-37`).

## Triage

- **DEFER — minimum content-pool size:** confirmed as a content-depth issue, not a data-integrity defect. Expand every static pool to at least 6–8 original items in the dedicated catalog/content PR before child-facing release.
- **DEFER — number-comparison answer position:** confirmed. Balance and test answer positions in the content/hardening PR alongside generator-distribution tests.
- **DEFER — speech cancellation:** confirmed. Add global speech cleanup with the parent/profile UI work, where navigation paths expand.
- **DEFER — oral timer consistency:** confirmed. Replace the current practice stopwatch with an explicit timed/untimed mode state machine in the hardening PR.
- **DEFER — vacuous unmount test and remaining test gaps:** strengthen with final-item unmount, failing storage, route validation, and visible-then-hidden E2E synchronization in the next test-hardening pass.

These P2 items do not block this UPVOTE, but all remain tracked requirements for the complete application.
