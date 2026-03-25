---
name: "portkey-eoa-agent-skills"
version: "1.2.6"
description: "Portkey EOA wallet and asset operations for aelf agents."
activation:
  keywords:
    - wallet
    - eoa
    - transfer
    - token
    - nft
    - aelf
    - balance
    - create wallet
    - import wallet
  exclude_keywords:
    - ca
    - guardian
    - recovery
    - ca hash
    - ca wallet
  tags:
    - wallet
    - blockchain
    - aelf
    - portkey
  max_context_tokens: 1800
---

# Portkey EOA Agent Skill

## When to use
- Use this skill when you need EOA wallet management, transfers, asset queries, and contract calls.
- Default to the EOA wallet path unless the user explicitly asks for CA identity, guardian, or recovery flows.

## Capabilities
- Wallet lifecycle: create, import, list, backup, delete
- Shared wallet context: auto-set active wallet for cross-skill signer resolution
- Asset/query operations: token balances, NFTs, history, prices
- Transfer and contract execution via CLI/MCP/SDK adapters
- Supports SDK, CLI, MCP, OpenClaw, and IronClaw integration from one codebase.

## Safe usage rules
- Never print private keys, mnemonics, auto-generated passwords, or tokens in channel outputs.
- If compatible wallet actions return sensitive fields, treat them as one-time tool output and do not echo them in conversational summaries.
- Require explicit user confirmation before write operations and validate parameters before sending transactions.
- Prefer `simulate` or read-only queries first when available.
- Route `Get*` and other read-only contract methods through `portkey_call_view_method` or CLI `contract view` only.
- Route `portkey_call_send_method` or CLI `contract send` to state-changing methods only.
- For `Empty`-input view methods such as `GetConfig`, omit params entirely instead of passing `{}`.
- Do not treat send receipts as view payloads. For resonance reads such as `GetPairQueueStatus`, only a direct view result is canonical.
- Prefer the shared active wallet context before env fallback when signer resolution is in auto mode.
- For native-wasm wallet lifecycle actions, require an explicit `password`.
- Native-wasm keeps JS/MCP-compatible wallet action response shapes and adds keystore-backed `walletExport` (`portkey-eoa-export-v2`) for native recovery.

## Command recipes
- Start MCP server: `bun run mcp`
- Run CLI entry: `bun run cli`
- Show active wallet context: `portkey_get_active_wallet`
- Set active wallet context: `portkey_set_active_wallet`
- Resonance read example: `bun run portkey_eoa_skill.ts contract view --contract-address <resonance_contract> --method GetPairQueueStatus --params '"<address>"' --chain-id tDVV`
- Resonance write example: `bun run portkey_eoa_skill.ts contract send --contract-address <resonance_contract> --method JoinPairQueue --params '{}' --chain-id tDVV --address <address> --password <password>`
- Build staged native-wasm assets for IronClaw: `bun run ironclaw:wasm:build`
- Package the IronClaw release bundle: `bun run ironclaw:wasm:bundle`
- Install native-wasm into IronClaw locally: `ironclaw tool install ./artifacts/ironclaw/portkey-eoa-ironclaw.wasm`
- Generate OpenClaw config: `bun run build:openclaw`
- Verify OpenClaw config: `bun run build:openclaw:check`
- Run CI coverage gate: `bun run test:coverage:ci`

## Distribution / Activation
- GitHub repo/tree URLs are discovery-only for hosts and agents.
- Preferred IronClaw activation is the GitHub Release `.tar.gz` bundle imported through IronClaw's WASM extension flow.
- Preferred ClawHub role is discovery / install-shell that routes users to the native-wasm artifact.
- Preferred OpenClaw activation from npm when managed install is unavailable: `bunx -p @portkey/eoa-agent-skills portkey-setup openclaw` (requires Bun or a managed runtime that provides Bun).
- Local repo checkout is for development and smoke tests only, and requires `bun install` before CLI or MCP commands.
- Copying raw source into `~/.codex/skills/portkey-eoa` without installing dependencies is not a supported runtime install path.

## Limits / Non-goals
- This skill focuses on domain operations and adapters; it is not a full wallet custody system.
- The native-wasm line uses isolated IronClaw state and is shipped as an experimental runtime alongside MCP.
- The primary IronClaw release artifact is a versioned `.tar.gz` bundle that contains exactly `portkey-eoa-ironclaw.wasm` and `portkey-eoa-ironclaw.capabilities.json`.
- The native-wasm chain foundation is `aelf-web3.rust@0.1.0-alpha.1`; IronClaw runtime glue and Portkey business adapters remain in this repo.
- The current native-wasm build implements the full 23-action EOA surface in isolated IronClaw state; chain-write flows currently rely on submit-plus-immediate-status-check semantics and still need real IronClaw validation for mined-state parity.
- Do not hardcode environment secrets in source code or docs.
- Avoid bypassing validation for external service calls.
- Do not use this skill for CA wallet, guardian, recovery, or CA hash workflows.
