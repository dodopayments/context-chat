// Public, host-page-provided configuration for the widget. The embed loader sets
// window.ContextChat with these fields BEFORE widget.js loads. Conversation/streaming
// types come from the AI SDK (`ai` / `@ai-sdk/react`) — the widget does not redefine
// the wire protocol.

export interface ContextChatConfig {
  /** Absolute URL of the Worker's POST /chat endpoint. */
  chatEndpoint: string;
  /** PUBLIC Cloudflare Turnstile sitekey. Omit when the backend has Turnstile disabled. */
  turnstileSitekey?: string;

  /** Assistant display name (header, launcher aria-label, placeholder). Default "AI Assistant". */
  assistantName?: string;
  /** Short header subtitle, e.g. "Answers from the docs". */
  tagline?: string;
  /** Empty-state heading. Default `Ask ${assistantName}`. */
  welcomeHeading?: string;
  /** Empty-state subtext under the heading. */
  welcomeSubtext?: string;
  /** Floating launcher button label. Default "Ask AI". */
  launcherLabel?: string;
  /** Small footer disclaimer under the composer. */
  disclaimer?: string;
  /** Optional suggested prompts shown as clickable chips in the empty state. */
  starterQuestions?: string[];
  /** Hotkey to toggle the panel. Default "mod+i" (Cmd on mac, Ctrl elsewhere). */
  hotkey?: string;

  /** CSS design-token overrides (e.g. { "--primary": "#6d28d9" }), applied to the shadow host. */
  theme?: Record<string, string>;
  /** Dark-mode design-token overrides, applied under prefers-color-scheme: dark. */
  themeDark?: Record<string, string>;
  /** Body font family applied to the widget (sets --cc-font-sans). */
  fontFamily?: string;
  /** Display/heading font family (sets --cc-font-display); falls back to fontFamily when unset. */
  fontFamilyDisplay?: string;
  /** Optional stylesheet URL for a custom/web font (e.g. a Google Fonts href). */
  fontUrl?: string;
}

declare global {
  interface Window {
    ContextChat?: ContextChatConfig;
  }
}
