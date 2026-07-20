Reviewed by Claude Opus 4.8 at high effort on 2026-07-20.

- PR: #4
- Branch: `agent/lan-dev-origin`
- Reviewed commit: `981871536a4e293f8c470f94d1c597ecf9950eff`
- Merge base: `1b4781797802105643ad087a8d2df15830daefdf`
- Verdict: **UPVOTE**

## Triage and resolution

All three P2 findings were confirmed and resolved before merge:

- Finding 1: the README now documents that LAN development must set `BETTER_AUTH_URL` to the same browser-visible LAN origin.
- Finding 2: configured LAN hosts are additive to the loopback defaults, including when the environment variable is empty.
- Finding 3: schemes, ports, paths, and wildcard entries now fail with a clear configuration error, and both the README and environment template document the hostname-only format.

Parser coverage now verifies defaults, trimming, deduplication, LAN additions, and rejection of malformed or unsafe entries. The full static, unit, and production-build checks passed after these changes.

---

# PR #4 review - Allow configurable LAN development origins

## Summary

The diff is 8 lines: `next.config.ts:3-9` reads `ALLOWED_DEV_ORIGINS`, splits on commas, trims, drops empties, and falls back to `["127.0.0.1", "localhost"]`; `.env.example:4` documents the variable with that same default.

I verified the surrounding behavior in the installed Next.js runtime rather than assuming it:

- `next/dist/server/config.js:1182` calls `loadEnvConfig` *before* resolving and importing `next.config.ts` (line 1202+), so values from `.env.local` do reach this module. The classic "env isn't available in next.config" caveat does not apply here.
- `next/dist/server/lib/router-utils/block-cross-site-dev.js:77-85` seeds the allowlist with `'*.localhost'`, `'localhost'`, and the dev server's bound `hostname`, then appends `allowedDevOrigins`. So the newly added `"localhost"` default is a no-op, and this setting is dev-server-only — it has no effect on `next build`/production, so there is no production security surface in this diff.
- Matching is hostname-only via `isCsrfOriginAllowed` (`next/dist/server/app-render/csrf-protection.js:75-84`).

The parse itself is correct, including the `?.`/`??` precedence (the optional chain short-circuits to `undefined` for an unset var, so the fallback applies). No injection, no filesystem/shell/SQL exposure, no concurrency or resource concerns. My findings are all P2: they concern silent misconfiguration modes and the fact that the change does not actually finish the job it is named for.

## Merge verdict

UPVOTE

The change is small, correct in its parsing, dev-only in effect, and strictly more flexible than the hardcoded array it replaces. Nothing here can break production or existing callers. The findings below are follow-ups worth addressing — particularly Finding 1, where a developer following this PR's intent will hit an auth wall — but none of them justify blocking a change that is a net improvement over the status quo.

## Findings

### Finding 1 — LAN dev still fails at sign-in: Better Auth rejects the LAN origin (P2, high confidence)

`lib/auth.ts:8` sets `baseURL: process.env.BETTER_AUTH_URL` and configures no `trustedOrigins`. Better Auth defaults its trusted-origin list to `baseURL`.

Failure scenario: a developer follows this PR's intent, sets `ALLOWED_DEV_ORIGINS=192.168.1.50` in `.env.local`, runs `npm run dev -- -H 0.0.0.0`, and loads `http://192.168.1.50:3000` from a tablet. Pages and HMR now work (this PR's fix). But any parent sign-in, sign-up, or session mutation posts to `/api/auth/*` with `Origin: http://192.168.1.50:3000` while `BETTER_AUTH_URL` is still `http://localhost:3000`, so Better Auth fails the origin check and returns an invalid-origin error. The developer gets a working app that cannot authenticate, with an error that points at auth rather than at config.

Suggested fix: document in `README.md` that LAN dev requires setting `BETTER_AUTH_URL` to the same LAN origin alongside `ALLOWED_DEV_ORIGINS` — or, in dev only, derive `trustedOrigins` in `lib/auth.ts` from the same list. Do not add a blanket `trustedOrigins: ["*"]`.

### Finding 2 — The variable replaces rather than extends the loopback defaults (P2, medium confidence)

`next.config.ts:3-6` — setting the variable discards `127.0.0.1` entirely.

Failure scenario: developer sets `ALLOWED_DEV_ORIGINS=192.168.1.50` and starts the dev server bound to `0.0.0.0`. The runtime allowlist becomes `['*.localhost', 'localhost', '0.0.0.0', '192.168.1.50']`. A teammate on the same machine browsing `http://127.0.0.1:3000` now sends `Origin: http://127.0.0.1:3000`, which matches nothing, and `blockCrossSiteDEV` blocks the `/_next` and `/__nextjs` internal endpoints — HMR and the dev overlay break on loopback while working over LAN. Confusing, because the developer only added an origin.

The same code path produces an empty array for `ALLOWED_DEV_ORIGINS=` (empty value in `.env.local`): `"".split(",")` → `[""]` → `.filter(Boolean)` → `[]`, which is truthy for `??`, so the fallback is skipped. Same loss of `127.0.0.1`. `localhost` survives either way only because Next hardcodes it.

Suggested fix: always union the parsed value with the loopback defaults, e.g. `Array.from(new Set(["127.0.0.1", "localhost", ...parsed]))`, so the variable is additive and the empty-string case degrades to the default.

### Finding 3 — Origin-shaped values are silently ignored (P2, medium confidence)

`next.config.ts:3-6` passes values through unvalidated, and `isCsrfOriginAllowed` (`csrf-protection.js:78-83`) compares only against a lowercased *hostname*.

Failure scenario: the name `ALLOWED_DEV_ORIGINS` and the neighboring `BETTER_AUTH_URL=http://localhost:3000` in `.env.example` invite a developer to write `ALLOWED_DEV_ORIGINS=http://192.168.1.50:3000`. That string is never equal to the parsed hostname `192.168.1.50` and fails wildcard matching too, so the entry is inert. The dev server blocks the request with a message telling the developer to add the host to `allowedDevOrigins` — which they believe they already did.

Related, lower-likelihood: bare `*` and `**` are rejected by `matchWildcardDomain` (lines 33-35), but `*.*` is not — it matches any two-label domain, so `ALLOWED_DEV_ORIGINS=*.*` would let any drive-by site reach the dev server's internal endpoints while it is listening on the LAN.

Suggested fix: comment `.env.example:4` to state that entries are bare hostnames or IPs (no scheme, no port), and consider stripping a scheme/port in `next.config.ts` and warning on entries containing `*` at config-eval time.

## Test-gap notes

- **No coverage of the parser.** `next.config.ts` has no unit test, and the repo's Vitest setup makes one cheap. The behaviors worth pinning are exactly the ones in Findings 2 and 3: unset → defaults, empty string → currently `[]` (the regression), whitespace like `a , b` → `["a","b"]`, and trailing commas. Extracting the expression into an exported `parseAllowedDevOrigins(raw?: string)` would make this testable without touching the config shape.
- **No end-to-end signal.** `tests/e2e/*` all run against `127.0.0.1` (`playwright.config.ts:17`), so no existing test would catch the loopback breakage in Finding 2. I am not suggesting a LAN e2e test — that is not practical in CI — but it does mean the unit test above is the only realistic guard.
- **Documentation gap.** `.env.example` gained the variable but `README.md:9-17` — the file that walks through `cp .env.example .env.local` and local dev — was not updated. A developer reading the README has no way to learn this knob exists or that it pairs with `BETTER_AUTH_URL` (Finding 1).

## What looks good

- The `?.` / `??` precedence is right. This is a common place to get it wrong, and the unset-variable path correctly short-circuits to the fallback.
- `.trim()` plus `.filter(Boolean)` handles the realistic `.env` formatting mistakes — spaces after commas, a trailing comma — rather than passing empty strings into the allowlist, where `isCsrfOriginAllowed` would have to guard them (it does, at line 80, but defense in depth is right here).
- Preserving the previous hardcoded value as the fallback means no existing developer's workflow changes if they do nothing. Adding `localhost` to that fallback is redundant with Next's built-in allowlist but is harmless and self-documenting.
- Correctly scoped: the config value is only consumed by the dev server's cross-site blocker, so this cannot weaken any production header or auth path. The existing security headers in `next.config.ts:12-24` were left untouched.
- `.env.example` was updated in the same commit as the code, which is the right habit even though the README still needs the same treatment.

