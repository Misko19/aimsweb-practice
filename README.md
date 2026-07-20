# BrightPath Practice

BrightPath is a privacy-first, independent reading and math practice app inspired by the broad skill categories used in aimswebPlus. It supports guest practice across Pre-K–12 and parent-owned child profiles with progress tracking.

It is not affiliated with Pearson. All practice content is original, and results are never presented as official aimswebPlus scores, percentiles, benchmarks, risk tiers, or predictions.

## Local development

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. The default `DATABASE_PATH` uses a local SQLite database under `data/`; database files are ignored by Git. Better Auth supplies a development-only default secret, but refuses that default in production. A production deployment must set a random `BETTER_AUTH_SECRET` of at least 32 characters and its canonical `BETTER_AUTH_URL`.

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
