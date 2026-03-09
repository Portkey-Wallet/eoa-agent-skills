---
name: "portkey-eoa-agent-skills"
version: "1.2.4"
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
- Never print private keys, mnemonics, or tokens in channel outputs.
- Require explicit user confirmation before write operations and validate parameters before sending transactions.
- Prefer `simulate` or read-only queries first when available.
- Prefer the shared active wallet context before env fallback when signer resolution is in auto mode.

## Command recipes
- Start MCP server: `bun run mcp`
- Run CLI entry: `bun run cli`
- Show active wallet context: `portkey_get_active_wallet`
- Set active wallet context: `portkey_set_active_wallet`
- Install into IronClaw: `bun run bin/setup.ts ironclaw`
- Generate OpenClaw config: `bun run build:openclaw`
- Verify OpenClaw config: `bun run build:openclaw:check`
- Run CI coverage gate: `bun run test:coverage:ci`

## Distribution / Activation
- GitHub repo/tree URLs are discovery-only for hosts and agents.
- Preferred IronClaw activation from npm: `bunx -p @portkey/eoa-agent-skills portkey-setup ironclaw`
- Preferred OpenClaw activation from npm when managed install is unavailable: `bunx -p @portkey/eoa-agent-skills portkey-setup openclaw`
- Local repo checkout is for development and smoke tests only.

## Limits / Non-goals
- This skill focuses on domain operations and adapters; it is not a full wallet custody system.
- Do not hardcode environment secrets in source code or docs.
- Avoid bypassing validation for external service calls.
- Do not use this skill for CA wallet, guardian, recovery, or CA hash workflows.
