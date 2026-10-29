#!/bin/bash
# Publica la versión de la app de escritorio que dice desktop/src-tauri/tauri.conf.json, ya armada en su
# borrador de GitHub (Windows por el flujo de GitHub, Mac por `npm run instalador:mac`):
#   1. sube sus instaladores a las descargas (Cloudflare R2, `mio-descargas`), con latest.json apuntando
#      ahí y los links fijos de la landing (`MIO-Windows.exe`, `MIO-Mac-Apple-Silicon.dmg`, y Mac con
#      Intel si se armó);
#   2. publica el borrador en GitHub.
# Desde ahí las apps instaladas avisan "Versión nueva". Ver DEPLOY.md §3.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO=ivysallover/Miodb
PUB=https://pub-21e06231ebb5439a9d49a06fcb08b70a.r2.dev
V=$(python3 -c "import json; print(json.load(open('desktop/src-tauri/tauri.conf.json'))['version'])")
TAG="escritorio-v$V"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

gh release download "$TAG" -R "$REPO" -D "$WORK"
python3 - "$WORK" "$PUB" "$V" <<'PY'
import json, sys
work, pub, version = sys.argv[1:4]
data = json.load(open(f'{work}/latest.json'))
missing = {'darwin-aarch64', 'windows-x86_64'} - set(data['platforms'])
if missing:
    sys.exit(f'Falta armar: {", ".join(sorted(missing))}')
for p in data['platforms'].values():
    p['url'] = f"{pub}/escritorio/{version}/" + p['url'].rsplit('/', 1)[1]
json.dump(data, open(f'{work}/latest-r2.json', 'w'), indent=2, ensure_ascii=False)
print('latest.json:', ', '.join(sorted(data['platforms'])))
PY

put() { npx wrangler r2 object put "mio-descargas/$1" --file "$2" --content-type "$3" --cache-control "$4" --remote >/dev/null && echo "subido $1"; }
FOREVER="public, max-age=31536000, immutable"
SHORT="public, max-age=300"
for f in "$WORK"/*.dmg; do put "escritorio/$V/$(basename "$f")" "$f" application/x-apple-diskimage "$FOREVER"; done
for f in "$WORK"/*.exe "$WORK"/*.tar.gz; do [ -e "$f" ] && put "escritorio/$V/$(basename "$f")" "$f" application/octet-stream "$FOREVER"; done
put escritorio/latest.json "$WORK/latest-r2.json" application/json "$SHORT"
put escritorio/MIO-Windows.exe "$(ls "$WORK"/*x64-setup.exe)" application/octet-stream "$SHORT"
put escritorio/MIO-Mac-Apple-Silicon.dmg "$(ls "$WORK"/*aarch64.dmg)" application/x-apple-diskimage "$SHORT"
INTEL=$(ls "$WORK"/*_x64.dmg 2>/dev/null || true)
[ -n "$INTEL" ] && put escritorio/MIO-Mac-Intel.dmg "$INTEL" application/x-apple-diskimage "$SHORT"

gh release edit "$TAG" -R "$REPO" --draft=false --latest
echo "Publicada $TAG: las apps instaladas ya la ven."
