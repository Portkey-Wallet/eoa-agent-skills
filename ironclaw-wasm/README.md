# Portkey EOA IronClaw WASM Sidecar

This directory is the zero-intrusion IronClaw native runtime for `@portkey/eoa-agent-skills`.

Goals:

- keep the existing `TS/Bun + MCP + setup` line unchanged
- ship a native IronClaw WASM artifact from the same repository
- keep native state isolated under the `portkey-eoa/` workspace namespace

Current scope:

- native install and release artifact contract
- SDK-backed full 23-action EOA surface for IronClaw
- `aelf-web3.rust@0.1.0-alpha.1` as the shared chain foundation
- keystore-backed `walletExport` (`portkey-eoa-export-v2`) in isolated workspace state
- isolated active-wallet state persisted through IronClaw memory tools
- explicit experimental marker for parity gaps against the Bun/MCP runtime

Local commands:

```bash
cargo test --manifest-path ironclaw-wasm/Cargo.toml
cargo build --manifest-path ironclaw-wasm/Cargo.toml --target wasm32-wasip2 --release
```
