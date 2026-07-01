import type { Env } from "../types";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Turnstile is on by default; set TURNSTILE_ENABLED="false" to disable (trusted/internal deploys). */
export function turnstileEnabled(env: Env): boolean {
  return env.TURNSTILE_ENABLED !== "false";
}

/** Server-side Turnstile verification. Token is single-use and expires after ~5 minutes. */
export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
  secret: string,
): Promise<boolean> {
  if (!token) return false;

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
  if (!res.ok) return false;

  const outcome = (await res.json()) as { success?: boolean };
  return outcome.success === true;
}
