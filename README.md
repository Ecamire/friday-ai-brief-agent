# Friday AI Brief agent

I built the agent behind Friday AI Brief. It researches sources, produces a structured newsletter, checks past coverage, and renders an editorial HTML issue. The production workflow also creates visuals, publishes, and delivers the newsletter. This repository is a separate, inspection-focused showcase of the core code.

**Builder:** [Evan Camire](https://evan-camire-portfolio.vercel.app/) · **Read published editions:** [Friday AI Brief archive](https://www.openhour.io/newsletter)

## Run a preview without credentials

Use Node.js 22 or newer:

```sh
npm ci
npm run demo
npm test
```

Open `output/newsletter.html`. The fixture contains fictional companies, stories, and sources. The demo runs the genuine renderer locally; it does not run research, call a model, send email, or publish anything.

## Inspect the pipeline

- `src/research.js`: gathers public sources and prioritizes material for the issue.
- `src/write.js`: sends the research brief to the Anthropic SDK, requests structured output, and checks repeated coverage.
- `src/coverage.js`: indexes previously covered URLs and topics and identifies repeats.
- `src/render.js`: renders structured content as a self-contained editorial HTML issue.
- `src/cost.js`: usage-cost calculations and a bounded budget helper from the original implementation.
- `fixtures/`: fictional local rendering examples.

These modules were selected from the existing implementation. The research, structured-writing, and rendering logic is retained. Source comments about production operations were removed. The writer's model is now an explicit setting. Production signup connections and affiliate recommendations were removed from the renderer, and asset/archive configuration uses sample addresses. HTML attribute escaping was tightened. The preview scripts and focused tests were added for this repository. Cost defaults are historical estimates and must be updated for a chosen provider/model; the optional generation script does not impose a hard spending limit.

## Optional model generation

`npm run generate` gathers public research, calls your chosen model, and saves JSON and HTML **locally**. It uses your own paid provider account. Provide `ANTHROPIC_API_KEY` and `NEWSLETTER_MODEL` through your own secret manager, for example an Infisical-managed process. No credentials belong in this repository. Provider/model availability must match your account. This optional mode is not needed to inspect or test the showcase; the default demo and tests are offline and keyless. The optional generator was not exercised against a paid provider when preparing this showcase.

## Boundary from production

This fresh repository contains no production Git history, subscriber or recipient records, database connections, send logs, tracking links, SMTP delivery, publishing integrations, scheduled workflows, or account configuration. It cannot operate the production newsletter service. Production work remains in a private repository.

The source is available for inspection. It is **not released under an open-source reuse license**. See `RIGHTS.md` and `THIRD_PARTY_NOTICES.md`. Visitors can view or fork according to GitHub’s platform terms; they cannot change this repository without write permission.
