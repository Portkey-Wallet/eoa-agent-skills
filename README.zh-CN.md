# @portkey/eoa-agent-skills

[English](./README.md) | 中文

[aelf 区块链](https://aelf.com) 上 Portkey EOA 钱包的 AI Agent Skills。提供 MCP、CLI 和 SDK 三种接口，覆盖钱包管理、Token 转账、资产查询和智能合约交互。

## 功能

- **钱包管理**：创建、导入、列表、备份 EOA 钱包，本地 AES 加密存储
- **Token 查询**：查询余额、价格、Token 列表（跨链）
- **NFT 查询**：浏览 NFT Collection 和具体 Item
- **交易历史**：查询和检索历史交易
- **Token 转账**：aelf 同链和跨链转账
- **合约交互**：通用 view/send 调用、Approve、手续费预估
- **eBridge**：aelf 与 EVM 链之间的跨链转账

## 消费方式

| 模式 | 入口 | 适用场景 |
|------|------|---------|
| **MCP** | `src/mcp/server.ts` | Claude Desktop、Cursor、GPT 等 AI 工具 |
| **CLI** | `portkey_eoa_skill.ts` | 终端脚本、OpenClaw |
| **SDK** | `index.ts` | LangChain、LlamaIndex、自定义 Agent |

## 快速开始

### 安装

```bash
bun install
```

### 一键配置

```bash
# Claude Desktop
bun run bin/setup.ts claude

# Cursor（项目级）
bun run bin/setup.ts cursor

# Cursor（全局）
bun run bin/setup.ts cursor --global

# OpenClaw（输出配置）
bun run bin/setup.ts openclaw

# OpenClaw（合并到已有配置文件）
bun run bin/setup.ts openclaw --config-path /path/to/openclaw-config.json

# 查看配置状态
bun run bin/setup.ts list
```

### 环境变量

```bash
cp .env.example .env
# 编辑 .env 填入你的配置
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORTKEY_NETWORK` | `mainnet` | `mainnet` |
| `PORTKEY_API_URL` | 覆盖 API 基础 URL | 根据网络自动选择 |
| `PORTKEY_PRIVATE_KEY` | 明文私钥（可选） | — |
| `PORTKEY_WALLET_DIR` | 自定义钱包存储目录 | `~/.portkey/eoa/wallets/` |
| `PORTKEY_WALLET_PASSWORD` | 本地钱包加密密码 | — |

### MCP Server

```bash
bun run src/mcp/server.ts
```

或添加到你的 MCP 客户端配置（参见 `mcp-config.example.json`）：

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

### CLI 使用

```bash
# 钱包
bun run portkey_eoa_skill.ts wallet create --password mypass
bun run portkey_eoa_skill.ts wallet list
bun run portkey_eoa_skill.ts wallet import --mnemonic "word1 word2 ..." --password mypass

# 查询
bun run portkey_eoa_skill.ts query tokens --address 你的地址
bun run portkey_eoa_skill.ts query balance --address 你的地址 --symbol ELF --chain-id AELF
bun run portkey_eoa_skill.ts query price --symbols ELF,USDT
bun run portkey_eoa_skill.ts query history --address 你的地址
bun run portkey_eoa_skill.ts query chains

# 转账
bun run portkey_eoa_skill.ts transfer --to 收款地址 --symbol ELF --amount 100000000 --chain-id AELF

# 合约调用
bun run portkey_eoa_skill.ts contract view --contract-address 合约地址 --method GetBalance --params '{"symbol":"ELF","owner":"..."}' --chain-id AELF
```

### SDK 使用

```typescript
import { getConfig, createWallet, getTokenList, transfer } from '@portkey/eoa-agent-skills';

const config = getConfig('mainnet');

// 创建钱包
const wallet = await createWallet(config, { password: 'mypass' });
console.log('地址:', wallet.address);

// 查询 Token
const tokens = await getTokenList(config, { address: wallet.address });
console.log('Tokens:', tokens.data);

// 转账
const result = await transfer(config, {
  privateKey: '你的私钥',
  to: '收款地址',
  symbol: 'ELF',
  amount: '100000000',
  chainId: 'AELF',
});
console.log('交易ID:', result.transactionId);
```

## MCP Tools（共 21 个）

### 钱包管理（6）
- `portkey_create_wallet` — 创建新钱包并加密存储
- `portkey_import_wallet` — 导入钱包（助记词/私钥）
- `portkey_get_wallet_info` — 查看钱包公开信息
- `portkey_list_wallets` — 列出所有本地钱包
- `portkey_backup_wallet` — 导出钱包凭证
- `portkey_delete_wallet` — 删除本地钱包（需密码验证）

### 资产查询（7）
- `portkey_get_token_list` — Token 列表和余额
- `portkey_get_token_balance` — 单个 Token 余额
- `portkey_get_token_prices` — Token USD 价格
- `portkey_get_nft_collections` — NFT Collection 列表
- `portkey_get_nft_items` — Collection 内的 NFT
- `portkey_get_transaction_history` — 交易历史
- `portkey_get_transaction_detail` — 单笔交易详情

### 转账（2）
- `portkey_transfer` — 同链 Token 转账
- `portkey_cross_chain_transfer` — aelf 跨链转账

### 合约（4）
- `portkey_approve` — Token 授权
- `portkey_call_view_method` — 通用合约只读调用
- `portkey_call_send_method` — 通用合约写调用
- `portkey_estimate_fee` — 交易手续费预估

### eBridge（2）
- `portkey_ebridge_transfer` — eBridge 跨链转账
- `portkey_ebridge_info` — eBridge 限额和手续费

## 架构

```
index.ts (SDK)  ─┐
server.ts (MCP)  ─┼─> src/core/  ──> lib/
skill.ts (CLI)   ─┘   (纯逻辑)      (基础设施)
```

三个适配器调用同一套 Core 函数——零重复逻辑。

## 测试

```bash
bun test                    # 所有测试
bun test tests/unit/        # 单元测试
bun run tests/e2e/mcp-verify.ts  # MCP 验证
```

## Known Issues

- **elliptic <= 6.6.1**：`aelf-sdk` 的传递依赖 `elliptic` 存在一个 low 级别漏洞，属上游问题，等待 `aelf-sdk` 更新修复。

## License

MIT
