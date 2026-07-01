// AI Elements `Response` surface, backed by a lightweight, dependency-free,
// XSS-safe Markdown renderer instead of `streamdown`.
//
// WHY NOT streamdown: streamdown transitively pulls in mermaid (~83MB), shiki
// (~3.8MB) and katex (~4.3MB) and uses dynamic import() — incompatible with a
// single self-contained, dynamic-import-free IIFE that must stay small.
//
// SECURITY: renderMarkdown (src/lib/markdown.ts) HTML-escapes ALL input FIRST,
// then transforms only a fixed allowlist of Markdown into a fixed allowlist of
// tags (p, br, strong, em, code, pre, ul/ol/li, a). Raw model HTML is never
// passed through and link hrefs are restricted to http(s)/mailto with
// target=_blank rel=noopener — so the string handed to dangerouslySetInnerHTML
// is already sanitized at the source.
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";

export type ResponseProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children: string;
};

export const Response = ({ className, children, ...props }: ResponseProps) => {
  const sanitizedHtml = renderMarkdown(children ?? "");
  return (
    <div
      className={cn("cc-response", className)}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      {...props}
    />
  );
};
