# ContextChat

**An embeddable, self-hosted AI chat widget for your documentation.** Drop an "Ask AI"
assistant onto any website or docs page with a single `<script>` tag. ContextChat is a
single Cloudflare Worker that retrieves relevant docs from your search backend, then streams
an **OpenAI** answer with inline citations — behind a **layered abuse-control** stack so a
public endpoint can't be used to burn tokens.

ContextChat is the chat front-end companion to **[ContextMCP](https://github.com/dodopayments/context-mcp)**
([contextmcp.ai](https://contextmcp.ai)) — the self-hosted engine that indexes your docs and
serves them over MCP + a REST `/search` API. **ContextMCP indexes; ContextChat answers.**

> Originally built for the Dodo Payments docs (where it powers "Sentra"), now open source for
> anyone to deploy.

## How it pairs with ContextMCP

```
your docs ──► ContextMCP (indexes + serves /search)  ◄── retrieval ── ContextChat Worker
                                                                            │
host page ──► window.ContextChat config ──► widget.js (Shadow DOM) ── POST /chat ──┘
                                                              └── streamed answer + citations
```

1. **Deploy [ContextMCP](https://contextmcp.ai/docs/quick-start)** pointed at your docs sources.
   It gives you a `https://your-mcp.workers.dev/search` endpoint.
2. **Deploy ContextChat** (this repo) pointed at that endpoint.
3. **Embed the widget** on your docs site with one script tag.

Already have a search backend? You don't need ContextMCP — point ContextChat at any endpoint
using the `http-json` adapter (see [Retrieval adapters](#retrieval-adapters)).

## Architecture

```
host page (any site / docs)
  └─ loader sets window.ContextChat → loads widget.js
       └─ widget (React, Shadow DOM)  ──POST /chat (Turnstile token)──┐
                                                                      ▼
        Cloudflare Worker  (this repo)
          1. CORS + origin allowlist
          2. Turnstile siteverify        (optional)
          3. per-IP rate limit           (native binding)
          4. global request/token/day    (Durable Object)
          5. retrieve: GET RETRIEVAL_URL/search
          6. stream OpenAI via the AI SDK (optionally through AI Gateway)
          7. SSE answer + citations; record tokens
```

### Layered abuse defense
| Layer | Mechanism | Scope |
|---|---|---|
| 1 | Cloudflare WAF rate-limit rule on `/chat` (dashboard, optional) | per-IP, pre-Worker |
| 2 | Turnstile siteverify (optional via `TURNSTILE_ENABLED`) | per-request bot check |
| 3 | Native Workers `ratelimits` binding (20/min) | per-IP backstop |
| 4 | `GlobalBudgetDO` (requests + tokens / day) | true global cap |
| 5 | AI Gateway Spend Limit (dashboard, optional) | global $ budget |
| 6 | In-code caps (`MAX_OUTPUT_TOKENS`, `RETRIEVAL_LIMIT`) | per-request |

## Quick start

```bash
npm install
cp .dev.vars.example .dev.vars     # add your OPENAI_API_KEY
# edit wrangler.jsonc → set RETRIEVAL_URL, ASSISTANT_NAME, COMPANY_NAME, ALLOWED_ORIGINS
npm run build:widget               # build the embeddable bundle
npm run dev                        # local Worker at http://localhost:8787
```

Deploy:

```bash
npm run build:widget
npm run deploy                     # wrangler deploy (set CLOUDFLARE_ACCOUNT_ID in env/CI)
npm run setup:secrets              # OPENAI_API_KEY (+ TURNSTILE_SECRET if enabled)
```

### Automated deploys (optional)

[`.github/workflows/deploy-prod.yml`](.github/workflows/deploy-prod.yml) deploys the Worker
from CI without committing any deployment-specific values. It runs on every push to `main`
(and manual dispatch) and is gated on a `production` GitHub Environment — add required
reviewers there to approve each deploy. To use it:

1. Create a `production` environment (repo → Settings → Environments) and add required reviewers.
2. Add two repository secrets:
   - `CLOUDFLARE_API_TOKEN` — a Cloudflare token with Workers deploy permission.
   - `WRANGLER_PROD_CONFIG` — the full contents of your deployment's `wrangler.jsonc` (kept out
     of the repo). Runtime secrets (`OPENAI_API_KEY` / `TURNSTILE_SECRET` / `CF_AIG_TOKEN`) are
     set once on the Worker via `wrangler secret put` and persist across deploys.

> Do **not** also connect Cloudflare's native "Workers Builds" Git integration to this repo — it
> would deploy from the committed template `wrangler.jsonc` (placeholders) and overwrite your
> deployment. Use either this workflow or manual `wrangler deploy`, not Workers Builds.

## Embed on your site

Build serves `widget.js` from the Worker's static assets. On your host page:

```html
<script>
  window.ContextChat = {
    chatEndpoint: "https://your-worker.workers.dev/chat",
    turnstileSitekey: "0xYOUR_TURNSTILE_SITEKEY",   // omit if Turnstile is disabled
    assistantName: "Acme Assistant",
    tagline: "Answers from the Acme docs",
    starterQuestions: ["How do I authenticate?", "How do webhooks work?"],
    theme: { "--primary": "#4f46e5" }
  };
</script>
<script src="https://your-worker.workers.dev/widget.js" defer></script>
```

See [`examples/embed.html`](examples/embed.html) for a complete page, and
[`embed/loader.js`](embed/loader.js) for a drop-in loader snippet.

## Configuration

### Worker vars (`wrangler.jsonc` → `vars`) and secrets

| Name | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | yes¹ | — | **Secret.** OpenAI API key (BYOK). |
| `MODEL` | no | `gpt-4o-mini` | OpenAI model id. |
| `RETRIEVAL_PROVIDER` | no | `contextmcp` | `contextmcp` \| `http-json` \| `http-markdown`. |
| `RETRIEVAL_URL` | yes | — | Full search endpoint, e.g. `https://your-mcp.workers.dev/search`. |
| `RETRIEVAL_LIMIT` | no | `8` | Max chunks to retrieve. |
| `ASSISTANT_NAME` | yes | — | Assistant name used in the system prompt. |
| `COMPANY_NAME` | yes | — | Company/product the docs are about. |
| `COMPANY_DESC` | no | — | One-line description added to the prompt. |
| `SUPPORT_CONTACT` | yes | — | Where to send users when an answer isn't found. |
| `SYSTEM_PROMPT` | no | — | Full identity override (grounding rules still appended). |
| `ALLOWED_ORIGINS` | yes | — | Comma-separated host-page origin allowlist. |
| `ALLOW_ANY_ORIGIN` | no | `false` | `true` reflects any Origin (insecure). |
| `TURNSTILE_ENABLED` | no | `true` | `false` disables the bot check. |
| `TURNSTILE_SITEKEY` | no | — | Public sitekey (consumed by the widget). |
| `TURNSTILE_SECRET` | yes² | — | **Secret.** Turnstile siteverify key. |
| `MAX_OUTPUT_TOKENS` | no | `800` | Per-answer output cap. |
| `GLOBAL_MAX_REQUESTS_PER_DAY` | no | `6000` | Global daily request cap (DO). |
| `GLOBAL_MAX_TOKENS_PER_DAY` | no | `10000000` | Global daily token cap (DO). |
| `CF_ACCOUNT_ID` / `CF_GATEWAY_ID` | no | — | Set both (+ `CF_AIG_TOKEN` secret) to route via AI Gateway. |
| `CF_AIG_TOKEN` | no | — | **Secret.** AI Gateway auth token. |

¹ Not required if you authenticate OpenAI through AI Gateway with the key stored in the gateway.
² Only required when `TURNSTILE_ENABLED` is not `false`.

### Widget config (`window.ContextChat`)

| Field | Default | Description |
|---|---|---|
| `chatEndpoint` | — (required) | Absolute URL of the Worker's `POST /chat`. |
| `turnstileSitekey` | — | Public Turnstile sitekey. Omit if Turnstile is disabled. |
| `assistantName` | `AI Assistant` | Header/launcher/placeholder name. |
| `tagline` | `Answers from the docs` | Header subtitle. |
| `welcomeHeading` | `Ask {assistantName}` | Empty-state heading. |
| `welcomeSubtext` | `Get answers from the documentation, with sources.` | Empty-state subtext. |
| `launcherLabel` | `Ask AI` | Floating button label. |
| `disclaimer` | `AI can make mistakes…` | Footer disclaimer. |
| `starterQuestions` | `[]` | Suggested prompt chips. |
| `hotkey` | `mod+i` | Toggle hotkey (Cmd on mac, Ctrl elsewhere). |
| `theme` | `{}` | CSS token overrides, e.g. `{ "--primary": "#4f46e5" }`. |
| `themeDark` | `{}` | Dark-mode token overrides (applied under `prefers-color-scheme: dark`). |
| `fontFamily` | system | Body font family (sets `--cc-font-sans`). |
| `fontFamilyDisplay` | `fontFamily` | Display/heading font family (sets `--cc-font-display`). |
| `fontUrl` | — | Stylesheet URL for a custom/web font. |

## Retrieval adapters

Select with `RETRIEVAL_PROVIDER`. Every adapter calls `GET ${RETRIEVAL_URL}?query=&limit=`
and differs only in how it parses the response.

- **`contextmcp`** (default) — parses ContextMCP's REST `/search` JSON:
  `{ results: [{ content, heading?, metadata: { url|sourceUrl } }] }`.
- **`http-json`** — bring-your-own endpoint returning `{ chunks: [{ title, url, content, meta? }] }`.
- **`http-markdown`** — back-compat parser for a `text/plain` block format
  (`## title`, `Source: url`, optional `API:` / `Language:`).

## Theming

Design tokens are CSS custom properties declared on `:host` inside the Shadow DOM (never
leaking to the host page). Override any token at runtime via `window.ContextChat.theme`, e.g.
`{ "--primary": "#7c3aed", "--radius": "1rem" }`. Light/dark follow `prefers-color-scheme`.

## Security

A public `/chat` endpoint is abuse-protected by the layered stack above. Keep Turnstile
enabled and `ALLOWED_ORIGINS` tight for any public deployment. See [SECURITY.md](SECURITY.md).

## Develop

```bash
npm run typecheck     # tsc (worker + tests + widget)
npm test              # vitest (retrieval adapters)
npm run dev           # wrangler dev
npm run build:widget  # build the embeddable bundle
```

## License

[Apache-2.0](LICENSE).
