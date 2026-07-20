<!--
Review metadata
PR: #5
Reviewed head: 2dfed50429749d8d367066c7e645a0a97d91f49d
Merge base: 45a57cdc58a2f22f712588ae6a5ca77afb1a3f2c
Reviewer: Claude Opus 4.8, high effort
Initial verdict: DOWNVOTE
-->

# PR #5 review - Add Erinome listening audio

## Summary

The PR replaces the runtime `speechSynthesis` cue in `PracticeSession` with 65 pre-generated Erinome WAV assets, a typed cue registry (`lib/listening-audio.ts`), a playback hook with a browser-speech fallback (`components/useListeningAudio.ts`), an offline generator (`scripts/generate-tts.mjs`), and a SHA-256 manifest.

Secret handling is correct: `GEMINI_API_KEY` is read only in the `.mjs` generator, is never referenced from `lib/`, `app/`, or `components/`, is not `NEXT_PUBLIC_`-prefixed, and the client bundle receives only cue ids, paths, model/voice strings, and transcript text. The `--only` argument is matched against a fixed cue allowlist, so no user-controlled string reaches `join()`/`fetch()`. I spot-verified committed assets: `initial-sounds/moon.wav` matches its `audioSha256` and `bytes` in the manifest, and its header is a well-formed 16-bit mono 24 kHz PCM RIFF with a `data` size consistent with the file length. Every `speak` item in `lib/practice.ts` now carries an `audioCue`, so no Listen button disappears.

The problems are concentrated in (a) generator output validation that no test can catch, and (b) playback state-machine / accessibility edges in the new hook and button.

## Merge verdict

DOWNVOTE

No P0, and the committed assets themselves check out. But the generator will silently emit undecodable or wrong-pitch `.wav` files if the API's audio encoding ever differs from the hardcoded assumption, and the unit test (`size > 44`) cannot detect it; separately, the Listen button has deterministic, user-facing defects — keyboard focus loss on activation, playback state that is entirely invisible to screen readers, and an unguarded `audio.play().catch()` that can wedge the button in a permanently disabled state. These are small, targeted fixes; the PR should land after them rather than as-is.

## Findings

### 1. Generator wraps the API response in a hardcoded 24 kHz PCM header without checking the returned encoding

**Severity: P1 · Confidence: high (mechanism) / medium (likelihood)**
`scripts/generate-tts.mjs:42`, `scripts/generate-tts.mjs:85-87`, `scripts/generate-tts.mjs:112`

`findAudio()` (`:102-110`) returns the audio part but discards its `mimeType`. `requestPcm` validates only that the buffer is non-empty and even-length (`:86`), and `generateCue` decides format by sniffing four bytes for `"RIFF"` (`:42`); anything else is fed to `wrapPcmAsWav(pcm)` with defaults `sampleRate = 24_000, channels = 1, bitsPerSample = 16` (`:112`).

Failure scenario: the preview model returns `audio/L16;rate=16000` (or `audio/mpeg`) for a future regeneration. In the first case the bytes are even-length and pass every check, so 65 files ship with a 24 kHz header over 16 kHz samples — every word plays 50% fast and pitched up, which is exactly the kind of defect a phoneme-segmentation or spelling exercise cannot tolerate. In the second case, MP3 bytes get a PCM RIFF header prepended and no browser can decode the file. Neither is caught: `lib/listening-audio.test.ts:24` only asserts `statSync(path).size > 44`, and `tests/e2e/listening-audio.spec.ts:14` only asserts the `content-type` header that Next derives from the `.wav` extension.

Fix: read `audio.mimeType`, parse the `rate=` / `codec` parameters, pass the parsed sample rate into `wrapPcmAsWav`, and throw on any mime type other than `audio/L16` / `audio/pcm` / `audio/wav`. Record `mimeType`, `sampleRate`, and `durationSeconds` per entry in the manifest, and extend `lib/listening-audio.test.ts` to parse each file's RIFF header and assert `fmt` = PCM/1ch/16-bit/24000 and `data` size == `fileSize - 44`.

### 2. `audio.play()` result is dereferenced without a guard, wedging the button in `loading`

**Severity: P2 · Confidence: high**
`components/useListeningAudio.ts:67`

`void audio.play().catch(useFallbackOnce)` assumes `play()` returns a promise. jsdom's `HTMLMediaElement.play` is "not implemented" and returns `undefined`, as do pre-2016 WebKit builds.

Failure scenario: any future component-level test that clicks the Listen button in `PracticeSession.test.tsx` without stubbing `Audio` (the new hook test at `components/useListeningAudio.test.tsx:10` stubs it, so this is latent, not currently failing) throws `TypeError: Cannot read properties of undefined (reading 'catch')` from inside the click handler. Because the throw happens after `setStatus("loading")` at `:50`, the status is never advanced, and `PracticeSession.tsx:245` leaves the button `disabled` for the rest of the session — the child cannot hear the prompt or reach the fallback.

Fix: `const started = audio.play(); if (started?.catch) started.catch(useFallbackOnce); else useFallbackOnce();` — or `void Promise.resolve(audio.play()).catch(useFallbackOnce)`.

### 3. No stall/timeout path out of `loading`

**Severity: P2 · Confidence: high**
`components/useListeningAudio.ts:50`, `components/PracticeSession.tsx:245`

`loading` is only left via `playing`, `ended`, `error`, or a rejected `play()`. A media element on a stalled (not failed) connection fires `stalled`/`waiting` and never fires `error`. The listening-comprehension asset is 1,418,924 bytes of uncompressed WAV (~30 s at 48 kB/s).

Failure scenario: a child on a weak LAN/tethered connection taps Listen on `listening-comprehension`; the fetch stalls after headers. The button is `disabled` and reads "Loading…" indefinitely, the `speechSynthesis` fallback is never invoked, and the "Audio is unavailable" message never renders. The activity is unusable until the page is reloaded.

Fix: start a `window.setTimeout` (≈8 s) when entering `loading`, clear it in the `playing`/`ended`/`error` handlers and in `stop()`, and call `useFallbackOnce()` when it fires. Consider also shipping a compressed variant of the story asset (`.opus`/`.m4a`) with the WAV as a `<source>` fallback — 1.4 MB uncompressed for one 30-second passage is the single largest cost on the hot path.

### 4. Playback state is invisible to screen readers, and the error region is mounted with its content

**Severity: P2 · Confidence: high**
`components/PracticeSession.tsx:245-246`

The button carries a static `aria-label="Listen to the question"`. `aria-label` overrides the accessible name computed from contents, so the visible "Loading…" / "Playing…" / "Listen" text is never exposed to assistive tech — an SR user gets no feedback that anything happened. Separately, `<p className="fine-print" role="status">` at `:246` is conditionally rendered, so the live region enters the DOM in the same tick as its text; NVDA/JAWS/VoiceOver commonly do not announce live regions that are inserted rather than updated.

Failure scenario: a screen-reader user activates Listen, the asset 404s, the fallback fails, and the "Ask a grown-up to read the prompt" message is rendered but never announced — the user hears nothing at all and has no indication of failure.

Fix: drop the `aria-label` and let the visible label be the accessible name (prefixing the emoji with an `aria-hidden` span), or drive the label from status (`aria-label={statusLabel}`). Render the `role="status"` element unconditionally and toggle only its text content.

### 5. Disabling the button during `loading` drops keyboard focus

**Severity: P2 · Confidence: high**
`components/PracticeSession.tsx:245`

`disabled={listeningAudio.status === "loading"}` is applied synchronously during the click/Enter that activated the button. Browsers blur a focused element that becomes disabled, moving focus to `<body>`.

Failure scenario: a keyboard user tabs to Listen and presses Enter. Focus is lost; the next Tab restarts from the top of the document, past the nav and progress region, before reaching the answer choices. This is a regression — the pre-PR button (`PracticeSession.tsx:249` on `main`) was never disabled.

Fix: keep the button enabled and make `play()` a no-op while `status === "loading"` (or use `aria-disabled` with a guarded handler) so focus is retained.

### 6. Stale `SpeechSynthesisUtterance` handlers can flip status after a newer cue starts

**Severity: P2 · Confidence: medium**
`components/useListeningAudio.ts:31-36`, `components/useListeningAudio.ts:22`

`playBrowserFallback` never keeps a reference to the utterance, and `stop()` calls `window.speechSynthesis.cancel()` (`:22`) without detaching `onend`/`onerror` (`:33-34`). Per the Web Speech spec, `cancel()` fires `error` with `"canceled"`/`"interrupted"` for utterances that were queued or interrupted; Chrome and Safari both fire an event on the cancelled utterance.

Failure scenario: the asset for question 3 fails and the browser fallback starts speaking. The child clicks Listen on question 4; `play()` → `stop()` → `cancel()`, then `setStatus("loading")` and the new WAV plays fine. A tick later the cancelled utterance's `onerror` fires and sets status to `"error"` — the red "Audio is unavailable right now" line appears while audio is audibly playing. The `onend` variant instead resets the label to "Listen" mid-playback.

Fix: hold the utterance in a ref, null its `onend`/`onerror` inside `stop()` before calling `cancel()`, or gate both callbacks on a monotonically increasing playback token captured at `play()` time (the same pattern already used correctly for the `HTMLAudioElement` via `audioRef.current === audio`).

### 7. Fallback is invoked outside the user gesture, so iOS Safari silently drops it

**Severity: P2 · Confidence: medium**
`components/useListeningAudio.ts:52-56`

`useFallbackOnce` runs from the media `error` event or the `play()` rejection — asynchronously, after the activating gesture has ended. iOS Safari requires `speechSynthesis.speak()` to originate from a user gesture and ignores it otherwise, without firing `error`.

Failure scenario: on an iPad (a primary device for this app), an asset fails to load; status is set to `"fallback"` at `:35`, `speak()` is dropped silently, `onend`/`onerror` never fire, and the button stays on "Playing…" with no sound and no error message until the next click. There is also no timer bounding the `fallback` state.

Fix: bound `fallback` with a timeout that transitions to `error` if no `boundary`/`end` event arrives within a few seconds, and prime speech synthesis with a zero-length utterance inside the click handler so the gesture is consumed while it is still active.

### 8. `listeningCueId` throws inside item generation, and the word lists are duplicated

**Severity: P2 · Confidence: high**
`lib/listening-audio.ts:65-69`, `lib/practice.ts:268`, `lib/practice.ts:280`

`VOCABULARY_WORDS` / `SPELLING_WORDS` / `PHONEME_WORDS` in `lib/listening-audio.ts` duplicate the content of `wordsByLevel` (`lib/practice.ts:40-69`) and the phoneme tuple list (`lib/practice.ts:275`). `listeningCueId` throws on any mismatch, and it is called from `readingItem`, which runs inside `generatePracticeItems` — invoked from the `begin()` click handler (`components/PracticeSession.tsx:69`).

Failure scenario: someone adds `["persuade", ...]` to `wordsByLevel.middle` without adding the cue and the asset. `listeningCueId` throws out of the click handler, `setItems` never runs, and "Let's go" becomes a dead button for grades 4–7 vocabulary — no error UI, only a console message. The new test at `lib/listening-audio.test.ts:29` catches this in CI only because the seeded RNG happens to surface every word.

Fix: derive `wordsByLevel` keys from `VOCABULARY_WORDS` (or vice versa) so a mismatch is a type error, and make `listeningCueId` return `undefined` for an unknown id instead of throwing — `PracticeSession.tsx:245` already requires `current.audioCue` to be truthy, so the item degrades to "no Listen button" rather than a dead session.

### 9. Manifest can silently drift out of sync, and nothing validates it

**Severity: P2 · Confidence: high**
`scripts/generate-tts.mjs:31`, `scripts/generate-tts.mjs:155`

`if (!only) await writeManifest();` skips the manifest entirely for targeted regenerations, and `generatedAt: new Date().toISOString()` rewrites the manifest on every full run even when all 65 cues were skipped.

Failure scenario: an editor fixes one mispronunciation with `npm run audio:generate -- --only spelling:middle:calendar --force`. The WAV changes; `manifest.json` still carries the old `audioSha256` and `bytes`. Because no test reads the manifest, the mismatch survives review and the manifest's integrity guarantee is worthless from then on. Conversely, a no-op verification run produces a one-line `generatedAt` diff, which trains reviewers to ignore manifest changes.

Fix: always write the manifest (recomputing all entries from disk), drop `generatedAt` or move it to a per-entry field that only changes when the audio changes, and add a Vitest case that loads `manifest.json` and asserts one entry per cue with matching `bytes` and `audioSha256` for every file.

### 10. `stop()` pauses the element but never releases the media resource

**Severity: P2 · Confidence: medium**
`components/useListeningAudio.ts:18-20`

`pause()` + `currentTime = 0` + dropping the ref leaves the element's network state intact until GC; browsers may continue buffering a paused element that still has a `src`.

Failure scenario: a child repeatedly taps Listen then Check answer during a listening-comprehension session. Each cycle creates a new `Audio` for the 1.4 MB story; the abandoned elements keep their buffers, and on iOS — which caps concurrent media elements — later `play()` calls begin failing, pushing every subsequent cue into the fallback path from finding 7.

Fix: in `stop()`, after `pause()`, call `audio.removeAttribute("src"); audio.load();` to abort the fetch and free the buffer.

### 11. The generator's Node requirement is undocumented and unenforced

**Severity: P2 · Confidence: high**
`scripts/generate-tts.mjs:8`, `package.json:17`

`scripts/generate-tts.mjs` imports `../lib/listening-audio.ts` directly, which depends on Node's unflagged type stripping (Node ≥ 22.18 / ≥ 23.6). `package.json` has no `engines` field, there is no `.nvmrc`, and the README section added at `README.md:29-37` tells contributors to run `npm run audio:generate` with no version caveat.

Failure scenario: a contributor on Node 20 LTS or 22.17 follows the README and gets `ERR_UNKNOWN_FILE_EXTENSION: Unknown file extension ".ts"`, with nothing in the repo indicating the cause.

Fix: add `"engines": { "node": ">=22.18" }` to `package.json` and state the requirement in the README's Listening audio section.

### 12. Interrupted runs leave `*.wav.tmp` files inside `public/`

**Severity: P2 · Confidence: high**
`scripts/generate-tts.mjs:44-46`

The temp file is created inside the served asset tree with no cleanup on failure or signal.

Failure scenario: a 23-minute full run (65 cues × the 21 s default interval at `:20`) is interrupted with Ctrl-C mid-`writeFile`. `public/audio/erinome/spelling/early/train.wav.tmp` remains, is publicly served by Next at that exact URL, and shows up as an untracked file that is easy to `git add -A` into the repo.

Fix: write temp files to `os.tmpdir()` and `rename` into place (same-volume caveat: fall back to copy+unlink), or wrap `generateCue` in a `try/finally` that unlinks the temp path, and add `public/**/*.tmp` to `.gitignore`.

## Test-gap notes

- **No format validation.** `lib/listening-audio.test.ts:24` asserts only `size > 44`. It should parse each WAV's RIFF/`fmt `/`data` chunks and assert PCM, 1 channel, 16-bit, 24000 Hz, and `data` size == `fileSize - 44`. This is the only defense against finding 1.
- **No manifest test.** `public/audio/erinome/manifest.json` is committed but never read by any test. A test asserting one entry per cue with matching `bytes`/`audioSha256` would close finding 9 and make the manifest meaningful.
- **Generator logic is untestable.** `wrapPcmAsWav`, `findAudio`, `promptFor`, and `waitForRequestSlot` are private to the `.mjs` and have no unit tests. Exporting them (and testing `findAudio` against both the `output_audio` and `steps` response shapes, plus `wrapPcmAsWav` header bytes) would cover the reproducibility path the README advertises.
- **Fallback and error UI untested at the component level.** `components/useListeningAudio.test.tsx` covers play/stop/fallback/unmount on the hook, but nothing renders `PracticeSession` and asserts that the "Audio is unavailable right now" paragraph appears, that the button label tracks status, or that the button is not left permanently disabled. Findings 2, 3, and 5 would all have surfaced from such a test.
- **`stop()` is never asserted to leave `fallback`.** The hook test at `components/useListeningAudio.test.tsx:52-58` verifies entry into `fallback` but never calls `stop()` afterwards, so finding 6 is not exercised.
- **E2E covers one delivery type.** `tests/e2e/listening-audio.spec.ts` only exercises `spelling` at grade 2 (`early`). The story cue — the only multi-hundred-kilobyte asset, and the one with distinct latency behavior — is untested end to end, as are the `vocabulary`/`middle`/`advanced` path segments.
- **No regression guard on secret exposure.** Worth a cheap test asserting that no file under `app/`, `components/`, or `lib/` references `GEMINI_API_KEY`, since that invariant is the stated constraint for this feature.

## What looks good

- **Secret handling is clean.** The key lives only in `scripts/generate-tts.mjs:10`, travels in an `x-goog-api-key` header, is never interpolated into logs or error messages (`:82` stringifies the response body, not the request), and `.env.example:4` documents the "never expose as `NEXT_PUBLIC_`" rule explicitly.
- **`--only` is allowlist-matched** against `LISTENING_AUDIO_CUES` (`:16-17`), so no user-supplied string reaches `join()` — no path traversal into `public/`.
- **The per-element playback guard is correct.** `audioRef.current === audio` in `onplaying`/`onended` and the `useFallbackOnce` early return (`useListeningAudio.ts:52-65`) properly prevent a superseded element from mutating state or double-invoking the fallback. It is only the `SpeechSynthesisUtterance` half that lacks the same discipline.
- **The throttle reservation is race-free.** `waitForRequestSlot` (`:96-100`) reads and advances `nextRequestAt` with no `await` between them, so the concurrent workers at `:24-29` cannot double-book a slot.
- **Atomic-ish writes.** `writeFile` to `.tmp` + `rename` (`:44-46`) means a crashed run never leaves a truncated `.wav` in place, which is what makes the `fileHasContent` resume path at `:35` safe.
- **`generatePracticeItems` coverage test.** `lib/listening-audio.test.ts:29-41` asserting that the set of generated cue ids exactly equals the declared cue set is a strong invariant — it catches both orphaned assets and missing ones.
- **Cue derivation is consistent.** `wordCues` builds `id` and `src` from the same `[namespace, level, text]` tuple (`lib/listening-audio.ts:36-45`), so a path and its id cannot drift apart, and `listeningCueId` uses the identical join.
- **Unmount cleanup is properly stable.** `stop` is a `useCallback` with an empty dep array, so `useEffect(() => () => stop(false), [stop])` at `:70` runs exactly once on unmount and correctly suppresses the state update — a real improvement over the ad-hoc `speechSynthesis.cancel()` it replaced.

## Maintainer triage

All twelve findings were accepted for the follow-up patch. The implementation now validates Gemini MIME/rate/channel metadata, parses every RIFF chunk, records deterministic manifest metadata, bounds loading and speech fallback, preserves focus, exposes dynamic status to assistive technology, gates stale callbacks, releases media resources, makes missing cue mappings non-throwing, documents/enforces Node 22.18+, and cleans/ignores temporary files. The expanded unit, component, manifest, secret-exposure, and story E2E coverage verifies those changes. A follow-up Claude review is required before merge.
