#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/smartseacrch"
APP_BIN="$APP_HOME/smartseacrch"
DESKTOP_DIR="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
APPLICATIONS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/512x512/apps"
ICON_DST="$ICON_DIR/smartseacrch.png"

cd "$ROOT"

if [[ ! -x "$ROOT/release/linux-unpacked/smartseacrch" ]]; then
  echo "Baue SmartSeacrch…"
  npm run build
  npx electron-builder --linux dir
fi

mkdir -p "$APP_HOME" "$APPLICATIONS_DIR" "$DESKTOP_DIR" "$ICON_DIR" \
  "${XDG_DATA_HOME:-$HOME/.local/share}/pixmaps"
rm -rf "$APP_HOME"
mkdir -p "$APP_HOME"
cp -a "$ROOT/release/linux-unpacked/." "$APP_HOME/"
cp -f "$ROOT/resources/icon.png" "$ICON_DST"
cp -f "$ROOT/resources/icon.png" "${XDG_DATA_HOME:-$HOME/.local/share}/pixmaps/smartseacrch.png"

# Flags that this VM (and similar locked-down Linux desktops) need.
EXTRA_FLAGS="--no-sandbox --disable-gpu --disable-dev-shm-usage"

cat > "$APPLICATIONS_DIR/smartseacrch.desktop" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=SmartSeacrch
Comment=Lokale Suche in Handbüchern und Problembeschreibungen
Exec=$APP_BIN $EXTRA_FLAGS
Icon=smartseacrch
Terminal=false
Categories=Office;Utility;
StartupWMClass=smartseacrch
EOF

chmod +x "$APPLICATIONS_DIR/smartseacrch.desktop" "$APP_BIN"
cp -f "$APPLICATIONS_DIR/smartseacrch.desktop" "$DESKTOP_DIR/SmartSeacrch.desktop"
chmod +x "$DESKTOP_DIR/SmartSeacrch.desktop"

if command -v gio >/dev/null 2>&1; then
  gio set "$DESKTOP_DIR/SmartSeacrch.desktop" metadata::trusted true 2>/dev/null || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPLICATIONS_DIR" 2>/dev/null || true
fi

echo "Installiert: $APP_BIN"
echo "Desktop:     $DESKTOP_DIR/SmartSeacrch.desktop"
echo "Menü:        $APPLICATIONS_DIR/smartseacrch.desktop"
