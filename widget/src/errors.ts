// Maps backend / transport failures to friendly inline messages.
//
// The /chat Worker returns non-2xx as JSON { error: string, reason?: string }
// (see src/index.ts). useChat's DefaultChatTransport surfaces a non-2xx response
// as an Error whose message is the response body text — so we parse the JSON code
// out of it and map by code. Local failures (Turnstile) are mapped separately.

const GENERIC = "Something went wrong. Please try again.";

interface ErrorBody {
  error?: string;
  reason?: string;
}

/** Best-effort extraction of the backend `{ error }` code from a useChat Error. */
function parseErrorCode(message: string): ErrorBody | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      const body = parsed as ErrorBody;
      if (typeof body.error === "string") return body;
    }
    return null;
  } catch {
    return null;
  }
}

/** Friendly message for an error surfaced by useChat (HTTP error body, stream failure, or network error). */
export function chatErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const body = parseErrorCode(message);
  const code = body?.error;

  switch (code) {
    case "bot_check_failed":
      // 401 — Turnstile verification rejected by the Worker.
      return "Verification failed, please try again.";
    case "rate_limited":
    case "at_capacity":
      // 429 — per-IP rate limit or global budget reached.
      return "The assistant is busy right now — please try again shortly.";
    case "forbidden_origin":
      // 403 — widget loaded on a non-allowlisted site.
      return GENERIC;
    case "empty_query":
    case "messages_required":
    case "invalid_json":
      return "That request couldn't be processed. Please rephrase and try again.";
    default:
      break;
  }

  // No structured code (network/DNS/CORS or stream abort).
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "I couldn't reach the assistant. Check your connection and try again.";
  }
  return GENERIC;
}

/** Friendly message when a fresh Turnstile token can't be obtained before sending. */
export function verifyErrorMessage(): string {
  return "Verification failed, please try again.";
}
