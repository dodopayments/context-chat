# examples/

Reference material for embedding and demoing ContextChat.

| File | What it is |
|---|---|
| [`embed.html`](embed.html) | A complete host page showing both ways to embed the widget (set `window.ContextChat` + load `widget.js`, or the one-tag `loader.js`). Replace the placeholder URLs with your deployed Worker. |
| [`sample-retrieval-worker.js`](sample-retrieval-worker.js) | A minimal standalone Cloudflare Worker that serves the `http-json` retrieval contract (`GET /search` → `{ chunks: [...] }`). Lets you demo ContextChat end-to-end **without** a full ContextMCP. |

## Quick demo without ContextMCP

1. Deploy the sample retrieval endpoint:
   ```bash
   wrangler deploy examples/sample-retrieval-worker.js --name sample-retrieval --compatibility-date 2024-01-01
   ```
2. Point ContextChat at it (in `wrangler.jsonc` → `vars`):
   ```jsonc
   "RETRIEVAL_PROVIDER": "http-json",
   "RETRIEVAL_URL": "https://sample-retrieval.<your-subdomain>.workers.dev/search"
   ```
3. Deploy ContextChat and open `examples/embed.html` (with the URLs updated).

For real retrieval over your own docs, deploy [ContextMCP](https://contextmcp.ai) instead and
use the default `contextmcp` adapter.

## Local widget QA

To exercise the widget UI without any backend, use the harness instead:

```bash
npm run build:widget
# open widget/harness.html in a browser (it stubs Turnstile + fetch)
```
