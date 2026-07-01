import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { readConfig, type ResolvedConfig } from "@/config";
// Compiled Tailwind stylesheet, inlined as a string by esbuild (.css text loader)
// and injected into the shadow root at runtime — never into the host document.
import widgetCss from "../dist/widget.css";

const HOST_ID = "context-chat-host";
const PORTAL_ID = "context-chat-portal";
const FONT_LINK_ID = "context-chat-font";

// Security: reject values with CSS metacharacters so a token value can't break out of the rule.
function tokenDeclarations(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .filter(([token, value]) => token.startsWith("--") && !/[{}<>;]/.test(value))
    .map(([token, value]) => `${token}:${value};`)
    .join("");
}

// Emitted as a :host block plus an @media(dark) :host block (not inline styles, which
// can't express a dark variant); injected after the base sheet so it wins by source order.
function themeOverrideCss(config: ResolvedConfig): string {
  const light: Record<string, string> = { ...config.theme };
  if (config.fontFamily) light["--cc-font-sans"] = config.fontFamily;
  if (config.fontFamilyDisplay) light["--cc-font-display"] = config.fontFamilyDisplay;

  let css = tokenDeclarations(light);
  css = css ? `:host{${css}}` : "";
  const dark = tokenDeclarations(config.themeDark);
  if (dark) css += `@media (prefers-color-scheme: dark){:host{${dark}}}`;
  return css;
}

/** Load an optional custom font stylesheet at the document level (registers @font-face for matching). */
function loadFont(fontUrl: string): void {
  if (!fontUrl || document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = fontUrl;
  document.head.appendChild(link);
}

function mount(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Idempotent: a second load (e.g. SPA re-injection) must not create a second host.
  if (document.getElementById(HOST_ID)) return;

  const config = readConfig();
  if (!config) return; // readConfig() already console.warned about missing config.

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Inject the widget's compiled Tailwind/theme CSS INTO the shadow root only, so
  // it cannot leak into the host page and the host page's CSS cannot leak in.
  // Design tokens are declared on :host inside this stylesheet.
  const style = document.createElement("style");
  style.textContent = widgetCss;
  shadow.appendChild(style);

  const overrides = themeOverrideCss(config);
  if (overrides) {
    const overrideStyle = document.createElement("style");
    overrideStyle.textContent = overrides;
    shadow.appendChild(overrideStyle);
  }
  loadFont(config.fontUrl);

  const mountNode = document.createElement("div");
  shadow.appendChild(mountNode);

  // Separate in-shadow portal container for any future Radix portal-based primitive,
  // so its DOM (and injected styles) stay inside the shadow root.
  const portal = document.createElement("div");
  portal.id = PORTAL_ID;
  shadow.appendChild(portal);

  createRoot(mountNode).render(<App config={config} />);
}

mount();
