#!/bin/zsh
# Startet die Supabase-CLI. Auf diesem Mac gibt es kein globales node/npx —
# beides liegt im Codex-Runtime-Ordner. Aufruf z. B.:
#   bash scripts/supabase.sh functions deploy create-checkout
#   bash scripts/supabase.sh db push
set -euo pipefail

NODE_BIN="/Users/brianknuchel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
SUPABASE_CLI="/Users/brianknuchel/Library/pnpm/store/v11/links/@/supabase/2.116.0/6fdb8fe0cc1048795f87eb64c0d571aca26a5044a15d340e5c6518108ff1263a/node_modules/supabase/dist/supabase.js"

if [[ ! -x "$NODE_BIN" || ! -f "$SUPABASE_CLI" ]]; then
  print -u2 "Supabase CLI fehlt. Bitte Codex erneut oeffnen und nochmals versuchen."
  exit 1
fi

exec "$NODE_BIN" "$SUPABASE_CLI" "$@"
