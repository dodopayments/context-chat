// Cloudflare Turnstile integration (execute mode, non-interactive by default).
//
// Tokens are SINGLE-USE and expire after ~5 minutes, so we obtain a FRESH token
// per POST /chat via reset()+execute(). The widget is rendered into a body-level
// (light DOM) container, NOT the shadow root, because Turnstile's api.js manages
// its <iframe>/challenge at the document level and can't reliably observe a node
// inside a closed-off shadow tree.
//
// API note: the current Turnstile API has NO size:"invisible" (it only accepts
// "normal"|"compact"|"flexible"). Invisible behaviour is achieved with
// execution:"execute" (challenge runs when we call execute()) + appearance:
// "interaction-only" (the widget only becomes visible if a human interaction
// challenge is actually required — otherwise it has no visual footprint).

interface TurnstileRenderOptions {
  sitekey: string;
  execution: "execute";
  appearance: "interaction-only";
  retry: "never";
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    [onloadCallback: `__contextChatTurnstileOnload${string}`]: (() => void) | undefined;
  }
}

const API_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const TOKEN_TIMEOUT_MS = 15000;

interface Pending {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

export class TurnstileController {
  private readonly sitekey: string;
  private widgetId: string | null = null;
  private scriptPromise: Promise<void> | null = null;
  private pending: Pending | null = null;

  constructor(sitekey: string) {
    this.sitekey = sitekey;
  }

  /** Load api.js (once) and render the invisible widget. Idempotent. */
  async init(): Promise<void> {
    await this.loadScript();
    if (this.widgetId) return;

    const api = window.turnstile;
    if (!api) throw new Error("turnstile_unavailable");

    const container = document.createElement("div");
    container.style.cssText =
      "position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483601;";
    document.body.appendChild(container);

    this.widgetId = api.render(container, {
      sitekey: this.sitekey,
      execution: "execute",
      appearance: "interaction-only",
      retry: "never",
      callback: (token: string) => this.settle(token),
      "error-callback": () => this.fail("turnstile_error"),
      "expired-callback": () => this.fail("turnstile_expired"),
      "timeout-callback": () => this.fail("turnstile_timeout"),
    });
  }

  /** Obtain a FRESH single-use token. Resets then executes the invisible challenge. */
  async getToken(): Promise<string> {
    await this.init();
    const api = window.turnstile;
    if (!api || !this.widgetId) throw new Error("turnstile_unavailable");

    // Cancel any in-flight request (only one token at a time).
    if (this.pending) this.pending.reject(new Error("turnstile_superseded"));

    return new Promise<string>((resolve, reject) => {
      let done = false;
      const timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        if (this.pending) this.pending = null;
        reject(new Error("turnstile_timeout"));
      }, TOKEN_TIMEOUT_MS);

      this.pending = {
        resolve: (token) => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          resolve(token);
        },
        reject: (error) => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          reject(error);
        },
      };

      try {
        api.reset(this.widgetId as string);
        api.execute(this.widgetId as string);
      } catch (error) {
        this.pending = null;
        window.clearTimeout(timer);
        if (!done) {
          done = true;
          reject(error instanceof Error ? error : new Error("turnstile_execute_failed"));
        }
      }
    });
  }

  private settle(token: string): void {
    const pending = this.pending;
    this.pending = null;
    pending?.resolve(token);
  }

  private fail(reason: string): void {
    const pending = this.pending;
    this.pending = null;
    pending?.reject(new Error(reason));
  }

  private loadScript(): Promise<void> {
    if (this.scriptPromise) return this.scriptPromise;

    this.scriptPromise = new Promise<void>((resolve, reject) => {
      if (window.turnstile) {
        resolve();
        return;
      }

      const callbackName = `__contextChatTurnstileOnload${Date.now()}` as const;
      window[callbackName] = () => {
        window[callbackName] = undefined;
        resolve();
      };

      const script = document.createElement("script");
      script.src = `${API_SRC}?render=explicit&onload=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        window[callbackName] = undefined;
        reject(new Error("turnstile_script_failed"));
      };
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }
}
