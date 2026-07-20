# BrightPath Practice

BrightPath is a privacy-first, independent reading and math practice app inspired by the broad skill categories used in aimswebPlus. It supports guest practice across Pre-K–12 and parent-owned child profiles with progress tracking.

It is not affiliated with Pearson. All practice content is original, and results are never presented as official aimswebPlus scores, percentiles, benchmarks, risk tiers, or predictions.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

## Research and safety

- [Assessment research](docs/assessment-research.md)
- [Product and UX principles](docs/product-and-ux.md)

Cloud child profiles are intentionally privacy-minimal. A public launch still requires qualified COPPA/privacy and trademark review, a production database, transactional email, and a legally adequate parental-consent flow.
