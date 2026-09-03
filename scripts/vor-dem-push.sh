#!/bin/bash
# ============================================================
# MosaOS — Website vor dem Push aufbereiten
# ------------------------------------------------------------
# Zwei Dinge werden nicht von selbst aktuell und fallen erst auf,
# wenn ein Besucher sie meldet:
#
#   1. Die Sprachfassungen unter /fr /it /es /en sind fertiges HTML.
#      Ändert sich ein Text in einer deutschen Seite oder in i18n.js,
#      laufen sie auseinander, bis dieses Skript neu läuft.
#   2. Die Vorschaubilder (og:image) sind Aufnahmen der Seiten. Ändert
#      sich ein Hero, zeigt die Karte beim Teilen den alten Stand.
#
# Deshalb: nach jeder Textänderung einmal
#     bash scripts/vor-dem-push.sh
# dann committen und pushen.
# ============================================================
set -e
cd "$(dirname "$0")/.."

echo "→ Sprachfassungen bauen (/fr /it /es /en)…"
python3 scripts/sprachen-bauen.py

echo ""
echo "→ Vorschaubilder je Seite und Sprache aufnehmen…"
python3 scripts/og-bilder-bauen.py

echo ""
if [ -n "$(git status --porcelain)" ]; then
  echo "✓ Fertig. Geändert:"
  git status --short
  echo ""
  echo "  Jetzt committen und pushen."
else
  echo "✓ Fertig — nichts hat sich geändert, alles war aktuell."
fi
