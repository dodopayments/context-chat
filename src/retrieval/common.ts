import type { Env } from "../types";

/** Build the search request URL: `${RETRIEVAL_URL}?query=&limit=`. Shared by every adapter. */
export function searchUrl(env: Env, query: string, limit: number): string {
  const url = new URL(env.RETRIEVAL_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  return url.toString();
}
