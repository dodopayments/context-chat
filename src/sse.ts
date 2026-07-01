import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { streamAnswer } from "./llm";
import type { Citation, Env } from "./types";
import { recordGlobalTokens } from "./durable/globalBudget";

type AnswerResult = ReturnType<typeof streamAnswer>;

/** Build an AI SDK UI message stream: emit citation `source-url` parts, then the streamed answer; record token usage to the global budget out of band. */
export function buildChatResponse(
  result: AnswerResult,
  citations: Citation[],
  env: Env,
  ctx: ExecutionContext,
  cors: Record<string, string>,
): Response {
  const stream = createUIMessageStream({
    execute({ writer }) {
      // Open the assistant message explicitly so the citations and the streamed answer
      // belong to ONE message. Otherwise result.toUIMessageStream() emits its own `start`
      // AFTER these source-url parts, which the client treats as a new message boundary —
      // splitting the citations into a separate bubble and rendering a duplicate
      // "Used N sources" chip. `sendStart: false` suppresses that second boundary.
      writer.write({ type: "start" });
      citations.forEach((c, i) => {
        writer.write({
          type: "source-url",
          sourceId: `cite-${i + 1}`,
          url: c.url,
          title: c.title,
        });
      });
      writer.merge(result.toUIMessageStream({ sendStart: false }));
    },
    onError: () => "The assistant hit an error. Please try again.",
  });

  ctx.waitUntil(
    result.usage.then((u) => recordGlobalTokens(env, u.totalTokens ?? 0)).catch(() => undefined),
  );

  return createUIMessageStreamResponse({ headers: cors, stream });
}

/** Canned deflection when retrieval returns nothing — no OpenAI call, no token spend. */
export function deflectionResponse(env: Env, cors: Record<string, string>): Response {
  const message = `I couldn't find this in the ${env.COMPANY_NAME} documentation. For help, please contact ${env.SUPPORT_CONTACT}.`;
  const stream = createUIMessageStream({
    execute({ writer }) {
      const id = "deflection";
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: message });
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ headers: cors, stream });
}
