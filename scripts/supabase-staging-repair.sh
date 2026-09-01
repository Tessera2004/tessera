#!/bin/zsh
# Registriert die bereits manuell angewendeten Staging-Migrationen in der
# Supabase-Historie. Das Passwort wird nur lokal abgefragt und nie gespeichert.
set -euo pipefail

NODE_BIN="/Users/brianknuchel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
SUPABASE_CLI="/Users/brianknuchel/Library/pnpm/store/v11/links/@/supabase/2.116.0/6fdb8fe0cc1048795f87eb64c0d571aca26a5044a15d340e5c6518108ff1263a/node_modules/supabase/dist/supabase.js"
PROJECT_REF="kxhsroiholjnyisaystr"

if [[ ! -x "$NODE_BIN" || ! -f "$SUPABASE_CLI" ]]; then
  print -u2 "Supabase CLI fehlt. Bitte zuerst scripts/supabase-login.sh ausführen."
  exit 1
fi

read -rs "STAGING_DB_PASSWORD?Datenbank-Passwort von mosaos-staging eingeben und Enter drücken: "
print
"$NODE_BIN" "$SUPABASE_CLI" migration repair --status applied \
  --project-ref "$PROJECT_REF" \
  --password "$STAGING_DB_PASSWORD" \
  202609010000 202609010001
unset STAGING_DB_PASSWORD
print "Staging-Migrationshistorie ist aktualisiert."
