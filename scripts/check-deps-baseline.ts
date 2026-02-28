#!/usr/bin/env bun
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Baseline = {
  dependencies: Record<string, string>;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function main() {
  const cwd = process.cwd();
  const baselinePath = resolve(cwd, 'deps-baseline.json');
  const packagePath = resolve(cwd, 'package.json');

  if (!existsSync(baselinePath)) {
    console.error(`[deps:check] missing deps-baseline.json at ${baselinePath}`);
    process.exit(1);
  }

  if (!existsSync(packagePath)) {
    console.error(`[deps:check] missing package.json at ${packagePath}`);
    process.exit(1);
  }

  const baseline = readJson<Baseline>(baselinePath);
  const pkg = readJson<any>(packagePath);
  const declaredDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  } as Record<string, string>;

  const failures: string[] = [];
  for (const [name, expected] of Object.entries(baseline.dependencies || {})) {
    const actual = declaredDeps[name];
    if (!actual) {
      failures.push(`${name}: missing (expected ${expected})`);
      continue;
    }
    if (actual !== expected) {
      failures.push(`${name}: expected ${expected}, got ${actual}`);
    }
  }

  if (failures.length > 0) {
    console.error('[deps:check] dependency baseline mismatch:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('[deps:check] passed');
}

main();
