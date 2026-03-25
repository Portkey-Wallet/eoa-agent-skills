# @portkey/eoa-agent-skills

[English](./README.md) | 中文

[![Unit Tests](https://github.com/Portkey-Wallet/eoa-agent-skills/actions/workflows/test.yml/badge.svg)](https://github.com/Portkey-Wallet/eoa-agent-skills/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://Portkey-Wallet.github.io/eoa-agent-skills/coverage.json)](https://Portkey-Wallet.github.io/eoa-agent-skills/coverage.json)

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
# 本地 repo checkout / smoke test only
bun install
```

### 支持的激活路径

- 有 ClawHub / managed install 时优先使用托管安装。
- OpenClaw 在无托管安装时，使用 `bunx -p @portkey/eoa-agent-skills portkey-setup openclaw`。这条路径需要 Bun 或提供 Bun 的受管 runtime。
- 本地 repo checkout 仅用于开发和 smoke test，并且需要先执行 `bun install`。
- 仅把源码复制到 `~/.codex/skills/portkey-eoa` 但不安装依赖，不属于受支持安装路径，也不保证能正常启动。

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

### IronClaw Native WASM（本地构建 / Smoke Test）

```bash
# 本地构建 staged assets 并打 release bundle
bun run ironclaw:wasm:build
bun run ironclaw:wasm:bundle

# 安装 staged 本地产物到 IronClaw
ironclaw tool install ./artifacts/ironclaw/portkey-eoa-ironclaw.wasm
```

Release artifact 命名契约：

- `portkey-eoa-ironclaw-v<version>-wasm32-wasip2.tar.gz`
- `portkey-eoa-ironclaw-v<version>-wasm32-wasip2.sha256`
- `portkey-eoa-ironclaw.wasm`
- `portkey-eoa-ironclaw.capabilities.json`

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
| `PORTKEY_SKILL_WALLET_CONTEXT_PATH` | 覆盖共享钱包上下文文件路径 | `~/.portkey/skill-wallet/context.v1.json` |

### 跨 Skill 签名共享

- 执行 `portkey_create_wallet` / `portkey_import_wallet` 后会自动更新共享 active wallet context。
- 其它写能力 skill 默认按 `explicit -> active context -> env` 解析 signer（auto 模式）。
- 共享 context 文件不会落盘明文私钥。

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

### IronClaw

```bash
# 本地开发调试安装
ironclaw tool install ./artifacts/ironclaw/portkey-eoa-ironclaw.wasm
```

native-wasm 说明：

- EOA native tool 位于 `ironclaw-wasm/`，通过 GitHub Release artifacts 分发。
- 正式 release 主产物是一个 versioned `.tar.gz` bundle，内部固定只包含 `portkey-eoa-ironclaw.wasm` 和 `portkey-eoa-ironclaw.capabilities.json`。
- 当前 native-wasm 状态与 Bun/MCP 钱包状态隔离。
- 当前 experimental native-wasm 已在隔离状态下补齐完整 23 个 EOA action，包括钱包生命周期、资产查询、合约调用、转账、授权、手续费估算，以及 eBridge 流程。
- native 的链能力底座已经切到 `aelf-web3.rust@0.1.0-alpha.1`，不再继续维护旧的自研 AElf 交易实现。
- 当前链上写操作在 native-wasm 中采用“提交后立即查一次状态”的语义；是否能稳定拿到 mined 状态，仍需要真实 IronClaw runtime 验证。
- 本轮 IronClaw 分发是 wasm-only。
- native tool 使用 IronClaw 原生 capabilities 和 `portkey-eoa/` workspace 命名空间。
- native 钱包生命周期操作必须显式提供 `password`。
- native-wasm 对外保持与 JS/MCP 一致的钱包 action public contract，并新增 keystore-backed `walletExport`（`portkey-eoa-export-v2`）作为 native 恢复载荷。
- 兼容模式下的钱包 action 仍可能返回 `mnemonic` / `privateKey`；这些都视为一次性敏感 tool output，不应在对话总结里重复输出。
- ClawHub 对这个 skill 的角色是 discovery / install shell，不是最终的写能力运行时。

远程激活契约：

- GitHub repo/tree URL 只用于 discovery，不是最终的 IronClaw 安装载体。
- 推荐的 IronClaw 激活方式是 GitHub Release 上的 versioned `.tar.gz` bundle URL，通过 IronClaw 的 WASM extension 导入流程安装。
- 本地 smoke test 仍可直接使用 `./artifacts/ironclaw/portkey-eoa-ironclaw.wasm`。
- 推荐的 ClawHub 角色是 discovery / install-shell，引导用户安装 native-wasm artifact。
- OpenClaw 若有 ClawHub / managed install 则优先使用；否则回退到 `bunx -p @portkey/eoa-agent-skills portkey-setup openclaw`，并确保环境提供 Bun runtime。
- 本地 repo checkout 仅保留给开发阶段 smoke test，并且需要先执行 `bun install`。
- 仅把源码复制到 `~/.codex/skills/portkey-eoa` 但不安装依赖，不属于受支持运行路径。

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
bun run portkey_eoa_skill.ts contract send --contract-address 合约地址 --method Approve --params '{"symbol":"ELF","spender":"...","amount":"100000000"}' --chain-id AELF --address 你的地址 --password mypass
```

### 合约调用路由规则

合约工具要按方法类型来选：

- `portkey_call_view_method` / CLI `contract view` 用于 `Get*` 和其它 read-only 方法。
- `portkey_call_send_method` / CLI `contract send` 只用于 state-changing 方法。
- 对 `GetConfig` 这类 `Empty` 入参的 view 方法，要直接省略 `--params`，保持 read 调用不带参数。
- 不要把 `GetConfig`、`GetPairQueueStatus` 这类 resonance `Get*` 方法走 send 路径；send receipt 不能替代 direct view 返回值。

Resonance 示例：

```bash
# 只读查询排队状态
bun run portkey_eoa_skill.ts contract view \
  --contract-address 28Lot71VrWm1WxrEjuDqaepywi7gYyZwHysUcztjkHGFsPPrZy \
  --method GetPairQueueStatus \
  --params '"<address>"' \
  --chain-id tDVV

# 发起写操作加入队列
bun run portkey_eoa_skill.ts contract send \
  --contract-address 28Lot71VrWm1WxrEjuDqaepywi7gYyZwHysUcztjkHGFsPPrZy \
  --method JoinPairQueue \
  --params '{}' \
  --chain-id tDVV \
  --address 你的地址 \
  --password mypass
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

## MCP Tools（共 23 个）

chain list 目前仍然只通过 CLI/SDK 提供：使用 `bun run portkey_eoa_skill.ts query chains` 或 `getChainInfo()`。这个包暂时不会把它暴露成 MCP tool。

### 钱包管理（8）
- `portkey_create_wallet` — 创建新钱包并加密存储
- `portkey_import_wallet` — 导入钱包（助记词/私钥/加密 `walletExport`）
- `portkey_get_wallet_info` — 查看钱包公开信息
- `portkey_list_wallets` — 列出所有本地钱包
- `portkey_backup_wallet` — 导出兼容的 `mnemonic` / `privateKey`，并附带加密 `walletExport`
- `portkey_delete_wallet` — 删除本地钱包（需密码验证）
- `portkey_get_active_wallet` — 读取共享 active wallet context
- `portkey_set_active_wallet` — 手动设置共享 active wallet context

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
- `portkey_call_view_method` — 通用合约只读调用（仅 `Get*` / view-only）
- `portkey_call_send_method` — 通用合约写调用（仅 state-changing）
- `portkey_estimate_fee` — 交易手续费预估

### eBridge（2）
- `portkey_ebridge_transfer` — eBridge 跨链转账
- `portkey_ebridge_info` — eBridge 限额和手续费

## 架构

```
index.ts (SDK)  ─┐
server.ts (MCP)  ─┼─> src/core/  ──> lib/
portkey_eoa_skill.ts (CLI)  ─┘   (纯逻辑)      (基础设施)
```

三个适配器调用同一套 Core 函数——零重复逻辑。

## 测试

```bash
bun test                    # 所有测试
bun test tests/unit/        # 单元测试
bun run tests/e2e/mcp-verify.ts  # MCP 验证
```

### IronClaw Smoke Test

等你本地装好 IronClaw 后，按下面最小流程验证：

1. `bun run ironclaw:wasm:build`
2. `bun run ironclaw:wasm:bundle`
3. `ironclaw tool install ./artifacts/ironclaw/portkey-eoa-ironclaw.wasm`
4. 启动 IronClaw，先问一个只读问题，比如“查询 ELF 余额”或“查看 token price”
5. 确认 ClawHub / installed-skill discovery 不会误导为“可直接执行写能力”

## Known Issues

- **elliptic <= 6.6.1**：`aelf-sdk` 的传递依赖 `elliptic` 存在一个 low 级别漏洞，属上游问题，等待 `aelf-sdk` 更新修复。

## License

MIT
