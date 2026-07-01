# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities. Email
**security@dodopayments.com** with details and reproduction steps. We'll acknowledge
your report and work with you on a fix and coordinated disclosure.

## Security model

ContextChat exposes a **public `POST /chat` endpoint** that spends OpenAI tokens. The
template ships secure-by-default with a layered abuse-control stack; keep it intact for any
public deployment:

1. **Origin allowlist** — `ALLOWED_ORIGINS` restricts which host pages may call `/chat`.
2. **Turnstile** — bot verification on every request (`TURNSTILE_ENABLED=true`, the default).
3. **Per-IP rate limit** — native Workers `ratelimits` binding (20/min).
4. **Global budget** — a Durable Object caps total requests and tokens per day.
5. **Per-request caps** — `MAX_OUTPUT_TOKENS` and `RETRIEVAL_LIMIT`.

Optionally add a **Cloudflare WAF rate-limit rule** on `/chat` (requires a Cloudflare-proxied
custom domain) and an **AI Gateway spend limit** for a hard dollar cap.

## Insecure opt-outs (use with care)

These make abuse easier and should only be used for trusted/internal deployments:

- `ALLOW_ANY_ORIGIN=true` — reflects any request Origin (disables the allowlist).
- `TURNSTILE_ENABLED=false` — disables the bot check (no Turnstile token required).

If you enable either on a public endpoint, compensate with stricter rate limits, lower global
caps, and a WAF rule.

## Secrets

Secrets (`OPENAI_API_KEY`, `TURNSTILE_SECRET`, optional `CF_AIG_TOKEN`) are set via
`wrangler secret put` and are never committed. `.dev.vars` is gitignored and is for local dev
only — use Cloudflare's Turnstile **test** keys there, never production secrets.
