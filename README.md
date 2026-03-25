# @portkey/eoa-agent-skills

[中文版](./README.zh-CN.md) | English

[![Unit Tests](https://github.com/Portkey-Wallet/eoa-agent-skills/actions/workflows/test.yml/badge.svg)](https://github.com/Portkey-Wallet/eoa-agent-skills/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://Portkey-Wallet.github.io/eoa-agent-skills/coverage.json)](https://Portkey-Wallet.github.io/eoa-agent-skills/coverage.json)

AI Agent Skills for Portkey EOA Wallet on [aelf blockchain](https://aelf.com). Provides MCP, CLI, and SDK interfaces for wallet management, token transfers, asset queries, and smart contract interactions.

## Features

- **Wallet Management**: Create, import, list, and backup EOA wallets with AES-encrypted local storage
- **Token Queries**: Check balances, prices, and token lists across aelf chains
- **NFT Queries**: Browse NFT collections and items
- **Transaction History**: Query and inspect past transactions
- **Token Transfers**: Same-chain and cross-chain transfers within aelf
- **Contract Interactions**: Generic view/send calls, approve, fee estimation
- **eBridge**: Cross-chain transfers between aelf and EVM chains

## Consumption Modes

| Mode | Entry | Use Case |
|------|-------|----------|
| **MCP** | `src/mcp/server.ts` | Claude Desktop, Cursor, GPT, and other AI tools |
| **CLI** | `portkey_eoa_skill.ts` | Terminal scripts, OpenClaw |
| **SDK** | `index.ts` | LangChain, LlamaIndex, custom agents |

## Quick Start

### Install

```bash
# Local repo checkout / smoke test only
bun install
```

### Supported Activation Paths

- Managed install / ClawHub when available.
- For OpenClaw when managed install is unavailable, use `bunx -p @portkey/eoa-agent-skills portkey-setup openclaw`. This path requires Bun or a managed runtime that provides Bun.
- Local repo checkout after `bun install` for development and smoke tests only.
- Copying raw source into `~/.codex/skills/portkey-eoa` without installing dependencies is not a supported install path and is not guaranteed to boot.

### One-Click Setup

```bash
# Claude Desktop
bun run bin/setup.ts claude

# Cursor (project-level)
bun run bin/setup.ts cursor

# Cursor (global)
bun run bin/setup.ts cursor --global

# OpenClaw (output config)
bun run bin/setup.ts openclaw

# OpenClaw (merge into existing config)
bun run bin/setup.ts openclaw --config-path /path/to/openclaw-config.json

# Check status
bun run bin/setup.ts list
```

### IronClaw Native WASM (Local Build / Smoke Test)

```bash
# Build staged assets and package the release bundle locally
bun run ironclaw:wasm:build
bun run ironclaw:wasm:bundle

# Install the staged local artifact into IronClaw
ironclaw tool install ./artifacts/ironclaw/portkey-eoa-ironclaw.wasm
```

Release assets follow this naming contract:

- `portkey-eoa-ironclaw-v<version>-wasm32-wasip2.tar.gz`
- `portkey-eoa-ironclaw-v<version>-wasm32-wasip2.sha256`
- `portkey-eoa-ironclaw.wasm`
- `portkey-eoa-ironclaw.capabilities.json`

### Environment Variables

```bash
cp .env.example .env
# Edit .env with your values
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORTKEY_NETWORK` | `mainnet` | `mainnet` |
| `PORTKEY_API_URL` | Override API base URL | Auto from network |
| `PORTKEY_PRIVATE_KEY` | Plaintext private key (optional) | — |
| `PORTKEY_WALLET_DIR` | Custom wallet storage directory | `~/.portkey/eoa/wallets/` |
| `PORTKEY_WALLET_PASSWORD` | Password for local wallet encryption | — |
| `PORTKEY_SKILL_WALLET_CONTEXT_PATH` | Override shared wallet context path | `~/.portkey/skill-wallet/context.v1.json` |

### Cross-skill signing

- After `portkey_create_wallet` / `portkey_import_wallet`, this skill auto-updates shared active wallet context.
- Other write-capable skills can resolve signer by `explicit -> active context -> env` (auto mode).
- No plaintext private key is written to the shared context file.

### MCP Server

```bash
bun run src/mcp/server.ts
```

Or add to your MCP client config (see `mcp-config.example.json`):

```json
{
  "mcpServers": {
    "portkey-eoa-agent-skills": {
      "command": "bun",
      "args": ["run", "/path/to/src/mcp/server.ts"],
      "env": {
        "PORTKEY_NETWORK": "mainnet",
        "PORTKEY_WALLET_PASSWORD": "your_password"
      }
    }
  }
}
```

### IronClaw

```bash
# Local development install
ironclaw tool install ./artifacts/ironclaw/portkey-eoa-ironclaw.wasm
```

Native-wasm notes:

- The EOA native tool lives in `ironclaw-wasm/` and is published as GitHub Release assets.
- The primary release payload is a versioned `.tar.gz` bundle that contains exactly `portkey-eoa-ironclaw.wasm` and `portkey-eoa-ironclaw.capabilities.json`.
- Current native-wasm state is isolated from the Bun/MCP wallet store.
- The current experimental build implements the full 23-action EOA surface in isolated native-wasm state, including wallet lifecycle, asset queries, contract calls, transfers, approvals, fee estimation, and eBridge flows.
- The native chain layer is now backed by `aelf-web3.rust@0.1.0-alpha.1` instead of the earlier hand-rolled AElf transaction helpers.
- Chain write actions currently use submit-plus-immediate-status-check semantics in native-wasm; mined-state parity with the Bun runtime still needs real IronClaw validation.
- IronClaw runtime delivery is wasm-only in this rollout.
- The native tool uses IronClaw-native capabilities and a `portkey-eoa/` workspace namespace.
- Native wallet lifecycle actions require an explicit `password`.
- Native-wasm keeps the same public wallet action contracts as JS/MCP and adds keystore-backed `walletExport` (`portkey-eoa-export-v2`) for native recovery.
- Compatible wallet actions can still return mnemonic/privateKey fields; treat them as one-time tool output and do not repeat them in conversational summaries.
- ClawHub should be treated as discovery / install-shell only, not the final write-capable runtime for this skill.

Remote activation contract:

- GitHub repo/tree URLs are discovery sources only, not the final IronClaw install payload.
- Preferred IronClaw activation is the GitHub Release bundle URL: download the versioned `.tar.gz` asset and import it through IronClaw's WASM extension flow.
- Local smoke tests can use the staged bare artifact at `./artifacts/ironclaw/portkey-eoa-ironclaw.wasm`.
- Preferred ClawHub role is discovery / install-shell that routes users to the native-wasm artifact.
- Prefer ClawHub / managed install for OpenClaw when available; otherwise use `bunx -p @portkey/eoa-agent-skills portkey-setup openclaw` with Bun or a managed runtime that provides Bun.
- Local repo checkout remains a development smoke-test path only after `bun install`.
- Copying raw source into `~/.codex/skills/portkey-eoa` without dependency installation is not a supported runtime path.

### CLI Usage

```bash
# Wallet
bun run portkey_eoa_skill.ts wallet create --password mypass
bun run portkey_eoa_skill.ts wallet list
bun run portkey_eoa_skill.ts wallet import --mnemonic "word1 word2 ..." --password mypass

# Queries
bun run portkey_eoa_skill.ts query tokens --address YOUR_ADDRESS
bun run portkey_eoa_skill.ts query balance --address YOUR_ADDRESS --symbol ELF --chain-id AELF
bun run portkey_eoa_skill.ts query price --symbols ELF,USDT
bun run portkey_eoa_skill.ts query history --address YOUR_ADDRESS
bun run portkey_eoa_skill.ts query chains

# Transfer
bun run portkey_eoa_skill.ts transfer --to RECIPIENT --symbol ELF --amount 100000000 --chain-id AELF

# Contract
bun run portkey_eoa_skill.ts contract view --contract-address ADDR --method GetBalance --params '{"symbol":"ELF","owner":"..."}' --chain-id AELF
bun run portkey_eoa_skill.ts contract send --contract-address ADDR --method Approve --params '{"symbol":"ELF","spender":"...","amount":"100000000"}' --chain-id AELF --address YOUR_ADDRESS --password mypass
```

### Contract Call Routing

Choose the contract tool by method type:

- `portkey_call_view_method` / CLI `contract view` are for `Get*` and other read-only methods.
- `portkey_call_send_method` / CLI `contract send` are for state-changing methods only.
- For `Empty`-input view methods such as `GetConfig`, omit `--params` entirely so the read call stays argument-free.
- Do not call `GetConfig`, `GetPairQueueStatus`, or other resonance `Get*` methods through the send path. A send receipt cannot replace a direct view response.

Resonance examples:

```bash
# Read-only queue status lookup
bun run portkey_eoa_skill.ts contract view \
  --contract-address 28Lot71VrWm1WxrEjuDqaepywi7gYyZwHysUcztjkHGFsPPrZy \
  --method GetPairQueueStatus \
  --params '"<address>"' \
  --chain-id tDVV

# State-changing queue join
bun run portkey_eoa_skill.ts contract send \
  --contract-address 28Lot71VrWm1WxrEjuDqaepywi7gYyZwHysUcztjkHGFsPPrZy \
  --method JoinPairQueue \
  --params '{}' \
  --chain-id tDVV \
  --address YOUR_ADDRESS \
  --password mypass
```

### SDK Usage

```typescript
import { getConfig, createWallet, getTokenList, transfer } from '@portkey/eoa-agent-skills';

const config = getConfig('mainnet');

// Create wallet
const wallet = await createWallet(config, { password: 'mypass' });
console.log('Address:', wallet.address);

// Query tokens
const tokens = await getTokenList(config, { address: wallet.address });
console.log('Tokens:', tokens.data);

// Transfer
const result = await transfer(config, {
  privateKey: 'YOUR_PRIVATE_KEY',
  to: 'RECIPIENT_ADDRESS',
  symbol: 'ELF',
  amount: '100000000',
  chainId: 'AELF',
});
console.log('TX:', result.transactionId);
```

## MCP Tools (23 total)

Chain list discovery remains CLI/SDK only via `bun run portkey_eoa_skill.ts query chains` or `getChainInfo()`. It is intentionally not exposed as an MCP tool in this package.

### Wallet Management (8)
- `portkey_create_wallet` — Create new wallet with encrypted local storage
- `portkey_import_wallet` — Import from mnemonic, private key, or encrypted `walletExport`
- `portkey_get_wallet_info` — View wallet public info
- `portkey_list_wallets` — List all local wallets
- `portkey_backup_wallet` — Export compatible mnemonic/privateKey fields and additive encrypted `walletExport`
- `portkey_delete_wallet` — Delete a local wallet (requires password)
- `portkey_get_active_wallet` — Read shared active wallet context
- `portkey_set_active_wallet` — Set shared active wallet context manually

### Asset Queries (7)
- `portkey_get_token_list` — Token portfolio with balances
- `portkey_get_token_balance` — Single token balance
- `portkey_get_token_prices` — Token USD prices
- `portkey_get_nft_collections` — NFT collection list
- `portkey_get_nft_items` — NFT items in collection
- `portkey_get_transaction_history` — Transaction history
- `portkey_get_transaction_detail` — Single transaction detail

### Transfers (2)
- `portkey_transfer` — Same-chain token transfer
- `portkey_cross_chain_transfer` — Cross-chain aelf transfer

### Contract (4)
- `portkey_approve` — Token spending approval
- `portkey_call_view_method` — Generic contract read (`Get*` / read-only only)
- `portkey_call_send_method` — Generic contract write (state-changing only)
- `portkey_estimate_fee` — Transaction fee estimation

### eBridge (2)
- `portkey_ebridge_transfer` — eBridge cross-chain transfer
- `portkey_ebridge_info` — eBridge limits and fees

## Architecture

```
index.ts (SDK)  ─┐
server.ts (MCP)  ─┼─> src/core/  ──> lib/
portkey_eoa_skill.ts (CLI)  ─┘   (pure logic)    (infra)
```

Three adapters call the same core functions — zero duplicated logic.

## Testing

```bash
bun test                    # All tests
bun test tests/unit/        # Unit tests
bun run tests/e2e/mcp-verify.ts  # MCP verification
```

### IronClaw Smoke Test

After you install IronClaw locally, run this minimal verification:

1. `bun run ironclaw:wasm:build`
2. `bun run ironclaw:wasm:bundle`
3. `ironclaw tool install ./artifacts/ironclaw/portkey-eoa-ironclaw.wasm`
4. Start IronClaw and ask for a read-only action such as "check ELF balance" or "show token prices"
5. Verify ClawHub / installed-skill discovery does not claim direct write-capable runtime access

## Known Issues

- **elliptic <= 6.6.1**: `aelf-sdk` has a transitive dependency on `elliptic` with a known low-severity vulnerability. This is an upstream issue — tracked for resolution when `aelf-sdk` updates its dependency.

## License

MIT
