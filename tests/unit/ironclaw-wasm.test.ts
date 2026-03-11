import { describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';

const WASM_ROOT = fileURLToPath(new URL('../../ironclaw-wasm/', import.meta.url));
const CAPABILITIES_PATH = fileURLToPath(
  new URL('../../ironclaw-wasm/portkey-eoa-ironclaw.capabilities.json', import.meta.url),
);
const WORKFLOW_PATH = fileURLToPath(
  new URL('../../.github/workflows/ironclaw-wasm.yml', import.meta.url),
);
const BUILD_SCRIPT_PATH = fileURLToPath(
  new URL('../../scripts/release/build-ironclaw-wasm.sh', import.meta.url),
);
const PACKAGE_SCRIPT_PATH = fileURLToPath(
  new URL('../../scripts/release/package-ironclaw-bundle.sh', import.meta.url),
);
const PACKAGE_JSON_PATH = fileURLToPath(new URL('../../package.json', import.meta.url));
const QUERY_ACTIONS_PATH = fileURLToPath(
  new URL('../../ironclaw-wasm/src/actions/query.rs', import.meta.url),
);
const WALLET_ACTIONS_PATH = fileURLToPath(
  new URL('../../ironclaw-wasm/src/actions/wallet.rs', import.meta.url),
);

describe('IronClaw native-wasm contract', () => {
  test('ships the sidecar layout expected by the hub catalog', async () => {
    expect(await Bun.file(`${WASM_ROOT}Cargo.toml`).exists()).toBe(true);
    expect(await Bun.file(`${WASM_ROOT}src/lib.rs`).exists()).toBe(true);
    expect(await Bun.file(`${WASM_ROOT}wit/tool.wit`).exists()).toBe(true);
    expect(await Bun.file(CAPABILITIES_PATH).exists()).toBe(true);
    expect(await Bun.file(BUILD_SCRIPT_PATH).exists()).toBe(true);
    expect(await Bun.file(PACKAGE_SCRIPT_PATH).exists()).toBe(true);
  });

  test('declares native capabilities for http, memory bridge, and isolated workspace state', async () => {
    const capabilities = JSON.parse(await Bun.file(CAPABILITIES_PATH).text()) as {
      version: string;
      capabilities: {
        http?: { allowlist?: Array<{ host: string; path_prefix?: string }> };
        tool_invoke?: { aliases?: Record<string, string> };
        workspace?: { allowed_prefixes?: string[] };
        secrets?: unknown;
      };
    };

    expect(capabilities.capabilities.http).toBeDefined();
    expect(capabilities.capabilities.http?.allowlist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          host: '*.aelf.io',
          path_prefix: '/api/blockChain/',
        }),
        expect.objectContaining({
          host: '*.aelf.com',
          path_prefix: '/api/blockChain/',
        }),
      ]),
    );
    expect(capabilities.capabilities.tool_invoke?.aliases).toEqual(
      expect.objectContaining({
        memory_read: 'memory_read',
        memory_write: 'memory_write',
      }),
    );
    expect(capabilities.capabilities.workspace?.allowed_prefixes).toEqual(['portkey-eoa/']);
    expect(capabilities.capabilities.secrets).toBeUndefined();
  });

  test('publishes canonical scripts for staged wasm assets and tar.gz bundles', async () => {
    const pkg = JSON.parse(await Bun.file(PACKAGE_JSON_PATH).text()) as {
      version: string;
      scripts?: Record<string, string>;
    };
    const cargoToml = await Bun.file(`${WASM_ROOT}Cargo.toml`).text();
    const buildScript = await Bun.file(BUILD_SCRIPT_PATH).text();
    const packageScript = await Bun.file(PACKAGE_SCRIPT_PATH).text();

    expect(cargoToml).toContain('aelf-sdk = { version = "=0.1.0-alpha.1", default-features = false }');
    expect(pkg.scripts?.['ironclaw:wasm:build']).toBe('bash scripts/release/build-ironclaw-wasm.sh');
    expect(pkg.scripts?.['ironclaw:wasm:bundle']).toBe(
      'bash scripts/release/package-ironclaw-bundle.sh',
    );
    expect(pkg.scripts?.['ironclaw:wasm:rust-check']).toBe(
      'cargo check --manifest-path ironclaw-wasm/Cargo.toml --target wasm32-wasip2',
    );
    expect(pkg.scripts?.['wasm:check']).toBe('bun run ironclaw:wasm:rust-check');
    expect(buildScript).toContain('artifacts/ironclaw');
    expect(buildScript).toContain('portkey-eoa-ironclaw.wasm');
    expect(packageScript).toContain('portkey-eoa-ironclaw-v${VERSION}-wasm32-wasip2.tar.gz');
    expect(packageScript).toContain('portkey-eoa-ironclaw-v${VERSION}-wasm32-wasip2.sha256');
    expect(packageScript).toContain('tar -czf');
    expect(packageScript).toContain('sha256sum');
    expect(packageScript).toContain('shasum -a 256');
  });

  test('keeps version consistent across package.json, Cargo.toml, and capabilities.json', async () => {
    const pkg = JSON.parse(await Bun.file(PACKAGE_JSON_PATH).text()) as {
      version: string;
    };
    const caps = JSON.parse(await Bun.file(CAPABILITIES_PATH).text()) as {
      version: string;
    };
    const cargoToml = await Bun.file(`${WASM_ROOT}Cargo.toml`).text();
    const cargoVersion = cargoToml.match(/version\s*=\s*"([^"]+)"/)?.[1];

    expect(pkg.version).toBe(caps.version);
    expect(cargoVersion).toBeDefined();
    if (!cargoVersion) {
      throw new Error('Cargo.toml version is missing');
    }
    expect(pkg.version).toBe(cargoVersion);
  });

  test('includes a dedicated workflow to build, validate, and publish the native wasm artifact', async () => {
    const workflow = await Bun.file(WORKFLOW_PATH).text();
    expect(workflow).toContain('bun run ironclaw:wasm:test');
    expect(workflow).toContain('bun run ironclaw:wasm:check');
    expect(workflow).toContain('bun run ironclaw:wasm:build');
    expect(workflow).toContain('bun run ironclaw:wasm:bundle');
    expect(workflow).toContain('bun-version: 1.3.9');
    expect(workflow).toContain('Swatinem/rust-cache@v2');
    expect(workflow).toContain('cargo install wasm-tools --locked');
    expect(workflow).not.toContain('wasm-opt -Oz');
    expect(workflow).not.toContain('binaryen');
    expect(workflow).toContain('wasm-tools validate');
    expect(workflow).toContain('artifacts/ironclaw/*');
    expect(workflow).toContain('portkey-eoa-ironclaw-wasm-bundle');
    expect(workflow).toContain('generate_release_notes: true');
  });

  test('restores query parity fields expected by the existing JS runtime', async () => {
    const queryActions = await Bun.file(QUERY_ACTIONS_PATH).text();
    expect(queryActions).toContain('"totalRecordCount"');
    expect(queryActions).toContain('"totalBalanceInUsd"');
    expect(queryActions).toContain('"hasNextPage"');
    expect(queryActions).toContain('normalize_token_prices_response');
    expect(queryActions).toContain('normalize_transaction_detail_response');
  });

  test('keeps wallet response compatibility while adding walletExport', async () => {
    const walletActions = await Bun.file(WALLET_ACTIONS_PATH).text();
    expect(walletActions).toContain('"mnemonic"');
    expect(walletActions).toContain('"mnemonicHint"');
    expect(walletActions).toContain('"privateKey"');
    expect(walletActions).toContain('"walletExport"');
    expect(walletActions).not.toContain('"passwordGenerated"');
  });
});
