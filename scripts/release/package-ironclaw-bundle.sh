#!/usr/bin/env bash

set -euo pipefail

export LC_ALL=C
export LANG=C
export LC_CTYPE=C

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACTS_DIR="$ROOT_DIR/artifacts/ironclaw"
STAGED_WASM="$ARTIFACTS_DIR/portkey-eoa-ironclaw.wasm"
STAGED_CAPABILITIES="$ARTIFACTS_DIR/portkey-eoa-ironclaw.capabilities.json"
VERSION="$(awk -F '\"' '$2 == "version" { print $4; exit }' "$ROOT_DIR/package.json")"
BUNDLE_NAME="portkey-eoa-ironclaw-v${VERSION}-wasm32-wasip2.tar.gz"
SHA_NAME="portkey-eoa-ironclaw-v${VERSION}-wasm32-wasip2.sha256"
BUNDLE_PATH="$ARTIFACTS_DIR/$BUNDLE_NAME"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

if [[ ! -f "$STAGED_WASM" || ! -f "$STAGED_CAPABILITIES" ]]; then
  echo "Missing staged assets. Run 'bun run ironclaw:wasm:build' first." >&2
  exit 1
fi

if [[ -z "$VERSION" ]]; then
  echo "Failed to read package version from $ROOT_DIR/package.json" >&2
  exit 1
fi

cp "$STAGED_WASM" "$TMP_DIR/portkey-eoa-ironclaw.wasm"
cp "$STAGED_CAPABILITIES" "$TMP_DIR/portkey-eoa-ironclaw.capabilities.json"

tar -czf "$BUNDLE_PATH" -C "$TMP_DIR" \
  portkey-eoa-ironclaw.wasm \
  portkey-eoa-ironclaw.capabilities.json

CONTENTS="$(tar -tzf "$BUNDLE_PATH")"
EXPECTED=$'portkey-eoa-ironclaw.wasm\nportkey-eoa-ironclaw.capabilities.json'

if [[ "$CONTENTS" != "$EXPECTED" ]]; then
  echo "Unexpected bundle contents for $BUNDLE_PATH" >&2
  echo "$CONTENTS" >&2
  exit 1
fi

(
  cd "$ARTIFACTS_DIR"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$BUNDLE_NAME" > "$SHA_NAME"
  else
    shasum -a 256 "$BUNDLE_NAME" > "$SHA_NAME"
  fi
)

echo "Packaged IronClaw WASM bundle:"
echo "  - $BUNDLE_PATH"
echo "  - $ARTIFACTS_DIR/$SHA_NAME"
