import { describe, expect, it } from "vitest";
import { parseContextMcpResults } from "../src/retrieval/contextmcp";
import { parseHttpJson } from "../src/retrieval/httpJson";

describe("parseContextMcpResults", () => {
  it("maps results[] to normalized chunks (heading→title, metadata.url→url)", () => {
    const chunks = parseContextMcpResults({
      results: [
        {
          score: 0.89,
          heading: "Authentication",
          content: "To authenticate requests, send a Bearer token.",
          metadata: { url: "https://docs.example.com/auth", source: "docs", path: "auth.mdx" },
        },
      ],
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      title: "Authentication",
      url: "https://docs.example.com/auth",
      content: "To authenticate requests, send a Bearer token.",
      meta: { source: "docs" },
    });
  });

  it("falls back to metadata.sourceUrl and metadata.heading", () => {
    const [chunk] = parseContextMcpResults({
      results: [{ content: "Body.", metadata: { sourceUrl: "https://x/y", heading: "Y" } }],
    });
    expect(chunk?.url).toBe("https://x/y");
    expect(chunk?.title).toBe("Y");
  });

  it("drops entries missing url or content, and byte-identical repeats", () => {
    const chunks = parseContextMcpResults({
      results: [
        { content: "", metadata: { url: "https://x/empty" } },
        { content: "dup", metadata: { url: "https://x/d" } },
        { content: "dup", metadata: { url: "https://x/d" } },
        { content: "no url", metadata: {} },
      ],
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.url).toBe("https://x/d");
  });

  it("returns [] for a malformed payload", () => {
    expect(parseContextMcpResults({})).toEqual([]);
    expect(parseContextMcpResults(null)).toEqual([]);
    expect(parseContextMcpResults({ results: "nope" })).toEqual([]);
  });
});

describe("parseHttpJson", () => {
  it("maps { chunks: [...] } and defaults title to url", () => {
    const chunks = parseHttpJson({
      chunks: [
        { url: "https://x/a", content: "A", title: "Alpha", meta: { k: "v" } },
        { url: "https://x/b", content: "B" },
      ],
    });
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ title: "Alpha", url: "https://x/a", content: "A", meta: { k: "v" } });
    expect(chunks[1]?.title).toBe("https://x/b");
  });

  it("drops entries missing url or content and returns [] for malformed input", () => {
    expect(parseHttpJson({ chunks: [{ content: "no url" }, { url: "https://x/c" }] })).toEqual([]);
    expect(parseHttpJson({})).toEqual([]);
  });
});
