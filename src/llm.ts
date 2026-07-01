import { createOpenAI } from "@ai-sdk/openai";
import { smoothStream, streamText, type ModelMessage } from "ai";
import type { Env } from "./types";

/** True when all three AI Gateway vars are present — route OpenAI through Cloudflare AI Gateway. */
function useGateway(env: Env): boolean {
  return Boolean(env.CF_AIG_TOKEN && env.CF_ACCOUNT_ID && env.CF_GATEWAY_ID);
}

/**
 * Stream an OpenAI answer.
 *
 * Default: authenticate directly with `OPENAI_API_KEY` (BYOK).
 * Optional: when the AI Gateway vars are set, route through Cloudflare AI Gateway
 * for caching / spend limits / logging. In gateway mode the OpenAI key may live in
 * the gateway itself; we strip the SDK's Authorization header (it would override
 * BYOK) and authenticate to the gateway via `cf-aig-authorization` instead.
 */
export function streamAnswer(env: Env, system: string, messages: ModelMessage[]) {
  const gateway = useGateway(env);

  const gatewayFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.delete("authorization");
    headers.set("cf-aig-authorization", `Bearer ${env.CF_AIG_TOKEN}`);
    return fetch(input, { ...init, headers });
  };

  const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY ?? "byok-unused",
    ...(gateway
      ? {
          baseURL: `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.CF_GATEWAY_ID}/openai`,
          fetch: gatewayFetch,
        }
      : {}),
  });

  return streamText({
    model: openai(env.MODEL),
    system,
    messages,
    maxOutputTokens: Number(env.MAX_OUTPUT_TOKENS) || 800,
    // Gateway buffers the answer then bursts every token delta in <30ms (UI painted it
    // at once); smoothStream re-paces that into a word-by-word stream (content unchanged).
    experimental_transform: smoothStream({ delayInMs: 15, chunking: "word" }),
  });
}
