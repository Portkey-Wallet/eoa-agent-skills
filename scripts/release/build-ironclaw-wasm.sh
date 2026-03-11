#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACTS_DIR="$ROOT_DIR/artifacts/ironclaw"
TARGET_WASM="$ROOT_DIR/ironclaw-wasm/target/wasm32-wasip2/release/portkey_eoa_ironclaw.wasm"
CAPABILITIES_SOURCE="$ROOT_DIR/ironclaw-wasm/portkey-eoa-ironclaw.capabilities.json"
STAGED_WASM="$ARTIFACTS_DIR/portkey-eoa-ironclaw.wasm"
STAGED_CAPABILITIES="$ARTIFACTS_DIR/portkey-eoa-ironclaw.capabilities.json"

mkdir -p "$ARTIFACTS_DIR"

cargo build --manifest-path "$ROOT_DIR/ironclaw-wasm/Cargo.toml" --target wasm32-wasip2 --release

if [[ ! -f "$TARGET_WASM" ]]; then
  echo "Missing compiled WASM artifact: $TARGET_WASM" >&2
  exit 1
fi

if [[ ! -f "$CAPABILITIES_SOURCE" ]]; then
  echo "Missing capabilities file: $CAPABILITIES_SOURCE" >&2
  exit 1
fi

cp "$TARGET_WASM" "$STAGED_WASM"
cp "$CAPABILITIES_SOURCE" "$STAGED_CAPABILITIES"

echo "Staged IronClaw WASM assets:"
echo "  - $STAGED_WASM"
echo "  - $STAGED_CAPABILITIES"
