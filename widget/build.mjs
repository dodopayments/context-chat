// Build the embeddable "Ask AI" widget into a single self-contained IIFE.
//
// Two-step build:
//   1. Tailwind CLI compiles src/styles.css -> dist/widget.css (the Shadow-DOM
//      stylesheet: tokens on :host, preflight, AI-Elements utilities, prose).
//   2. esbuild bundles src/index.tsx -> dist/widget.js as a minified IIFE, with
//      the compiled CSS inlined via the ".css" text loader and injected into the
//      shadow root at runtime. No ESM/dynamic imports survive in the output, so
//      the file is fully self-contained and served from the Worker at /widget.js.
//
// Run with: npm run build:widget  (node widget/build.mjs)
// @ts-nocheck
import * as esbuild from "esbuild";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, statSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const srcDir = resolve(here, "src");
const entry = resolve(srcDir, "index.tsx");
const distDir = resolve(here, "dist");
const cssIn = resolve(srcDir, "styles.css");
const cssOut = resolve(distDir, "widget.css");
const outfile = resolve(distDir, "widget.js");
const tailwindConfig = resolve(here, "tailwind.config.cjs");
const watch = process.argv.includes("--watch");

mkdirSync(distDir, { recursive: true });

const tailwindBin = resolve(
  repoRoot,
  "node_modules/.bin",
  process.platform === "win32" ? "tailwindcss.cmd" : "tailwindcss",
);

/** Compile the Tailwind stylesheet to dist/widget.css (must run before esbuild inlines it). */
function buildCss() {
  const result = spawnSync(
    tailwindBin,
    ["-c", tailwindConfig, "-i", cssIn, "-o", cssOut, "--minify"],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`tailwindcss exited with code ${result.status}`);
  }
}

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: [entry],
  outfile,
  bundle: true,
  minify: true,
  // Single self-contained IIFE — no ESM/dynamic imports survive in the output.
  format: "iife",
  platform: "browser",
  // Modern evergreen browsers only (typical docs-site audience).
  target: ["es2020", "chrome96", "firefox96", "safari15", "edge96"],
  // React automatic JSX runtime — a SINGLE React instance is bundled.
  jsx: "automatic",
  jsxImportSource: "react",
  // Inline the compiled Tailwind CSS as a string (injected into the shadow root).
  loader: { ".css": "text" },
  // shadcn / AI-Elements style "@/..." import alias -> widget/src.
  alias: { "@": srcDir },
  legalComments: "none",
  charset: "utf8",
  // Strip dev-only branches so React devtools hooks don't bloat the bundle.
  define: { "process.env.NODE_ENV": '"production"' },
  // AI-Elements / shadcn source files begin with a "use client" directive that is
  // meaningless in a browser IIFE — silence the resulting esbuild warnings.
  logOverride: { "unsupported-directive": "silent" },
  logLevel: "info",
};

function report() {
  const bytes = statSync(outfile).size;
  const kb = (bytes / 1024).toFixed(1);
  // eslint-disable-next-line no-console
  console.log(`widget.js built: ${kb} KB (${bytes} bytes) -> ${outfile}`);
}

if (watch) {
  buildCss();
  const ctx = await esbuild.context(options);
  await ctx.watch();
  // eslint-disable-next-line no-console
  console.log("watching widget/src for changes… (run build again to refresh CSS)");
} else {
  buildCss();
  await esbuild.build(options);
  report();
}
