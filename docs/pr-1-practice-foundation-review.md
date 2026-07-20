# PR #1 external review

- Reviewer: Claude Opus 4.8, high effort
- Date: 2026-07-20
- PR: #1 — Add anonymous Pre-K–12 practice foundation
- Branch: feat/practice-foundation
- Reviewed commit: 7d25e7b

# PR #1 review - Add anonymous Pre-K–12 practice foundation

## Summary

This PR adds the full initial application: a static assessment catalog (`lib/assessments.ts`), a procedural item generator (`lib/practice.ts`), two client components (`components/HomePage.tsx`, `components/PracticeSession.tsx`), the App Router pages, security headers, unit tests, and one Playwright spec. There is no server-side data handling, no database, no auth, and no user input that reaches SQL, a shell, or the filesystem — so the security surface is genuinely small and the route-level input that does exist (`params.slug`, `searchParams.grade`) is validated against the catalog and the `GRADES` allow-list before use (`app/practice/[slug]/page.tsx:10-13`). That part is done correctly.

The problems are concentrated in the client session state machine and in navigation: an unguarded Enter-key path lets a single question be submitted twice, `crypto.randomUUID()` can throw outside the guarded block and strand the user at the end of a session, and the header links to a `/parent` route that does not exist. The item generator also produces heavily repeated items for several skills because there is no de-duplication across a set.

## Merge verdict

DOWNVOTE

Not a rejection of the design — the structure is sound and the privacy posture is real. But three defects are user-visible on the primary flow: a dead nav link in the site header, a score-corrupting double-submit reachable by pressing Enter twice, and an unhandled exception path that loses the result on non-secure origins. All three are small, contained fixes; I would re-review quickly.

## Findings

### P0 — none

### P1: Enter key bypasses the submit guard, double-counting a question and skipping the next one

**Confidence: high.** `components/PracticeSession.tsx:168`, `components/PracticeSession.tsx:55-66`

The "Check answer" button is guarded with `disabled={!answer.trim() || showFeedback}` (line 171), but the input's `onKeyDown` handler calls `submitAnswer()` with no equivalent guard:

```tsx
onKeyDown={(event) => event.key === "Enter" && submitAnswer()}
```

`submitAnswer` only checks `!current || !answer.trim()`. `answer` is not cleared until the 700 ms timeout fires.

Failure scenario: on any free-text item (spelling, letter naming, mental computation — every math slug without `choices`), a student types `42` and presses Enter twice in quick succession, which is extremely common with children racing a timer. Both invocations see the same non-empty `answer` and the same stale `correct` from the render closure. Two timers are queued. Both increment `correct` via the functional updater, so one correct answer scores 2. Both then run the advance branch, so `setIndex((value) => value + 1)` fires twice and question *n+1* is displayed but never answered — the student sees 8 questions announced, answers 7, and can score up to 9. If the double-press lands on the last item, `finish(correct + 1)` is called twice with the same stale base, writing two attempt records to `localStorage` for one session.

Fix: return early at the top of `submitAnswer` when `showFeedback` is true (or track an `isSubmitting` ref, since `showFeedback` state updates are batched and a ref is immune to the two handlers observing the same pre-update value).

### P1: `crypto.randomUUID()` is called outside the try block and throws on non-secure origins, stranding the session

**Confidence: high.** `components/PracticeSession.tsx:70`

```tsx
const result = { id: crypto.randomUUID(), ... };
try { /* localStorage */ } catch { }
setCorrect(finalCorrect);
setStage("result");
```

`crypto.randomUUID` is only defined in a secure context. The `try` deliberately tolerates unavailable storage, but the UUID call sits above it and is unprotected.

Failure scenario: a parent runs `npm run dev` and opens the app from a tablet at `http://192.168.1.20:3000` (a normal way to test a kids' app on a touch device), or a school serves it over plain HTTP on the LAN. `crypto.randomUUID` is `undefined`; calling it throws `TypeError` inside the React event/timeout handler. `setStage("result")` never runs, so the student finishes all 8 questions and the UI simply freezes on the last question with no result screen and no saved attempt. The same applies to Safari before 15.4, which ships `crypto` but not `randomUUID`.

Fix: move the `id` generation inside the `try`, or use a guarded helper — `typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : \`${Date.now()}-${Math.random().toString(36).slice(2)}\``. The id is only a local record key, so a fallback is adequate.

### P1: Site header links to `/parent`, which does not exist

**Confidence: high.** `components/HomePage.tsx:28`

```tsx
<Link className="button button-quiet" href="/parent">Parent area</Link>
```

`app/` contains only `about/`, `practice/[slug]/`, `page.tsx`, and `not-found.tsx`. There is no `parent` route in this diff.

Failure scenario: any user clicks "Parent area" — the most prominent nav element on the landing page, and the one adults are most likely to click first — and lands on the 404 page ("That practice path wandered away."), with no way back except the home button. This ships as a visibly broken product on the primary entry screen.

Fix: either remove the link until the parent route exists, or point it at `/about`, which currently carries the for-grown-ups content.

### P2: Pending submit timeout is never cleared, so an abandoned session writes a result after unmount

**Confidence: high.** `components/PracticeSession.tsx:60-65`

`window.setTimeout(...)` in `submitAnswer` is stored nowhere and has no cleanup effect, unlike the interval at lines 27-31 which is cleaned up correctly.

Failure scenario: a student answers the final question and, during the 700 ms feedback window, taps "Exit practice" in the header. The component unmounts, but the timeout still fires, calls `finish(...)`, and writes an attempt record to `localStorage` for a session the student left — plus `setCorrect`/`setStage` on an unmounted component. The stored history the parent later reviews contains phantom entries.

Fix: hold the timer id in a ref and clear it in a `useEffect` cleanup on unmount.

### P2: Negative and non-numeric word counts are accepted in oral reading

**Confidence: high.** `components/PracticeSession.tsx:142-143`

```tsx
<input id="words-read" type="number" min="0" max={passage.wordCount} ... />
<button disabled={wordsRead === "" || Number(wordsRead) > passage.wordCount} ...>
```

`min`/`max` on a number input are advisory; they do not block typed values, and only the upper bound is re-checked in the disabled expression.

Failure scenario: an adult types `-40` (or pastes a value). `Number("-40") > 62` is false, so the button is enabled, and `finish()` stores `correct: -40` alongside `total: 62`. The result screen shows "-40 words read accurately", and any future progress view computing a percentage from this history produces a negative rate.

Fix: validate with a single numeric guard — `const n = Number(wordsRead); const valid = wordsRead !== "" && Number.isInteger(n) && n >= 0 && n <= passage.wordCount;` — and use `valid` for both the disabled state and the stored value.

### P2: Grade selection is written to `localStorage` but never read, and `?grade=` on the home page is ignored

**Confidence: high.** `components/HomePage.tsx:9`, `components/HomePage.tsx:17-20`; `components/PracticeSession.tsx:125`

`changeGrade` persists `brightpath-grade`, but nothing in the diff ever reads that key, and `HomePage` always initializes to the hard-coded `"2"`. `HomePage` also never reads the `grade` search param, while the result screen links back to `/?grade=${grade}`.

Failure scenario: a Pre-K family selects "Pre-K", completes an activity, and clicks "Choose another activity". The link carries `?grade=pre-k`, but the home page renders grade 2 and lists 2nd-grade activities, so the parent must re-pick the grade after every single session. Reloading the page loses the grade too, despite it having been written to storage.

Additionally, the bare `window.localStorage.setItem` at line 19 is unprotected, unlike the guarded write in `PracticeSession`. In Safari private browsing or with site data blocked, `setItem` throws `SecurityError`/`QuotaExceededError` from the click handler — an uncaught error surfaced to the user for what should be a silent nicety.

Fix: read the search param (and/or stored grade) to seed the initial state, and wrap the write in the same `try`/`catch` used at `PracticeSession.tsx:79-84`.

### P2: `shuffle` uses a random comparator, so the correct answer is not uniformly distributed

**Confidence: medium-high.** `lib/practice.ts:22-23`

```ts
const shuffle = <T,>(values: readonly T[], rng: Rng) => [...values].sort(() => rng() - 0.5);
```

A comparator that ignores its operands violates the total-order contract `Array.prototype.sort` assumes. The resulting permutation distribution is not uniform and is dependent on the engine's sort implementation.

Failure scenario: every multiple-choice item in this app builds its options as `shuffle([correctAnswer, wrong, wrong], rng)` — the correct answer is always element 0 pre-shuffle. With V8's insertion sort for short arrays and a coin-flip comparator, position 0 retains the original element materially more often than 1/3. A child who always taps the first choice scores well above chance, which defeats the practice signal; the e2e test at `tests/e2e/guest-practice.spec.ts:13` already clicks `.first()` every time and passes. It is also engine-dependent, so Chromium and WebKit will show different biases.

Fix: use a Fisher–Yates shuffle driven by `rng` — a few lines, still deterministic under the injected source used by the tests.

### P2: Several skills emit eight identical items in one session

**Confidence: high.** `lib/practice.ts:174-176`, `lib/practice.ts:132-137`, `lib/practice.ts:188-193`

`generatePracticeItems` calls the item builder `count` times independently with no memory of what was already produced. For `listening-comprehension` (line 175) the builder is not randomized at all — it returns one hard-coded question about Maya and the sprout.

Failure scenario: a kindergartner starts Listening Comprehension and is asked "What did Maya do after the sprout appeared?" eight times in a row, with the same three choices. `print-concepts` draws from a pool of exactly 2 items, so an 8-item set averages ~4 repeats of each; `phoneme-segmentation` (5 items) and `word-reading-fluency` (3 items) are similar. The progress bar advances, but the session is not practice after the first item.

Fix: generate into a set keyed on `prompt` + `context` with a bounded retry, and fall back to allowing repeats only once the pool is exhausted; separately, give `listening-comprehension` more than one question, or cap `count` at the available pool size for these slugs.

### P2: `math-facts-one-digit` generates two-digit operands; `concepts-applications` gives multiplication to grade 1

**Confidence: high.** `lib/practice.ts:67-75`, `lib/practice.ts:120-127`

`math-facts-one-digit` has no dedicated branch, so it falls through to the generic add/subtract at line 124, which uses `numberLimit(grade)`. That assessment is grade `"1"` only (`lib/assessments.ts:236`), and `numberLimit("1")` returns 20.

Failure scenario: a first grader opens "Math Facts Fluency – 1 Digit", described as "Practice one-digit addition and subtraction facts", and is asked `17 + 12 = ?`. Meanwhile `concepts-applications` includes grade 1 in `GRADES` (`lib/assessments.ts:280`), and the non-Pre-K/K branch at line 120 asks a grade 1 student "A club packs 2 boxes with 7 markers in each box. How many markers are packed?" — multiplication, roughly two grade bands early. Both are silent content/metadata mismatches that a parent will read as the app being wrong about their child's level.

Fix: add an explicit `math-facts-one-digit` branch capping operands at 9, and route grades `1` and below in `concepts-applications` to the additive branch already present at lines 116-119.

### P2: `letter-naming` asks for the letter's *name* but only accepts the letter character

**Confidence: medium-high.** `lib/practice.ts:152-155`

```ts
return item(id, "Type the name of this letter.", letter.toLowerCase(), ...);
```

`isCorrectAnswer` (line 202) does exact normalized string equality, so `"B"` passes and `"bee"` fails.

Failure scenario: the prompt explicitly says "Type the name of this letter". A kindergartner or the adult helping them types `bee` for B, `see` for C, or `double u` for W — the literal correct response to the instruction as written — and is marked wrong on every item. This is the intended skill (letter *naming* fluency), so the prompt is right and the answer key is wrong.

Fix: either change the prompt to "Type this letter" to match the key, or accept both the character and a small name table (`b`/`bee`, `c`/`see`, …) via a set of acceptable answers in `PracticeItem`.

## Test-gap notes

- **The e2e happy path is racy and can hang.** `tests/e2e/guest-practice.spec.ts:12-15` loops choice-click → "Check answer" with no wait for the 700 ms feedback window. Playwright's actionability check will click the choice while the previous timeout is still pending; that timeout then fires `setAnswer("")`, clearing the selection, so "Check answer" stays `disabled` and the click times out. This will flake in CI (where `retries: 2` will mask it intermittently). Add `await expect(page.getByRole("button", { name: "Check answer" })).toBeEnabled()` before each click, or wait for the feedback status to detach.
- **No test covers the session state machine.** `PracticeSession` is the highest-risk file in the PR and has zero unit tests; `vitest.config.ts:6` includes `components/**/*.test.tsx`, and `@testing-library/react` plus `jsdom` are already installed, so the harness exists but is unused. The Enter-key double-submit (P1), the unmount-during-timeout write (P2), and the negative word count (P2) are all directly testable with fake timers.
- **No test covers the `localStorage` failure path.** The `catch` at `PracticeSession.tsx:82` is untested; a test that stubs `setItem` to throw would pin the "practice still works when storage is unavailable" contract the comment claims.
- **No test covers grade/slug validation on the practice route.** `app/practice/[slug]/page.tsx:12-13` has three distinct outcomes (valid grade, absent grade → default, grade not offered → 404) and none are exercised.
- **`generatePracticeItems` is only asserted at `assessment.grades[0]`.** `lib/practice.test.ts:16` never reaches the upper grade bands, so the `numberLimit`/`levelForGrade` branches for grades 4-12 are unverified — including the `math-facts-one-digit` and `concepts-applications` mismatches above. Iterating all of `assessment.grades` would be a one-line change and would catch them.
- **Nothing asserts item uniqueness within a set**, which is why the eight-identical-questions issue is invisible to the suite.

## What looks good

- Route input handling is correct and defensive: `slug` is resolved through `findAssessment` rather than used directly, and `grade` is checked against the `GRADES` allow-list *and* the specific assessment's grade list before rendering (`app/practice/[slug]/page.tsx:10-13`). No unvalidated input reaches anything with side effects.
- No secrets, credentials, or network calls are introduced; `.env.example` is a comment, and `.gitignore` correctly negates `!.env.example` while ignoring `.env*` and `data/*.db*`.
- Security headers in `next.config.ts:6-18` are a sensible baseline (`nosniff`, `DENY`, restrictive `Permissions-Policy`, `poweredByHeader: false`).
- The `localStorage` write is bounded at 100 entries and wrapped in `try`/`catch` (`PracticeSession.tsx:79-84`) — no unbounded growth, and a non-array stored value is caught by the same block rather than crashing.
- The interval in `PracticeSession.tsx:27-31` is correctly cleaned up and correctly scoped to the `active` stage.
- Dependency injection of the RNG (`lib/practice.ts:188`) makes generation testable, and `lib/practice.test.ts:26-29` uses it to pin determinism — good instinct, worth extending to the other suites.
- Accessibility is handled attentively throughout rather than as an afterthought: skip link, `aria-pressed` on toggle buttons, `aria-live` on the result panel, labeled groups, and `aria-hidden` on decorative glyphs.

## Triage

- **CONFIRM — Enter double-submit:** both keyboard events can observe pre-update state; use an immediate ref guard and test it.
- **CONFIRM — randomUUID secure-context failure:** UUID creation is outside the storage guard; add a local fallback.
- **CONFIRM — dead /parent link:** the route is planned for the next PR but broken in this diff; point to the grown-up information page until then.
- **CONFIRM — pending timeout after unmount:** retain and clear the timeout id.
- **CONFIRM — invalid oral counts:** validate finite integer bounds before enabling submission and before persistence.
- **CONFIRM — lost grade selection and unsafe storage write:** hydrate from query/storage after mount without render loops and guard storage access.
- **CONFIRM — comparator shuffle bias:** replace with seeded Fisher–Yates.
- **CONFIRM — repeated item sets:** add bounded uniqueness and larger fixed comprehension pools; never promise eight when the unique pool is smaller.
- **CONFIRM — grade/content mismatches:** cap one-digit facts at 9 and keep Grade 1 concepts additive.
- **DISPUTE — letter name as spelled word:** the activity is a keyboard approximation, and the visible glyph is the intended typed response. The prompt is ambiguous, so change it to “Type this letter” rather than adding English letter-name spellings that would not model oral fluency.
- **CONFIRM — E2E timing gap and component test gaps:** wait on UI state in E2E and add focused state-machine tests.

All confirmed findings are in scope for this foundation PR.
