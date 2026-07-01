import { convertToModelMessages, type UIMessage } from "ai";
import { corsHeaders, preflight } from "./cors";
import { globalPrecheck } from "./durable/globalBudget";
import { checkIpRateLimit } from "./guards/rateLimit";
import { isAllowedOrigin } from "./guards/origin";
import { turnstileEnabled, verifyTurnstile } from "./guards/turnstile";
import { streamAnswer } from "./llm";
import { buildSystemPrompt } from "./prompt";
import { dedupeByUrl, retrieve } from "./retrieval";
import { buildChatResponse, deflectionResponse } from "./sse";
import type { ChatRequestBody, Env } from "./types";

export { GlobalBudgetDO } from "./durable/globalBudget";

function json(obj: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function lastUserText(messages: UIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";
  return lastUser.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n")
    .trim();
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    // Only /chat is handled by the Worker; other paths serve the static widget bundle.
    if (url.pathname !== "/chat") {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
    }

    if (request.method === "OPTIONS") return preflight(request, env);
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);
    if (!isAllowedOrigin(request, env)) return json({ error: "forbidden_origin" }, 403, cors);

    let body: ChatRequestBody;
    try {
      body = await request.json<ChatRequestBody>();
    } catch {
      return json({ error: "invalid_json" }, 400, cors);
    }
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: "messages_required" }, 400, cors);
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? "";

    // Guard pipeline (cheapest checks first; each short-circuits before any OpenAI spend).
    if (turnstileEnabled(env) && !(await verifyTurnstile(body.turnstileToken, ip, env.TURNSTILE_SECRET ?? ""))) {
      return json({ error: "bot_check_failed" }, 401, cors);
    }
    if (!(await checkIpRateLimit(env, ip || "unknown"))) {
      return json({ error: "rate_limited" }, 429, cors);
    }
    const budget = await globalPrecheck(env);
    if (!budget.allowed) {
      return json({ error: "at_capacity", reason: budget.reason }, 429, cors);
    }

    const query = lastUserText(body.messages);
    if (!query) return json({ error: "empty_query" }, 400, cors);

    const chunks = await retrieve(env, query);
    if (chunks.length === 0) return deflectionResponse(env, cors);

    const system = buildSystemPrompt(env, chunks);
    const citations = dedupeByUrl(chunks).map((c) => ({ title: c.title, url: c.url }));
    const result = streamAnswer(env, system, convertToModelMessages(body.messages));
    return buildChatResponse(result, citations, env, ctx, cors);
  },
} satisfies ExportedHandler<Env>;
