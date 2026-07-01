#!/usr/bin/env bash
#
# Sets the production secrets on the deployed Worker.
# Run this AFTER a first `wrangler deploy` (wrangler secret put targets a deployed Worker).
#
# You'll be prompted to paste each value. Values go straight to Cloudflare —
# they are never written to this repo, git, or your shell history.
#
# Usage: npm run setup:secrets   (or: bash scripts/set-secrets.sh)

set -euo pipefail

echo "→ OPENAI_API_KEY  (paste your OpenAI API key, then press Enter)"
echo "   Skip this if you route through Cloudflare AI Gateway with the key stored in the gateway."
npx wrangler secret put OPENAI_API_KEY

echo
echo "→ TURNSTILE_SECRET  (paste your Cloudflare Turnstile *secret* key, then press Enter)"
echo "   Skip this if you run with TURNSTILE_ENABLED=false."
npx wrangler secret put TURNSTILE_SECRET

echo
echo "✓ Done. Verify with:  npx wrangler secret list"
echo "  Optional (AI Gateway routing only):  npx wrangler secret put CF_AIG_TOKEN"
