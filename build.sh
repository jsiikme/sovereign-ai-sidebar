#!/bin/sh
# Construit les deux variantes de l'extension dans dist/ :
#   dist/firefox — Manifest V3 Firefox (event page, icône SVG)
#   dist/brave   — Manifest V3 Chromium/Brave (service worker, icônes PNG)
set -e
cd "$(dirname "$0")"

rm -rf dist
SHARED="defaults.js background.js content.js options.html options.js"

mkdir -p dist/firefox/icons dist/brave/icons
cp $SHARED dist/firefox/
cp $SHARED dist/brave/

cp manifest.json dist/firefox/manifest.json
cp icons/euria.svg dist/firefox/icons/

cp manifest.chromium.json dist/brave/manifest.json
cp icons/euria-48.png icons/euria-128.png dist/brave/icons/

echo "OK :"
echo "  dist/firefox — about:debugging → Charger un module temporaire → manifest.json"
echo "  dist/brave   — brave://extensions → Mode développeur → Charger l'extension non empaquetée"
