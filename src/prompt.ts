import type { Env, RetrievedChunk } from "./types";

export function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const head = [`[${i + 1}] ${c.title}`, `Source: ${c.url}`];
      for (const [key, value] of Object.entries(c.meta ?? {})) head.push(`${key}: ${value}`);
      return `${head.join("\n")}\n\n${c.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * The assistant identity block. Either a full `SYSTEM_PROMPT` override (verbatim)
 * or a template built from the assistant/company config vars.
 */
function identity(env: Env): string {
  if (env.SYSTEM_PROMPT && env.SYSTEM_PROMPT.trim()) return env.SYSTEM_PROMPT.trim();

  const about = env.COMPANY_DESC && env.COMPANY_DESC.trim() ? ` ${env.COMPANY_DESC.trim()}` : "";
  return (
    `You are ${env.ASSISTANT_NAME}, the documentation assistant for ${env.COMPANY_NAME}.` +
    `${about} You help developers and users by answering questions strictly from the official documentation.`
  );
}

export function buildSystemPrompt(env: Env, chunks: RetrievedChunk[]): string {
  return [
    identity(env),
    "",
    "GROUNDING",
    "- Use ONLY the CONTEXT below. Never invent endpoints, fields, parameters, prices, or behavior that is not in the CONTEXT.",
    "- If the CONTEXT covers the question only partially, answer the part it supports and briefly say what is not covered.",
    `- If the CONTEXT does not address the question at all, say you could not find it in the documentation and point the user to ${env.SUPPORT_CONTACT}. Do not pad the answer with guesses.`,
    "",
    "ANSWER STYLE",
    "- Open with a direct one or two sentence answer, then add only the detail that helps.",
    "- Be concise and practical: short paragraphs, and tight numbered steps for procedures.",
    "- When the CONTEXT contains a relevant code example or API call, include a short fenced code block (with a language tag) adapted to the question. Keep it minimal and faithful to the CONTEXT.",
    "- Use backticks for endpoints, fields, and values (e.g. `product_id`, `POST /subscriptions`).",
    "- Reply in the same language as the user's question.",
    "",
    "CITATIONS",
    "- The interface displays the source documents to the user automatically, so do NOT append \"[Source](url)\" tags or a sources list to your answer.",
    "- Add an inline Markdown link only when a sentence genuinely benefits from pointing to a specific page (e.g. \"see the [Subscription Integration Guide](url)\"). Never end sentences with a bare \"[Source]\" link.",
    "",
    "CONTEXT:",
    buildContext(chunks),
  ].join("\n");
}
