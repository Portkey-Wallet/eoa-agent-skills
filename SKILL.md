---
name: "portkey-eoa-agent-skills"
description: "Portkey EOA wallet and asset operations for aelf agents."
---

# Portkey EOA Agent Skill

## When to use
- Use this skill when you need EOA wallet management, transfers, asset queries, and contract calls.

## Capabilities
- Wallet lifecycle: create, import, list, backup, delete
- Asset/query operations: token balances, NFTs, history, prices
- Transfer and contract execution via CLI/MCP/SDK adapters
- Supports SDK, CLI, MCP, and OpenClaw integration from one codebase.

## Safe usage rules
- Never print private keys, mnemonics, or tokens in channel outputs.
- For write operations, require explicit user confirmation and validate parameters before sending transactions.
- Prefer `simulate` or read-only queries first when available.

## Command recipes
- Start MCP server: `bun run mcp`
- Run CLI entry: `bun run cli`
- Generate OpenClaw config: `bun run build:openclaw`
- Verify OpenClaw config: `bun run build:openclaw:check`
- Run CI coverage gate: `bun run test:coverage:ci`

## Limits / Non-goals
- This skill focuses on domain operations and adapters; it is not a full wallet custody system.
- Do not hardcode environment secrets in source code or docs.
- Avoid bypassing validation for external service calls.
