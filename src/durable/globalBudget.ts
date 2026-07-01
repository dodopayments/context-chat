import type { Env } from "../types";

interface BudgetState {
  reqCount: number;
  tokenCount: number;
  windowStart: number;
}

const WINDOW_MS = 24 * 60 * 60 * 1000; // rolling 24h
const STATE_KEY = "state";

/**
 * Singleton Durable Object enforcing a TRUE global cap across all users/colos:
 * a daily request count and a daily token budget. The native per-IP rate-limit
 * binding is per-colo, so this DO is the hard global stop.
 *
 * - POST /check  : pre-call. Increments the request count, 429s when over a cap.
 * - POST /record : post-stream. Adds the tokens actually consumed.
 */
export class GlobalBudgetDO {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const maxReq = Number(this.env.GLOBAL_MAX_REQUESTS_PER_DAY) || 6000;
    const maxTok = Number(this.env.GLOBAL_MAX_TOKENS_PER_DAY) || 10_000_000;
    const now = Date.now();

    let s = (await this.state.storage.get<BudgetState>(STATE_KEY)) ?? {
      reqCount: 0,
      tokenCount: 0,
      windowStart: now,
    };
    if (now - s.windowStart > WINDOW_MS) s = { reqCount: 0, tokenCount: 0, windowStart: now };

    const path = new URL(request.url).pathname;

    if (path === "/record") {
      const body = (await request.json()) as { tokens?: number };
      s.tokenCount += body.tokens ?? 0;
      await this.state.storage.put(STATE_KEY, s);
      return Response.json({ ok: true });
    }

    // /check
    if (s.reqCount >= maxReq) {
      return Response.json({ allowed: false, reason: "global_req_limit" }, { status: 429 });
    }
    if (s.tokenCount >= maxTok) {
      return Response.json({ allowed: false, reason: "global_token_limit" }, { status: 429 });
    }
    s.reqCount += 1;
    await this.state.storage.put(STATE_KEY, s);
    return Response.json({ allowed: true });
  }
}

interface PrecheckResult {
  allowed: boolean;
  reason?: string;
}

function singleton(env: Env) {
  return env.GLOBAL_BUDGET.get(env.GLOBAL_BUDGET.idFromName("singleton"));
}

export async function globalPrecheck(env: Env): Promise<PrecheckResult> {
  const res = await singleton(env).fetch("https://do/check", { method: "POST" });
  return (await res.json()) as PrecheckResult;
}

export async function recordGlobalTokens(env: Env, tokens: number): Promise<void> {
  await singleton(env).fetch("https://do/record", {
    method: "POST",
    body: JSON.stringify({ tokens }),
  });
}
