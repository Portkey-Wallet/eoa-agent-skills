# @portkey/eoa-agent-skills

[中文版](./README.zh-CN.md) | English

[![Unit Tests](https://github.com/Portkey-Wallet/eoa-agent-skills/actions/workflows/publish.yml/badge.svg)](https://github.com/Portkey-Wallet/eoa-agent-skills/actions/workflows/publish.yml)
[![Coverage](https://codecov.io/gh/Portkey-Wallet/eoa-agent-skills/graph/badge.svg)](https://codecov.io/gh/Portkey-Wallet/eoa-agent-skills)

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
bun install
```

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

## MCP Tools (21 total)

### Wallet Management (6)
- `portkey_create_wallet` — Create new wallet with encrypted local storage
- `portkey_import_wallet` — Import from mnemonic or private key
- `portkey_get_wallet_info` — View wallet public info
- `portkey_list_wallets` — List all local wallets
- `portkey_backup_wallet` — Export wallet credentials
- `portkey_delete_wallet` — Delete a local wallet (requires password)

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
- `portkey_call_view_method` — Generic contract read
- `portkey_call_send_method` — Generic contract write
- `portkey_estimate_fee` — Transaction fee estimation

### eBridge (2)
- `portkey_ebridge_transfer` — eBridge cross-chain transfer
- `portkey_ebridge_info` — eBridge limits and fees

## Architecture

```
index.ts (SDK)  ─┐
server.ts (MCP)  ─┼─> src/core/  ──> lib/
skill.ts (CLI)   ─┘   (pure logic)    (infra)
```

Three adapters call the same core functions — zero duplicated logic.

## Testing

```bash
bun test                    # All tests
bun test tests/unit/        # Unit tests
bun run tests/e2e/mcp-verify.ts  # MCP verification
```

## Known Issues

- **elliptic <= 6.6.1**: `aelf-sdk` has a transitive dependency on `elliptic` with a known low-severity vulnerability. This is an upstream issue — tracked for resolution when `aelf-sdk` updates its dependency.

## License

MIT
