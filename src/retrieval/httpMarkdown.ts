import type { Env, RetrievedChunk } from "../types";
import { searchUrl } from "./common";

/**
 * Back-compat adapter for a search service that returns Markdown blocks
 * separated by a dashed delimiter; each block has `## <title>`, `Source: <url>`,
 * optional `API:` / `Language:` lines, then the content. (This is the format the
 * original ContextMCP/knowledge deployment returns.)
 *
 * The upstream already reranks and routinely returns several distinct sections of
 * the SAME page; we keep all of them so the model gets the full reranked context,
 * and only drop byte-identical url+content repeats. Optional `API`/`Language`
 * labels are carried through `meta`. Pure + exported for unit testing.
 */
export function parseSearchMarkdown(md: string): RetrievedChunk[] {
  const parts = md.split(/\n-{10,}\n/);
  const chunks: RetrievedChunk[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const block = part.trim();
    if (!block || !block.includes("Source:")) continue; // skips the header block

    let title = "";
    let url = "";
    let api: string | undefined;
    let language: string | undefined;
    const contentLines: string[] = [];

    for (const line of block.split("\n")) {
      if (!title && line.startsWith("## ")) title = line.slice(3).trim();
      else if (!url && line.startsWith("Source:")) url = line.slice("Source:".length).trim();
      else if (!api && line.startsWith("API:")) api = line.slice("API:".length).trim();
      else if (!language && line.startsWith("Language:")) language = line.slice("Language:".length).trim();
      else contentLines.push(line);
    }

    if (!url) continue;
    const content = contentLines.join("\n").trim();
    const key = `${url}\n${content}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const meta: Record<string, string> = {};
    if (api) meta.API = api;
    if (language) meta.Language = language;

    chunks.push({ title, url, content, meta: Object.keys(meta).length ? meta : undefined });
  }

  return chunks;
}

/** Markdown back-compat adapter: GET `/search` as text/plain and parse the block format. */
export async function httpMarkdownRetrieve(
  env: Env,
  query: string,
  opts: { limit: number },
): Promise<RetrievedChunk[]> {
  const res = await fetch(searchUrl(env, query, opts.limit), { headers: { Accept: "text/plain" } });
  if (!res.ok) return [];
  return parseSearchMarkdown(await res.text());
}
