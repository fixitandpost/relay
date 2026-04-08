#!/bin/bash
set -euo pipefail

APP="release/Relay-darwin-arm64/Relay.app"
ENT="build/entitlements.mac.plist"

if [ ! -d "$APP" ]; then
  echo "Error: $APP not found. Run 'npm run package' first."
  exit 1
fi

echo "==> Signing Relay.app (ad-hoc with camera entitlements)..."

# 1. Dylibs inside Electron Framework
for lib in libEGL.dylib libGLESv2.dylib libffmpeg.dylib libvk_swiftshader.dylib; do
  codesign --sign - --force \
    "$APP/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/$lib"
done

# 2. Crashpad handler
codesign --sign - --force \
  "$APP/Contents/Frameworks/Electron Framework.framework/Versions/A/Helpers/chrome_crashpad_handler"

# 3. Electron Framework binary + wrapper
codesign --sign - --force --entitlements "$ENT" \
  "$APP/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework"
codesign --sign - --force --entitlements "$ENT" \
  "$APP/Contents/Frameworks/Electron Framework.framework"

# 4. Other frameworks (Mantle, ReactiveObjC, Squirrel)
for fw in Mantle ReactiveObjC; do
  [ -d "$APP/Contents/Frameworks/${fw}.framework" ] || continue
  codesign --sign - --force "$APP/Contents/Frameworks/${fw}.framework/Versions/A/${fw}"
  codesign --sign - --force "$APP/Contents/Frameworks/${fw}.framework"
done
[ -f "$APP/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt" ] && \
  codesign --sign - --force "$APP/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt"
[ -f "$APP/Contents/Frameworks/Squirrel.framework/Versions/A/Squirrel" ] && \
  codesign --sign - --force "$APP/Contents/Frameworks/Squirrel.framework/Versions/A/Squirrel"
[ -d "$APP/Contents/Frameworks/Squirrel.framework" ] && \
  codesign --sign - --force "$APP/Contents/Frameworks/Squirrel.framework"

# 5. Helper apps (with camera entitlements for Renderer)
for helper in "Relay Helper" "Relay Helper (GPU)" "Relay Helper (Plugin)" "Relay Helper (Renderer)"; do
  [ -d "$APP/Contents/Frameworks/$helper.app" ] || continue
  codesign --sign - --force --entitlements "$ENT" \
    "$APP/Contents/Frameworks/$helper.app/Contents/MacOS/$helper"
  codesign --sign - --force --entitlements "$ENT" \
    "$APP/Contents/Frameworks/$helper.app"
done

# 6. Bundled mediamtx
[ -f "$APP/Contents/Resources/mediamtx" ] && \
  codesign --sign - --force "$APP/Contents/Resources/mediamtx"

# 7. Main binary + outer .app bundle
codesign --sign - --force --entitlements "$ENT" "$APP/Contents/MacOS/Relay"
codesign --sign - --force --entitlements "$ENT" "$APP"

# Verify
echo ""
codesign --verify --deep --strict "$APP" 2>&1 && echo "==> Signature VALID" || { echo "==> INVALID"; exit 1; }
echo "==> Done:  open '$APP'"
