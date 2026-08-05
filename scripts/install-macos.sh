#!/usr/bin/env bash
# Install solana cli (macOS Apple Silicon) from the latest GitHub Release.
# Avoids the Gatekeeper "app is damaged" dialog that appears after Chrome/Safari
# downloads of unsigned builds (clears quarantine + ad-hoc re-signs the bundle).
set -euo pipefail

REPO="${SOLANA_CLI_GUI_REPO:-bashxgg/solana-cli-gui}"
APP_NAME="solana cli.app"
INSTALL_DIR="${SOLANA_CLI_GUI_INSTALL_DIR:-/Applications}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: this installer is for macOS only" >&2
  exit 1
fi
if [[ "$(uname -m)" != "arm64" ]]; then
  echo "error: Apple Silicon (arm64) only — Intel Macs are not supported" >&2
  exit 1
fi

echo "→ fetching latest release asset from github.com/${REPO} …"
API="https://api.github.com/repos/${REPO}/releases/latest"
# Prefer aarch64 .dmg
DMG_URL="$(curl -fsSL "$API" | python3 -c '
import json,sys
data=json.load(sys.stdin)
for a in data.get("assets",[]):
    n=a.get("name","")
    if n.endswith(".dmg") and ("aarch64" in n or "arm64" in n):
        print(a["browser_download_url"]); break
else:
    for a in data.get("assets",[]):
        if a.get("name","").endswith(".dmg"):
            print(a["browser_download_url"]); break
')"

if [[ -z "${DMG_URL}" ]]; then
  echo "error: no .dmg found on latest release" >&2
  exit 1
fi

DMG_PATH="${TMP}/solana-cli.dmg"
echo "→ downloading $(basename "$DMG_URL") …"
curl -fsSL -o "$DMG_PATH" "$DMG_URL"

echo "→ mounting …"
MOUNT_OUT="$(hdiutil attach "$DMG_PATH" -nobrowse -readonly)"
MOUNT_POINT="$(echo "$MOUNT_OUT" | awk -F'\t' '/\/Volumes\// {print $NF; exit}')"
if [[ -z "$MOUNT_POINT" || ! -d "$MOUNT_POINT" ]]; then
  echo "error: could not mount DMG" >&2
  exit 1
fi

SRC="${MOUNT_POINT}/${APP_NAME}"
if [[ ! -d "$SRC" ]]; then
  # fallback: first .app in volume
  SRC="$(find "$MOUNT_POINT" -maxdepth 2 -name '*.app' -type d | head -1)"
fi
if [[ -z "$SRC" || ! -d "$SRC" ]]; then
  hdiutil detach "$MOUNT_POINT" -quiet || true
  echo "error: .app not found inside DMG" >&2
  exit 1
fi

DEST="${INSTALL_DIR}/${APP_NAME}"
echo "→ installing to ${DEST} …"
rm -rf "$DEST"
mkdir -p "$INSTALL_DIR"
cp -R "$SRC" "$DEST"
hdiutil detach "$MOUNT_POINT" -quiet || true

echo "→ clearing quarantine + ad-hoc signing (unsigned release builds) …"
xattr -cr "$DEST" 2>/dev/null || true
codesign --force --deep --sign - "$DEST" 2>/dev/null || true

echo "→ done. Opening ${APP_NAME} …"
open "$DEST"
echo "Installed. If Gatekeeper still complains: System Settings → Privacy & Security → Open Anyway"
