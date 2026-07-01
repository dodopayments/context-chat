import type { ContextChatConfig } from "./types";

/** A fully-resolved config with every field defaulted. */
export interface ResolvedConfig {
  chatEndpoint: string;
  turnstileSitekey: string;
  assistantName: string;
  tagline: string;
  welcomeHeading: string;
  welcomeSubtext: string;
  launcherLabel: string;
  disclaimer: string;
  starterQuestions: string[];
  hotkey: string;
  theme: Record<string, string>;
  themeDark: Record<string, string>;
  fontFamily: string;
  fontFamilyDisplay: string;
  fontUrl: string;
}

const DEFAULT_HOTKEY = "mod+i";

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function str(value: unknown, fallback: string): string {
  return nonEmptyString(value) ? value.trim() : fallback;
}

function parseTokens(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (value && typeof value === "object") {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (typeof val === "string") out[key] = val;
    }
  }
  return out;
}

/**
 * Read and validate the host-page config (window.ContextChat). Returns null
 * (after a console.warn) when the global is missing or chatEndpoint is absent —
 * the caller then renders nothing. Never throws (fail safe). turnstileSitekey is
 * optional: omit it when the backend runs with Turnstile disabled.
 */
export function readConfig(): ResolvedConfig | null {
  const raw: ContextChatConfig | undefined = window.ContextChat;
  if (!raw || typeof raw !== "object") {
    console.warn("[ContextChat] window.ContextChat is not set; assistant not rendered.");
    return null;
  }
  if (!nonEmptyString(raw.chatEndpoint)) {
    console.warn("[ContextChat] config.chatEndpoint is missing; assistant not rendered.");
    return null;
  }

  const starterQuestions = Array.isArray(raw.starterQuestions)
    ? raw.starterQuestions.filter(nonEmptyString).map((q) => q.trim())
    : [];

  const assistantName = str(raw.assistantName, "AI Assistant");

  return {
    chatEndpoint: raw.chatEndpoint.trim(),
    turnstileSitekey: str(raw.turnstileSitekey, ""),
    assistantName,
    tagline: str(raw.tagline, "Answers from the docs"),
    welcomeHeading: str(raw.welcomeHeading, `Ask ${assistantName}`),
    welcomeSubtext: str(raw.welcomeSubtext, "Get answers from the documentation, with sources."),
    launcherLabel: str(raw.launcherLabel, "Ask AI"),
    disclaimer: str(raw.disclaimer, "AI can make mistakes. Verify important details in the docs."),
    starterQuestions,
    hotkey: nonEmptyString(raw.hotkey) ? raw.hotkey.trim().toLowerCase() : DEFAULT_HOTKEY,
    theme: parseTokens(raw.theme),
    themeDark: parseTokens(raw.themeDark),
    fontFamily: str(raw.fontFamily, ""),
    fontFamilyDisplay: str(raw.fontFamilyDisplay, ""),
    fontUrl: str(raw.fontUrl, ""),
  };
}
