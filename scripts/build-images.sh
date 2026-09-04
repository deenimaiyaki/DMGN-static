#!/usr/bin/env bash
# Optimizes source imagery from the legacy WordPress export into responsive WebP.
# Requires: sips (macOS), cwebp (brew install webp)
set -euo pipefail

SRC="${SRC:-/Users/aiwaziri/Downloads/us.sitesucker.mac.sitesucker/www.deenimaiyaki.name.ng/wp-content/uploads/2026/08}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/assets/img"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

# slug|source file|widths|quality
MAP=$(cat <<'EOF'
creative-hub|file_0000000009d88210a7467bd53234091e.png|640 1024 1600|74
dmgn-connect|file_00000000948081f4b195bbf6cbedd979.png|640 1024 1600|74
dmgn-travel|file_000000002600820a97f231d3d8f255a2.png|640 1024 1600|74
mural-minna|1000069908.png|640 1024 1280|62
# mural-detail / mural-wall render <=290px in the case-study strip: 640/1024 only.
mural-detail|IMG-20250211-WA0015.jpg|640 1024|62
mural-wall|IMG-20250211-WA0024.jpg|640 1024|62
reporting-system|file_00000000f13c8210971ff12d18bb6541.png|640 1024 1600|74
growth-strategy|file_0000000012f48246bae959f99a029b9c.png|640 1024 1600|74
consultation|1000069702-1.png|640 1024 1600|74
editorial-illustration|file_0000000035ac8210b8a69f01db60f02a.png|640 1024|74
insight-opay|InShot_20260901_080557937.jpg|640 1024|72
insight-social|InShot_20260822_173144578.jpg|640 1024|72
EOF
)

while IFS='|' read -r slug file widths q; do
  case "$slug" in ""|\#*) continue;; esac
  [ -f "$SRC/$file" ] || { echo "MISSING: $file" >&2; continue; }
  for w in $widths; do
    sips -Z "$w" "$SRC/$file" --out "$TMP/$slug-$w.png" >/dev/null
    cwebp -quiet -q "$q" -m 6 "$TMP/$slug-$w.png" -o "$OUT/$slug-$w.webp"
  done
done <<< "$MAP"

# Logo: square, transparent-safe, small
sips -Z 256 "$SRC/cropped-Dmgn7.png" --out "$TMP/logo.png" >/dev/null
cwebp -quiet -q 88 -m 6 "$TMP/logo.png" -o "$OUT/dmgn-logo-256.webp"
sips -Z 180 "$SRC/cropped-Dmgn7.png" --out "$OUT/apple-touch-icon.png" >/dev/null
sips -Z 48  "$SRC/cropped-Dmgn7.png" --out "$TMP/fav.png" >/dev/null
cp "$TMP/fav.png" "$OUT/../../favicon.png"

# Open Graph card: 1200x630, centre-cropped from the Creative Hub key visual
sips --resampleHeightWidthMax 1400 "$SRC/file_0000000009d88210a7467bd53234091e.png" --out "$TMP/og.png" >/dev/null
sips -c 630 1200 "$TMP/og.png" --out "$TMP/og-crop.png" >/dev/null
cwebp -quiet -q 80 -m 6 "$TMP/og-crop.png" -o "$TMP/og.webp"
dwebp -quiet "$TMP/og.webp" -o "$TMP/og-final.png"
sips -s format jpeg -s formatOptions 55 "$TMP/og-final.png" --out "$OUT/og-dmgn.jpg" >/dev/null 2>&1

echo "--- output ---"
du -ch "$OUT"/*.webp "$OUT"/*.jpg "$OUT"/*.png 2>/dev/null | tail -1
ls -la "$OUT"
