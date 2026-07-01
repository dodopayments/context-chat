import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { dedupeByUrl } from "../src/retrieval";
import { parseSearchMarkdown } from "../src/retrieval/httpMarkdown";

const fixture = readFileSync(
  fileURLToPath(new URL("./fixtures/search-sample.txt", import.meta.url)),
  "utf8",
);

describe("parseSearchMarkdown", () => {
  const chunks = parseSearchMarkdown(fixture);

  it("extracts at least one chunk and skips the header block", () => {
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => c.title === "Acme Documentation")).toBe(false);
  });

  it("gives every chunk a docs.example.com Source URL", () => {
    for (const c of chunks) {
      expect(c.url).toMatch(/^https:\/\/docs\.example\.com\//);
    }
  });

  it("keeps every distinct chunk, including multiple sections of the same page", () => {
    const sameUrl = chunks.filter((c) => c.url.endsWith("/features/subscription"));
    expect(sameUrl.length).toBe(2);
    expect(sameUrl[0]?.content).not.toBe(sameUrl[1]?.content);
  });

  it("dedupeByUrl collapses to one entry per URL (first wins)", () => {
    const unique = dedupeByUrl(chunks);
    const urls = unique.map((c) => c.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(unique.length).toBe(chunks.length - 1);
  });

  it("captures API + Language metadata when present", () => {
    const withApi = chunks.find((c) => c.meta?.API);
    expect(withApi?.meta?.API).toContain("POST /subscriptions");
    expect(withApi?.meta?.Language).toBe("Python");
  });

  it("keeps the title separate from body content", () => {
    const subs = chunks.find((c) => c.url.endsWith("/features/subscription"));
    expect(subs?.title).toBe("Subscriptions");
    expect(subs?.content).toContain("Subscription Trials");
  });
});
