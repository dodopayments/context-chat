// Tiny, dependency-free, XSS-safe Markdown renderer for streamed assistant text.
//
// Security model: ALL text is HTML-escaped FIRST, then a SAFE SUBSET of Markdown
// is transformed into a fixed allowlist of tags (p, br, strong, em, code, pre,
// ul/ol/li, a). Raw model HTML is NEVER passed through. Link hrefs are restricted
// to http(s)/mailto and forced to target=_blank rel=noopener noreferrer.
//
// It tolerates incomplete Markdown (partial during streaming): an unclosed code
// fence renders as a code block-in-progress; unmatched emphasis stays literal.

const NUL = "\u0000";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validate a (already HTML-escaped) URL. Escaping does not alter the scheme
 * prefix, so the allowlist check stays valid, and any quote/angle chars in the
 * URL are already entity-encoded — safe to interpolate into an attribute.
 */
function isSafeUrl(escapedUrl: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(escapedUrl.trim());
}

/** Inline-level transforms applied to already-block-split, HTML-escaped text. */
function renderInline(text: string): string {
  let out = escapeHtml(text);

  // Protect inline code spans so emphasis/link syntax inside them is left literal.
  const codeSpans: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_match, code: string) => {
    codeSpans.push(`<code class="cc-code">${code}</code>`);
    return `${NUL}IC${codeSpans.length - 1}${NUL}`;
  });

  // Links: [label](url) — url is already escaped; validate scheme before emitting.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
    if (!isSafeUrl(url)) return match;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  // Bold then italic (bold first so ** is consumed before single *).
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_\w])_([^_\n]+)_/g, "$1<em>$2</em>");

  // Restore protected inline code spans.
  out = out.replace(new RegExp(`${NUL}IC(\\d+)${NUL}`, "g"), (_m, n: string) => codeSpans[Number(n)] ?? "");
  return out;
}

/** Strip an optional leading language token from a fenced code block body. */
function stripCodeFenceLang(body: string): string {
  return body.replace(/^[a-zA-Z0-9+#._-]*\n/, "").replace(/^[a-zA-Z0-9+#._-]*$/, "");
}

interface ExtractResult {
  text: string;
  blocks: string[];
}

/** Replace fenced code blocks (complete, then a trailing unclosed one) with placeholders. */
function extractCodeBlocks(src: string): ExtractResult {
  const blocks: string[] = [];

  let text = src.replace(/```([\s\S]*?)```/g, (_match, body: string) => {
    blocks.push(`<pre class="cc-pre"><code>${escapeHtml(stripCodeFenceLang(body))}</code></pre>`);
    return `\n${NUL}CB${blocks.length - 1}${NUL}\n`;
  });

  // Trailing unclosed fence (mid-stream): render the remainder as a code block.
  const openIndex = text.indexOf("```");
  if (openIndex !== -1) {
    const before = text.slice(0, openIndex);
    const rest = text.slice(openIndex + 3);
    blocks.push(`<pre class="cc-pre"><code>${escapeHtml(stripCodeFenceLang(rest))}</code></pre>`);
    text = `${before}\n${NUL}CB${blocks.length - 1}${NUL}\n`;
  }

  return { text, blocks };
}

const CODE_BLOCK_LINE = new RegExp(`^${NUL}CB(\\d+)${NUL}$`);
const UL_ITEM = /^[-*+]\s+/;
const OL_ITEM = /^\d+[.)]\s+/;
const HEADING = /^(#{1,6})\s+(.*)$/;

/** Render a safe subset of Markdown to an HTML string. */
export function renderMarkdown(src: string): string {
  const { text, blocks } = extractCodeBlocks(src);
  const lines = text.split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return;
    html.push(`<p>${renderInline(paragraph.join("\n")).replace(/\n/g, "<br/>")}</p>`);
    paragraph = [];
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    const codeMatch = trimmed.match(CODE_BLOCK_LINE);
    if (codeMatch) {
      flushParagraph();
      html.push(blocks[Number(codeMatch[1])] ?? "");
      index += 1;
      continue;
    }

    if (trimmed === "") {
      flushParagraph();
      index += 1;
      continue;
    }

    const heading = trimmed.match(HEADING);
    if (heading) {
      flushParagraph();
      const level = Math.min(heading[1]?.length ?? 1, 6);
      html.push(`<p class="cc-h cc-h${level}">${renderInline(heading[2] ?? "")}</p>`);
      index += 1;
      continue;
    }

    if (UL_ITEM.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && UL_ITEM.test((lines[index] ?? "").trim())) {
        items.push(`<li>${renderInline((lines[index] ?? "").trim().replace(UL_ITEM, ""))}</li>`);
        index += 1;
      }
      html.push(`<ul class="cc-ul">${items.join("")}</ul>`);
      continue;
    }

    if (OL_ITEM.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && OL_ITEM.test((lines[index] ?? "").trim())) {
        items.push(`<li>${renderInline((lines[index] ?? "").trim().replace(OL_ITEM, ""))}</li>`);
        index += 1;
      }
      html.push(`<ol class="cc-ol">${items.join("")}</ol>`);
      continue;
    }

    paragraph.push(trimmed);
    index += 1;
  }
  flushParagraph();

  // Restore any code-block placeholders that landed inside other constructs.
  return html
    .join("")
    .replace(new RegExp(`${NUL}CB(\\d+)${NUL}`, "g"), (_m, n: string) => blocks[Number(n)] ?? "");
}
