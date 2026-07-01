import type { Env, RetrievedChunk } from "../types";
import { contextmcpRetrieve } from "./contextmcp";
import { httpJsonRetrieve } from "./httpJson";
import { httpMarkdownRetrieve } from "./httpMarkdown";

/** A retrieval adapter: fetch + normalize results for a query. Returns [] on any upstream failure. */
export type Retriever = (
  env: Env,
  query: string,
  opts: { limit: number },
) => Promise<RetrievedChunk[]>;

const RETRIEVERS: Record<string, Retriever> = {
  contextmcp: contextmcpRetrieve,
  "http-json": httpJsonRetrieve,
  "http-markdown": httpMarkdownRetrieve,
};

/** Resolve the configured retrieval adapter (defaults to `contextmcp`). */
export function selectRetriever(env: Env): Retriever {
  const key = (env.RETRIEVAL_PROVIDER ?? "contextmcp").trim();
  return RETRIEVERS[key] ?? contextmcpRetrieve;
}

/** Fetch + normalize retrieval results for a query using the configured adapter. */
export function retrieve(env: Env, query: string): Promise<RetrievedChunk[]> {
  const limit = Number(env.RETRIEVAL_LIMIT) || 8;
  return selectRetriever(env)(env, query, { limit });
}

/** Collapse a list to one entry per URL (first occurrence wins) — used for citation chips. */
export function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.url) ? false : (seen.add(item.url), true)));
}
