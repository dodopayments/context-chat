# widget/

The embeddable ContextChat UI. Build output goes to `widget/dist/` and is served by the
Worker via the `assets` binding in `wrangler.jsonc` (as `/widget.js`).

- **React + TypeScript**, compiled by `esbuild` to a single self-contained IIFE
  `dist/widget.js` (no ESM/dynamic imports survive — CI enforces this).
- Rendered inside a **Shadow DOM** host (`#context-chat-host`) so the host page's CSS can't
  leak in or out. Design tokens live on `:host`; override them at runtime via
  `window.ContextChat.theme`.
- Floating launcher button + chat panel, toggle hotkey (default `Cmd/Ctrl-I`).
- Renders an invisible **Turnstile** widget (when `turnstileSitekey` is set) and attaches the
  token to every `POST /chat` call.
- Consumes the `/chat` SSE stream: incremental Markdown render, then citation chips
  (`target="_blank"`).

## Build & QA

```bash
npm run build:widget     # one-shot build → dist/widget.js + dist/widget.css
npm run watch:widget     # rebuild on change
```

`harness.html` is a standalone QA page: it stubs Turnstile + `fetch` and injects a hostile
host-page stylesheet to prove Shadow-DOM style isolation. Open it after a build (it loads
`./dist/widget.js`).

## Host-page contract

The host page sets `window.ContextChat` (see the repo README for all fields) **before**
`widget.js` loads. A ready-made loader lives at [`../embed/loader.js`](../embed/loader.js).
