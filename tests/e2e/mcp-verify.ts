/**
 * MCP Server Verification Script
 *
 * Usage: bun run tests/e2e/mcp-verify.ts
 *
 * This script connects to the MCP server as a client and verifies
 * that all tools are registered and callable.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  console.log('Connecting to MCP server...\n');

  const transport = new StdioClientTransport({
    command: 'bun',
    args: ['run', 'src/mcp/server.ts'],
    env: { ...process.env } as Record<string, string>,
  });

  const client = new Client({
    name: 'mcp-verify',
    version: '1.0.0',
  });

  await client.connect(transport);

  // List all registered tools
  const { tools } = await client.listTools();
  console.log(`Registered tools: ${tools.length}\n`);

  const expectedTools = [
    'portkey_create_wallet',
    'portkey_import_wallet',
    'portkey_get_wallet_info',
    'portkey_list_wallets',
    'portkey_backup_wallet',
    'portkey_get_token_list',
    'portkey_get_token_balance',
    'portkey_get_token_prices',
    'portkey_get_nft_collections',
    'portkey_get_nft_items',
    'portkey_get_transaction_history',
    'portkey_get_transaction_detail',
    'portkey_transfer',
    'portkey_cross_chain_transfer',
    'portkey_approve',
    'portkey_call_view_method',
    'portkey_call_send_method',
    'portkey_estimate_fee',
    'portkey_ebridge_transfer',
    'portkey_ebridge_info',
  ];

  const registeredNames = tools.map((t) => t.name);
  let allFound = true;

  for (const name of expectedTools) {
    const found = registeredNames.includes(name);
    console.log(`  ${found ? 'OK' : 'MISSING'}: ${name}`);
    if (!found) allFound = false;
  }

  console.log(
    `\n${allFound ? 'ALL TOOLS REGISTERED' : 'SOME TOOLS MISSING!'}\n`,
  );

  // Call a read-only tool to verify it works
  console.log('Calling portkey_list_wallets (read-only test)...');
  try {
    const resp = await client.callTool({
      name: 'portkey_list_wallets',
      arguments: { network: 'mainnet' },
    });
    console.log('Response:', JSON.stringify(resp, null, 2));
  } catch (err) {
    console.error('Tool call error:', err);
  }

  await client.close();
  console.log('\nVerification complete.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
