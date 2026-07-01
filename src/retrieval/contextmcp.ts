import type { Env, RetrievedChunk } from "../types";
import { searchUrl } from "./common";

interface ContextMcpResult {
  score?: number;
  heading?: string;
  content?: string;
  metadata?: {
    url?: string;
    sourceUrl?: string;
    heading?: string;
    title?: string;
    source?: string;
    path?: string;
  };
}

/**
 * Parse a ContextMCP REST `/search` JSON response into normalized chunks.
 * Shape: `{ results: [{ score, content, heading?, metadata: { url|sourceUrl, heading?, source? } }] }`.
 * Pure + exported for unit testing.
 */
export function parseContextMcpResults(json: unknown): RetrievedChunk[] {
  const results = (json as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];

  const chunks: RetrievedChunk[] = [];
  const seen = new Set<string>();

  for (const raw of results as ContextMcpResult[]) {
    const content = (raw.content ?? "").trim();
    const url = (raw.metadata?.url ?? raw.metadata?.sourceUrl ?? "").trim();
    if (!content || !url) continue;

    const key = `${url}\n${content}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const title = (raw.heading ?? raw.metadata?.heading ?? raw.metadata?.title ?? url).trim();
    const meta: Record<string, string> = {};
    if (raw.metadata?.source) meta.source = raw.metadata.source;

    chunks.push({ title, url, content, meta: Object.keys(meta).length ? meta : undefined });
  }

  return chunks;
}

/** ContextMCP adapter (default): GET the REST `/search` endpoint and parse JSON results. */
export async function contextmcpRetrieve(
  env: Env,
  query: string,
  opts: { limit: number },
): Promise<RetrievedChunk[]> {
  const res = await fetch(searchUrl(env, query, opts.limit), { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  try {
    return parseContextMcpResults(await res.json());
  } catch {
    return [];
  }
}
