import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type LineHits = Map<string, number>;

function isCoreFile(sfPath: string): boolean {
  const normalized = sfPath.replace(/\\/g, '/');
  return normalized.includes('/src/core/') || normalized.startsWith('src/core/');
}

function parseCoreLineHits(lcovText: string): LineHits {
  const lineHits: LineHits = new Map();
  let currentFile = '';

  for (const rawLine of lcovText.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('SF:')) {
      currentFile = line.slice(3);
      continue;
    }

    if (!currentFile || !isCoreFile(currentFile)) continue;

    if (line.startsWith('DA:')) {
      const payload = line.slice(3);
      const [lineNoStr, hitsStr] = payload.split(',');
      const lineNo = Number(lineNoStr);
      const hits = Number(hitsStr);
      if (!Number.isFinite(lineNo) || !Number.isFinite(hits)) continue;

      const key = `${currentFile}:${lineNo}`;
      const prev = lineHits.get(key) ?? 0;
      lineHits.set(key, Math.max(prev, hits));
    }
  }

  return lineHits;
}

function main() {
  const lcovFile = process.env.CORE_COVERAGE_FILE || 'coverage/lcov.info';
  const threshold = Number(process.env.CORE_COVERAGE_THRESHOLD || '70');
  const lcovPath = resolve(process.cwd(), lcovFile);

  const content = readFileSync(lcovPath, 'utf8');
  const hits = parseCoreLineHits(content);
  const totalLines = hits.size;
  const coveredLines = [...hits.values()].filter((n) => n > 0).length;

  if (totalLines === 0) {
    console.error(`No src/core/* coverage data found in ${lcovPath}`);
    process.exit(1);
  }

  const coverage = (coveredLines / totalLines) * 100;
  console.log(
    `Core line coverage: ${coverage.toFixed(2)}% (${coveredLines}/${totalLines}), threshold=${threshold.toFixed(2)}%`,
  );

  if (coverage < threshold) {
    console.error(
      `Core coverage gate failed: ${coverage.toFixed(2)}% < ${threshold.toFixed(2)}%`,
    );
    process.exit(1);
  }
}

main();
