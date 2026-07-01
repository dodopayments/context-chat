import type { Env } from "../types";

/** Per-IP rate limit via the native Workers binding. Returns true if the request is allowed. */
export async function checkIpRateLimit(env: Env, ip: string): Promise<boolean> {
  const { success } = await env.IP_RATE_LIMITER.limit({ key: ip });
  return success;
}
