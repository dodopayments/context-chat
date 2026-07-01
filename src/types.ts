// Shared types for the ContextChat Worker.

import type { UIMessage } from "ai";

export interface Env {
  // ── Secrets (wrangler secret put — never committed) ─────────────────────────
  // Default LLM auth: BYOK OpenAI key used directly. When the AI Gateway vars
  // below are also set, the key may instead live in the gateway (see llm.ts).
  OPENAI_API_KEY?: string;
  // Required only when Turnstile is enabled (the default).
  TURNSTILE_SECRET?: string;
  // Optional: Cloudflare AI Gateway auth token (enables gateway routing).
  CF_AIG_TOKEN?: string;

  // ── LLM config ──────────────────────────────────────────────────────────────
  MODEL: string;
  MAX_OUTPUT_TOKENS: string;
  // Optional AI Gateway routing (non-secret). Set all three to route OpenAI
  // through Cloudflare AI Gateway for caching / spend limits / logging.
  CF_ACCOUNT_ID?: string;
  CF_GATEWAY_ID?: string;

  // ── Retrieval ─────────────────────────────────────────────────────────────
  // Adapter selector: "contextmcp" (default) | "http-json" | "http-markdown".
  RETRIEVAL_PROVIDER?: string;
  // Full search endpoint, e.g. https://your-mcp.workers.dev/search.
  RETRIEVAL_URL: string;
  RETRIEVAL_LIMIT: string;

  // ── Assistant identity (system prompt) ──────────────────────────────────────
  ASSISTANT_NAME: string;
  COMPANY_NAME: string;
  COMPANY_DESC?: string;
  SUPPORT_CONTACT: string;
  // Optional: replace the templated identity block entirely (grounding rules
  // are still appended). Leave unset to use the ASSISTANT_NAME/COMPANY_* template.
  SYSTEM_PROMPT?: string;

  // ── Access / abuse controls ─────────────────────────────────────────────────
  // Comma-separated origin allowlist, e.g. "https://docs.example.com,https://example.com".
  ALLOWED_ORIGINS: string;
  // "true" to allow any origin (reflects the request Origin). Insecure — opt-in only.
  ALLOW_ANY_ORIGIN?: string;
  // "false" to disable Turnstile (trusted/internal deploys). Enabled by default.
  TURNSTILE_ENABLED?: string;
  // Public Turnstile sitekey (safe to commit; consumed by the widget, not the Worker).
  TURNSTILE_SITEKEY?: string;

  // Global daily caps.
  GLOBAL_MAX_REQUESTS_PER_DAY: string;
  GLOBAL_MAX_TOKENS_PER_DAY: string;

  // ── Bindings ────────────────────────────────────────────────────────────────
  IP_RATE_LIMITER: RateLimitBinding;
  GLOBAL_BUDGET: DurableObjectNamespace;
  ASSETS: Fetcher;
}

/** Minimal shape of the native Workers Rate Limiting binding (avoids depending on a specific workers-types export). */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface ChatRequestBody {
  messages: UIMessage[];
  turnstileToken?: string;
  locale?: string;
}

/**
 * A retrieved documentation chunk, normalized across retrieval adapters.
 * `meta` carries optional adapter-specific labels (e.g. API, Language) that are
 * surfaced verbatim in the grounded context.
 */
export interface RetrievedChunk {
  title: string;
  url: string;
  content: string;
  meta?: Record<string, string>;
}

export interface Citation {
  title: string;
  url: string;
}
