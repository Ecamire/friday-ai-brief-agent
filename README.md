# Friday AI Brief agent

I built the agent behind Friday AI Brief. It researches sources, produces a structured newsletter, checks past coverage, and renders an editorial HTML issue. The production workflow also creates visuals, publishes, and delivers the newsletter. This repository is a separate, inspection-focused showcase of the core code.

**Builder:** [Evan Camire](https://evan-camire-portfolio.vercel.app/) · **Read published editions:** [Friday AI Brief archive](https://www.openhour.io/newsletter)

## Where this code comes from

This is a curated export of code used by the private production agent. The production entry point imports the same research, writer, coverage, and HTML renderer modules. It is not a complete copy of the production service. The table below distinguishes retained implementation from showcase adaptations.

| Area | Production code retained | Showcase changes |
| --- | --- | --- |
| [Research](src/research.js) | Public-source collection, freshness windows, source prioritization, and corpus assembly | Source comments and formatting removed; implementation unchanged |
| [Coverage](src/coverage.js) | URL normalization, topic matching, repeat detection, and coverage briefs | Source comments and formatting removed; implementation unchanged |
| [Writing](src/write.js) | Production prompts, structured-output schema, coverage checks, and retry behavior | Model name is supplied by the visitor instead of the production default; missing model setting produces a clear error |
| [Rendering](src/render.js) | Newsletter layout, typography, story composition, sources, and supporting asset rendering | Production signup connection removed, affiliate section omitted, and HTML attribute escaping tightened |
| [Supporting modules](src/) | Budget calculations, edition metadata, image helpers, logo rendering, and video helpers | Same implementation apart from comments/formatting; sample theme URLs replace production endpoints and the affiliate helper is disabled |
| [Demo and tests](scripts/demo.js) | Demo calls the retained HTML renderer | Fictional fixture, local demo/generation entry points, and focused tests are new for this showcase |

The keyless demo demonstrates the real renderer using fictional content. It does not run the research/model stages or demonstrate production delivery. The optional generator uses the retained research and writing modules, with the visitor’s own model credentials, and saves output locally.

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
