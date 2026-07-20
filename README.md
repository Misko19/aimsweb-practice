# BrightPath Practice

BrightPath is a privacy-first, independent reading and math practice app inspired by the broad skill categories used in aimswebPlus. Its 27-activity catalog supports guest practice across Pre-K–12 and parent-owned child profiles with progress tracking.

It is not affiliated with Pearson. All practice content is original, and results are never presented as official aimswebPlus scores, percentiles, benchmarks, risk tiers, or predictions.

## Local development

```bash
cp .env.example .env.local
# Replace BETTER_AUTH_SECRET with a random 32+ character value
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. The default `DATABASE_PATH` uses a local SQLite database under `data/`; database files are ignored by Git. The build fails closed unless `BETTER_AUTH_SECRET` contains a random value of at least 32 characters and `BETTER_AUTH_URL` contains the canonical app URL. Never reuse the example or test secrets in a deployment.

### Local network development

To use BrightPath from another device on your local network, bind the server to all interfaces and set both URL settings to the computer’s LAN address:

```bash
BETTER_AUTH_URL=http://192.168.1.14:3000 ALLOWED_DEV_ORIGINS=192.168.1.14 npm run dev -- --hostname 0.0.0.0
```

Replace `192.168.1.14` with the development computer’s current LAN address. `ALLOWED_DEV_ORIGINS` accepts comma-separated bare hostnames or IP addresses without schemes, ports, paths, or wildcards. `BETTER_AUTH_URL` must use the same browser-visible origin so parent sign-in and sign-up pass origin validation.

## Listening audio

Listening cues are pre-generated as static WAV files with `gemini-3.1-flash-tts-preview` and the Erinome voice. The API key is used only by the offline generator and is never sent to the browser. To regenerate missing assets after adding `GEMINI_API_KEY` to `.env`:

```bash
npm run audio:generate
```

The generator resumes existing files, follows a free-tier-safe request cadence, retries transient failures, and writes a SHA-256 manifest beside the audio. Use `npm run audio:generate -- --force` only when every cue should be replaced.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e -- --project=chromium --project=mobile
```

## Research and safety

- [Assessment research](docs/assessment-research.md)
- [Product and UX principles](docs/product-and-ux.md)

Cloud child profiles are intentionally privacy-minimal. A public launch still requires qualified COPPA/privacy and trademark review, a production database, transactional email, and a legally adequate parental-consent flow.
