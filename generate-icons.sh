#!/bin/bash

# Source image
SRC="src/assets/logo.png"

# Destination directory
DEST="ios/falomobileapp/Images.xcassets/AppIcon.appiconset"

# Ensure the destination directory exists
mkdir -p "$DEST"

# Generate icons using sips
sips -z 40 40   "$SRC" --out "$DEST/icon-20@2x.png"
sips -z 60 60   "$SRC" --out "$DEST/icon-20@3x.png"
sips -z 58 58   "$SRC" --out "$DEST/icon-29@2x.png"
sips -z 87 87   "$SRC" --out "$DEST/icon-29@3x.png"
sips -z 80 80   "$SRC" --out "$DEST/icon-40@2x.png"
sips -z 120 120 "$SRC" --out "$DEST/icon-40@3x.png"
sips -z 120 120 "$SRC" --out "$DEST/icon-60@2x.png"
sips -z 180 180 "$SRC" --out "$DEST/icon-60@3x.png"

# iPad icons
sips -z 20 20   "$SRC" --out "$DEST/icon-20-ipad.png"
sips -z 40 40   "$SRC" --out "$DEST/icon-20@2x-ipad.png"
sips -z 29 29   "$SRC" --out "$DEST/icon-29-ipad.png"
sips -z 58 58   "$SRC" --out "$DEST/icon-29@2x-ipad.png"
sips -z 40 40   "$SRC" --out "$DEST/icon-40-ipad.png"
sips -z 80 80   "$SRC" --out "$DEST/icon-40@2x-ipad.png"
sips -z 76 76   "$SRC" --out "$DEST/icon-76-ipad.png"
sips -z 152 152 "$SRC" --out "$DEST/icon-76@2x-ipad.png"
sips -z 167 167 "$SRC" --out "$DEST/icon-83.5@2x-ipad.png"

# App Store icon
sips -z 1024 1024 "$SRC" --out "$DEST/icon-1024.png"

echo "All icons generated successfully!"
