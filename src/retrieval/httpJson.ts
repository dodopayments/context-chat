import type { Env, RetrievedChunk } from "../types";
import { searchUrl } from "./common";

/**
 * Parse a generic bring-your-own retrieval endpoint response of the form
 * `{ chunks: RetrievedChunk[] }` (each item: `{ title, url, content, meta? }`).
 * Pure + exported for unit testing.
 */
export function parseHttpJson(json: unknown): RetrievedChunk[] {
  const chunks = (json as { chunks?: unknown } | null)?.chunks;
  if (!Array.isArray(chunks)) return [];

  const out: RetrievedChunk[] = [];
  const seen = new Set<string>();

  for (const raw of chunks as Array<Partial<RetrievedChunk>>) {
    const content = (raw.content ?? "").trim();
    const url = (raw.url ?? "").trim();
    if (!content || !url) continue;

    const key = `${url}\n${content}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      title: (raw.title ?? url).trim(),
      url,
      content,
      meta: raw.meta && typeof raw.meta === "object" ? raw.meta : undefined,
    });
  }

  return out;
}

/** Generic bring-your-own-endpoint adapter: GET `/search` and parse `{ chunks: [...] }`. */
export async function httpJsonRetrieve(
  env: Env,
  query: string,
  opts: { limit: number },
): Promise<RetrievedChunk[]> {
  const res = await fetch(searchUrl(env, query, opts.limit), { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  try {
    return parseHttpJson(await res.json());
  } catch {
    return [];
  }
}
