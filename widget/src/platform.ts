// Platform helpers: mac detection + hotkey parsing/matching for the config
// "hotkey" string (e.g. "mod+i"). "mod" resolves to Cmd on mac, Ctrl elsewhere.

export function isMac(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform) || /mac os x/i.test(navigator.userAgent);
}

interface Hotkey {
  mod: boolean; // requires Cmd (mac) / Ctrl (other)
  shift: boolean;
  alt: boolean;
  key: string; // lowercase, e.g. "i"
}

/** Parse a hotkey string like "mod+shift+i" into its parts. */
export function parseHotkey(spec: string): Hotkey | null {
  const parts = spec
    .toLowerCase()
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const hotkey: Hotkey = { mod: false, shift: false, alt: false, key: "" };
  for (const part of parts) {
    if (part === "mod" || part === "cmd" || part === "ctrl" || part === "control" || part === "meta") {
      hotkey.mod = true;
    } else if (part === "shift") {
      hotkey.shift = true;
    } else if (part === "alt" || part === "option") {
      hotkey.alt = true;
    } else {
      hotkey.key = part;
    }
  }
  return hotkey.key ? hotkey : null;
}

/** True if a keyboard event matches the parsed hotkey (mod = Cmd on mac, Ctrl elsewhere). */
export function matchesHotkey(event: KeyboardEvent, hotkey: Hotkey, mac: boolean): boolean {
  const modPressed = mac ? event.metaKey : event.ctrlKey;
  if (hotkey.mod !== modPressed) return false;
  if (hotkey.shift !== event.shiftKey) return false;
  if (hotkey.alt !== event.altKey) return false;
  // Avoid firing when the "other" modifier is also held (e.g. Ctrl on mac).
  if (hotkey.mod && (mac ? event.ctrlKey : event.metaKey)) return false;
  return event.key.toLowerCase() === hotkey.key;
}
