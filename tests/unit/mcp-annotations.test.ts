import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('MCP tool annotations', () => {
  const transport = new StdioClientTransport({
    command: 'bun',
    args: ['run', 'src/mcp/server.ts'],
    env: { ...process.env } as Record<string, string>,
  });

  const client = new Client({
    name: 'mcp-annotations-test',
    version: '1.0.0',
  });

  beforeAll(async () => {
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  test('local write tools expose destructive annotations without open-world hint', async () => {
    const { tools } = await client.listTools();
    const localWriteToolNames = [
      'portkey_create_wallet',
      'portkey_import_wallet',
      'portkey_backup_wallet',
      'portkey_delete_wallet',
      'portkey_set_active_wallet',
    ];

    for (const name of localWriteToolNames) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool).toBeDefined();
      expect(tool?.annotations?.destructiveHint).toBe(true);
      expect(tool?.annotations?.openWorldHint).not.toBe(true);
    }
  });

  test('network write tools expose destructive and open-world hints', async () => {
    const { tools } = await client.listTools();
    const networkWriteToolNames = [
      'portkey_transfer',
      'portkey_cross_chain_transfer',
      'portkey_approve',
      'portkey_call_send_method',
      'portkey_ebridge_transfer',
    ];

    for (const name of networkWriteToolNames) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool).toBeDefined();
      expect(tool?.annotations?.destructiveHint).toBe(true);
      expect(tool?.annotations?.openWorldHint).toBe(true);
    }
  });

  test('read tools expose read-only annotations for IronClaw routing', async () => {
    const { tools } = await client.listTools();
    const readToolNames = [
      'portkey_get_wallet_info',
      'portkey_list_wallets',
      'portkey_get_active_wallet',
      'portkey_get_token_list',
      'portkey_get_token_balance',
      'portkey_get_token_prices',
      'portkey_get_nft_collections',
      'portkey_get_nft_items',
      'portkey_get_transaction_history',
      'portkey_get_transaction_detail',
      'portkey_call_view_method',
      'portkey_estimate_fee',
      'portkey_ebridge_info',
    ];

    for (const name of readToolNames) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool).toBeDefined();
      expect(tool?.annotations?.readOnlyHint).toBe(true);
    }
  });
});
