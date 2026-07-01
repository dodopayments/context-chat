import type { Env } from "../types";

/** Parsed allowlist of origins from ALLOWED_ORIGINS (comma-separated). */
export function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Insecure opt-in: reflect any request Origin. */
export function allowAnyOrigin(env: Env): boolean {
  return env.ALLOW_ANY_ORIGIN === "true";
}

/**
 * Resolve the CORS `Access-Control-Allow-Origin` value to echo for a request, or
 * null when the request Origin is not allowed (no CORS header is then emitted).
 * - ALLOW_ANY_ORIGIN=true → reflect the request Origin (or "*").
 * - otherwise             → echo the Origin only if it is in the allowlist.
 */
export function resolveCorsOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (allowAnyOrigin(env)) return origin ?? "*";
  if (origin === null) return null;
  return allowedOrigins(env).includes(origin) ? origin : null;
}

/**
 * Browser requests always carry an Origin header; we reject any that isn't allowlisted.
 * Requests with no Origin (server-to-server / curl) are allowed here — they are still
 * gated by Turnstile + rate limits downstream. This only stops cross-site embedding.
 */
export function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  if (origin === null) return true;
  if (allowAnyOrigin(env)) return true;
  return allowedOrigins(env).includes(origin);
}
