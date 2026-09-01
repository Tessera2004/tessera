#!/bin/zsh
# Local helper: stores the Supabase CLI login in the current macOS user account.
# Never add a token to this file, Git, or a chat.
set -euo pipefail

NODE_BIN="/Users/brianknuchel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
SUPABASE_CLI="/Users/brianknuchel/Library/pnpm/store/v11/links/@/supabase/2.116.0/6fdb8fe0cc1048795f87eb64c0d571aca26a5044a15d340e5c6518108ff1263a/node_modules/supabase/dist/supabase.js"

if [[ ! -x "$NODE_BIN" || ! -f "$SUPABASE_CLI" ]]; then
  print -u2 "Supabase CLI fehlt. Bitte Codex erneut öffnen und diesen Helfer nochmals ausführen."
  exit 1
fi

read -rs "SUPABASE_TOKEN?Supabase Access Token einfügen und Enter drücken: "
print
"$NODE_BIN" "$SUPABASE_CLI" login --token "$SUPABASE_TOKEN"
unset SUPABASE_TOKEN
print "Supabase CLI ist angemeldet."
