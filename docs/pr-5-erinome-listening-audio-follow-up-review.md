<!--
Review metadata
PR: #5
Branch: agent/erinome-listening-audio
Reviewed head: 5c9e607b234247b9727473489ad321ebff2b3a34
Merge base: 45a57cdc58a2f22f712588ae6a5ca77afb1a3f2c
Reviewer: Claude Opus 4.8, high effort
Date: 2026-07-20
Verdict: UPVOTE
-->

# PR #5 follow-up review - Add Erinome listening audio

## Summary

This is the first follow-up after the initial DOWNVOTE, which raised twelve findings (one P1, eleven P2). I verified each independently rather than trusting the maintainer triage.

All twelve are genuinely addressed, and the fixes are real rather than cosmetic:

- **Generator format validation (finding 1):** `audioFormat` (`scripts/tts-utils.mjs:11-26`) now requires a MIME type, rejects anything but `audio/{wav,x-wav,wave,l16,pcm,raw}`, rejects non-mono, and derives the sample rate from the response field or the `rate=` MIME parameter. `readWavMetadata` (`:51-88`) parses every RIFF chunk and enforces PCM/mono/16-bit plus `byteRate == sampleRate * blockAlign`, and `generate-tts.mjs:45` hard-fails on anything other than 24 kHz. The 16 kHz-silent-mispitch and MP3-in-a-WAV-header scenarios both now throw.
- **`play()` undefined-return guard (finding 2):** `useListeningAudio.ts:137-138` guards `started && typeof started.catch === "function"`, exercised by the "returns undefined" hook test.
- **Stall timeout (finding 3):** `AUDIO_LOAD_TIMEOUT_MS` (8 s) → `useFallbackOnce`, cleared in `onplaying`/`useFallbackOnce`/`stop`. Covered by the fake-timer hook test.
- **Screen-reader status + live region (finding 4):** the `aria-label` override is gone; the emoji is `aria-hidden`, the visible label tracks status, and the `role="status"` region is now rendered unconditionally (`PracticeSession.tsx:260-262`).
- **Focus retention (finding 5):** the Listen button is never `disabled`; re-entry is a no-op via `if (statusRef.current === "loading") return` (`:91`). The hardening test asserts the button stays enabled through an error.
- **Stale utterance callbacks (finding 6):** `stop()` nulls `onend`/`onerror` before `cancel()`, and both callbacks are gated on an `isCurrent()` token+ref check. The "ignores stale browser-speech completion handlers" test exercises it.
- **iOS gesture priming + fallback timeout (finding 7):** a volume-0 primer utterance is spoken inside the click gesture, and `fallback` is now time-bounded to `error`.
- **Duplication + non-throwing cue lookup (finding 8):** the word lists moved to a single source (`lib/listening-content.ts`) imported by both `practice.ts` and `listening-audio.ts`; `listeningCueId` returns `undefined` for unknowns (`:53`), and the button guards on `current.audioCue`.
- **Manifest determinism (finding 9):** `writeManifest` always runs and recomputes from disk; `generatedAt` is removed. A new test asserts one entry per cue with matching bytes/sha/rate/duration and that `generatedAt` is absent.
- **Media release (finding 10):** `releaseAudio` does `removeAttribute("src") + load()`.
- **Node engine (finding 11):** `engines.node >=22.18` + README note.
- **Temp files (finding 12):** `try/finally` unlink + `public/**/*.tmp` in `.gitignore`.

Test coverage genuinely expanded: `scripts/tts-utils.test.ts` (format/RIFF parsing, now wired into vitest via the `scripts/**/*.test.ts` include), a manifest-integrity test, a WAV-header assertion for all 65 files, a secret-exposure regression guard, a story-cue E2E, and component-level hardening tests. The two existing E2E specs were correctly updated to disambiguate `getByRole("status")` now that an empty status region is always mounted.

I could not construct a concrete, reachable failure scenario in the reworked code. The one item below is a deliberate design trade-off rather than a defect, recorded for transparency.

## Merge verdict

**UPVOTE** — Every prior finding is independently confirmed fixed, the committed assets validate against the new stricter test, no regression to existing callers or tests, and I found no new reachable defect with a concrete failure scenario. The remaining item is a tuning trade-off, not a blocker.

## Findings

### 1. 8 s load timeout can swap the Erinome story narration for the browser's default TTS on a slow-but-working connection

**Severity: P2 · Confidence: low (it is an intentional trade-off, not a malfunction)**
`components/useListeningAudio.ts:8`, `:136`; asset `public/audio/erinome/listening-comprehension/the-window-garden.wav` (1,418,924 bytes, ~29.6 s)

The stall timeout that fixes finding 3 is a fixed 8 s from `play()` to the first `playing` event. The listening-comprehension asset is a single uncompressed 1.4 MB WAV, and the "consider also shipping a compressed variant" half of the prior finding 3 was not taken.

Failure scenario: a child on a genuinely slow (but not failed) connection — the exact case finding 3 targeted — taps Listen on the story. The download would complete and play at, say, ~11 s, but at 8 s the timeout fires, `useFallbackOnce` aborts the fetch (`releaseAudio`), and `speechSynthesis` reads the passage in the platform's default voice. For a *listening-comprehension* exercise this silently substitutes a different narrator mid-assessment. It is strictly better than the pre-patch infinite hang, so this is a soft trade-off, not a correctness bug.

Suggested fix (optional): key the timeout off buffering progress (`progress`/`loadeddata` events reset it) rather than a flat wall-clock bound, and/or ship a compressed `.opus`/`.m4a` variant of the story as a `<source>` so the 30-second passage is not 1.4 MB uncompressed on the hot path. If the flat 8 s is intentional, no change needed.

## Test-gap notes

- **Focus retention is asserted only indirectly.** `PracticeSession.hardening.test.tsx:83-88` verifies the Listen button stays *enabled* through an audio error (the mechanism behind finding 5), but never asserts `document.activeElement === listen` after activation. The always-enabled invariant makes focus loss impossible, so this is a completeness gap, not a hole.
- **The `loading` re-entry no-op is untested.** `useListeningAudio.ts:91` (`if (statusRef.current === "loading") return`) — the guard that prevents a restart storm and keeps focus — has no direct test asserting that a second `play()` during `loading` does not create a second `Audio`.
- **`listeningAudioCue` still throws on an unknown id** (`lib/listening-audio.ts:57-59`) while its sibling `listeningCueId` was made non-throwing. No current caller can reach the throw (the button guards on `current.audioCue`, and every catalog id is exercised by the coverage test), so this is not a finding — but a one-line test documenting that `play()` is only ever handed a valid id would lock the invariant.
- **Story-cue E2E covers delivery, not latency.** `tests/e2e/listening-audio.spec.ts` now exercises the story path end to end (good), but only asserts the response is `ok` with `audio/wav`; the distinct stall/timeout behavior of the large asset (finding 1) is not exercised. Hard to do in Playwright; acceptable to leave.

## What looks good

- **Format validation is now defense-in-depth and testable.** `audioFormat` + `readWavMetadata` reject wrong MIME, wrong rate, non-mono, non-PCM, and inconsistent byte rate, and the generator hard-fails off 24 kHz. `tts-utils.test.ts` covers the `audio/mpeg`, missing-MIME, stereo, and misaligned-PCM rejection paths directly. This closes the one P1 cleanly.
- **Independently verified assets.** moon.wav RIFF size `0x00010e24 + 8 = 69164` and `data 0x00010e00`, and the story RIFF size `0x0015a6a4 + 8 = 1418924` with `data 0x0015a680`, both `fmt` = PCM/1ch/24000/16-bit — self-consistent and matching the diff's byte counts. The new all-65 `readWavMetadata` assertion would fail loudly if any future asset drifted.
- **Playback state machine is coherent.** A monotonically increasing `playbackTokenRef` plus the `audioRef.current === audio` / `utteranceRef.current === utterance` gates make superseded audio *and* superseded utterances inert; both timers are cleared on every exit path (`clearTimers`, per-handler clears); `releaseAudio` fully tears down the element (`src` removal + `load()`), fixing the iOS media-element-cap concern. I could not force a stale callback to mutate live status.
- **Manifest is now meaningful.** Unconditional regeneration from disk, no `generatedAt` churn, and a test that recomputes every SHA-256 and duration from the committed files — the integrity guarantee is real rather than advisory.
- **Single source of truth for content.** Moving `VOCABULARY_ITEMS`/`PHONEME_ITEMS`/`SPELLING_WORDS` into `lib/listening-content.ts` eliminates the duplicated word lists; the `generatedCueIds` equality test (`listening-audio.test.ts:56`) catches both orphaned and missing cues.
- **Secret handling remains clean and now guarded.** `GEMINI_API_KEY` lives only in the `.mjs` generator behind `--env-file`, and `listening-audio.test.ts:82-89` fails CI if the string ever appears under `app/`/`components/`/`lib/`. `--only` is still allowlist-matched against the catalog, so no argv string reaches the filesystem.
- **The E2E status-selector updates are correct, not papering-over.** Because the `role="status"` error region is now always mounted, the old `getByRole("status")` assertions would have become ambiguous; switching them to `getByText("Answer saved. Keep going!")` is the right disambiguation and preserves the original intent.

## Triage

- **Finding 1 — DEFER (non-blocking):** The reviewer explicitly classifies the 8-second timeout as an intentional tuning trade-off rather than a defect and UPVOTEs the PR. Keeping a bounded fallback is preferable to an indefinite child-facing loading state. The UI identifies fallback playback as “Backup audio playing…”. Progress-sensitive timeout renewal or a compressed story asset can be evaluated later with real network telemetry.
- **Test-gap notes — DEFER (non-blocking):** Focus retention follows directly from keeping the button enabled, loading re-entry is guarded in the state machine, all catalog cue ids are exhaustively resolved, and latency behavior is covered at the hook level. These are useful future completeness improvements but do not identify a reachable regression.
