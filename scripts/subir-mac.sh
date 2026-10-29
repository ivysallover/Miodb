#!/bin/bash
# El instalador de Mac con Apple Silicon de una versión de la app de escritorio, armado en esta Mac
# (`npm run instalador:mac`): lo arma con la clave de ~/.tauri, lo suma al borrador de la versión que dice
# desktop/src-tauri/tauri.conf.json (lo crea si todavía no está) y agrega su parte a latest.json sin pisar
# la de Windows, que arma GitHub (.github/workflows/escritorio.yml). Ver DEPLOY.md §3.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO=ivysallover/Miodb
V=$(python3 -c "import json; print(json.load(open('desktop/src-tauri/tauri.conf.json'))['version'])")
TAG="escritorio-v$V"
BUNDLE=desktop/target.nosync/release/bundle
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

npm run instalador

# El borrador de la versión: si GitHub todavía no lo creó, se crea acá (con lo que trae, de novedades.md).
gh release view "$TAG" -R "$REPO" >/dev/null 2>&1 ||
  gh release create "$TAG" -R "$REPO" --draft --target "$(git rev-parse HEAD)" --title "MIO para escritorio $V" --notes-file desktop/novedades.md

cp "$BUNDLE/dmg/MIO_${V}_aarch64.dmg" "$WORK/"
cp "$BUNDLE/macos/MIO.app.tar.gz" "$WORK/MIO_aarch64.app.tar.gz"
cp "$BUNDLE/macos/MIO.app.tar.gz.sig" "$WORK/MIO_aarch64.app.tar.gz.sig"

# latest.json: el que haya en el borrador (o uno nuevo) con la entrada de Mac con Apple Silicon.
gh release download "$TAG" -R "$REPO" -p latest.json -D "$WORK" 2>/dev/null || true
python3 - "$WORK" "$V" "$REPO" "$TAG" <<'PY'
import datetime, json, os, sys
work, version, repo, tag = sys.argv[1:5]
path = os.path.join(work, 'latest.json')
data = json.load(open(path)) if os.path.exists(path) else {}
data.setdefault('version', version)
data.setdefault('notes', open('desktop/novedades.md').read().strip())
data.setdefault('pub_date', datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'))
entry = {
    'signature': open(os.path.join(work, 'MIO_aarch64.app.tar.gz.sig')).read(),
    'url': f'https://github.com/{repo}/releases/download/{tag}/MIO_aarch64.app.tar.gz',
}
data.setdefault('platforms', {}).update({'darwin-aarch64': entry, 'darwin-aarch64-app': entry})
json.dump(data, open(path, 'w'), indent=2, ensure_ascii=False)
print('latest.json:', ', '.join(sorted(data['platforms'])))
PY

gh release upload "$TAG" -R "$REPO" --clobber "$WORK/MIO_${V}_aarch64.dmg" "$WORK/MIO_aarch64.app.tar.gz" "$WORK/MIO_aarch64.app.tar.gz.sig" "$WORK/latest.json"
echo "Mac con Apple Silicon sumada a $TAG."
