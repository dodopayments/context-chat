// Minimal sample retrieval endpoint for the `http-json` adapter.
//
// A standalone Cloudflare Worker that answers GET /search?query=&limit= with the
// shape ContextChat's `http-json` adapter expects: { chunks: [{ title, url, content }] }.
// Use it to demo ContextChat WITHOUT deploying a full ContextMCP instance.
//
// Deploy (from a fresh dir):
//   wrangler deploy examples/sample-retrieval-worker.js --name sample-retrieval --compatibility-date 2024-01-01
// Then set ContextChat's vars:
//   RETRIEVAL_PROVIDER=http-json
//   RETRIEVAL_URL=https://sample-retrieval.<subdomain>.workers.dev/search
//
// This returns the same canned docs for any query — it exists only to exercise the
// end-to-end flow. Replace it with ContextMCP (https://contextmcp.ai) for real retrieval.

const DOCS = [
  {
    title: "Authentication",
    url: "https://docs.example.com/authentication",
    content:
      "Authenticate API requests by sending your API key in the Authorization header: " +
      "`Authorization: Bearer <API_KEY>`. Keys are created in the dashboard under Settings → API Keys.",
  },
  {
    title: "Webhooks",
    url: "https://docs.example.com/webhooks",
    content:
      "Webhooks notify your server of events. Create an endpoint in the dashboard, then verify " +
      "each delivery using the `X-Signature` header (HMAC-SHA256 of the raw body with your signing secret).",
  },
  {
    title: "Subscriptions",
    url: "https://docs.example.com/subscriptions",
    content:
      "Create a subscription with `POST /subscriptions`, passing a `product_id` and a `customer`. " +
      "Subscriptions support trials via the `trial_period_days` field.",
  },
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", version: "sample-1" });
    }
    if (url.pathname !== "/search") {
      return new Response("Not found", { status: 404 });
    }

    const limit = Number(url.searchParams.get("limit")) || 5;
    const chunks = DOCS.slice(0, limit);

    return new Response(JSON.stringify({ chunks }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
