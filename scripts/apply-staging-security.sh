#!/bin/zsh
# Applies the next security migration to MosaOS staging. The password is read
# directly by Supabase and is neither printed nor saved in this repository.
set -euo pipefail

NODE_BIN="/Users/brianknuchel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
SUPABASE_CLI="/Users/brianknuchel/Library/pnpm/store/v11/links/@/supabase/2.116.0/6fdb8fe0cc1048795f87eb64c0d571aca26a5044a15d340e5c6518108ff1263a/node_modules/supabase/dist/supabase.js"
PROJECT_REF="kxhsroiholjnyisaystr"

"$NODE_BIN" "$SUPABASE_CLI" db push --project-ref "$PROJECT_REF"
