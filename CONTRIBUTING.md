# Contributing to ContextChat

Thanks for your interest in improving ContextChat! This project is the embeddable chat
front-end companion to [ContextMCP](https://github.com/dodopayments/context-mcp).

## Getting started

```bash
npm install
cp .dev.vars.example .dev.vars   # add your OPENAI_API_KEY (Turnstile test secret is preset)
npm run build:widget
npm run dev
```

## Before you open a PR

Run the full local gate — all three must pass:

```bash
npm run typecheck     # worker + tests + widget
npm test              # vitest
npm run build:widget  # must produce a bundle with no dynamic import()
```

## Project layout

- `src/` — the Cloudflare Worker (`/chat` pipeline, guards, retrieval adapters, LLM, SSE).
  - `src/retrieval/` — pluggable retrieval adapters behind the `Retriever` interface.
- `widget/` — the embeddable Shadow-DOM chat UI (React, compiled to a single IIFE).
- `test/` — vitest unit tests for the retrieval adapters.

## Guidelines

- **Match the existing style**: strict TypeScript, no `any`, small focused modules.
- **Keep the widget self-contained**: the build must stay a single IIFE with **no dynamic
  `import()`** (CI enforces this) so it can be injected into a Shadow DOM.
- **Adding a retrieval adapter**: implement the `Retriever` type in `src/retrieval/`, register
  it in `src/retrieval/index.ts`, and add a fixture-based unit test for its parser.
- **No secrets in commits.** `.dev.vars` is gitignored; never commit real keys.
- **Keep it brandable**: user-facing strings, colors, and fonts must come from config, not
  hardcoded values.

## Reporting bugs / requesting features

Open an issue with clear reproduction steps (and the adapter/config involved). For security
issues, follow [SECURITY.md](SECURITY.md) instead of filing a public issue.
