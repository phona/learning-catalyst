import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const SHARED_ROOT = path.join(PROJECT_ROOT, 'src', 'shared');
const RENDERER_ROOT = path.join(PROJECT_ROOT, 'src', 'renderer');

async function listFilesRecursively(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(fullPath)));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function extractImportSpecifiers(sourceText: string): string[] {
  const specifiers: string[] = [];

  const importFrom = /\bimport(?:\s+type)?\s+[^;]*?\sfrom\s+['"]([^'"]+)['"]/g;
  const exportFrom = /\bexport\s+[^;]*?\sfrom\s+['"]([^'"]+)['"]/g;
  const dynamicImport = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const regex of [importFrom, exportFrom, dynamicImport]) {
    for (const match of sourceText.matchAll(regex)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function resolveImportPath(specifier: string, importerPath: string): string | null {
  // Ignore bare specifiers (node_modules) and electron's builtins.
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) {
    return null;
  }

  if (specifier.startsWith('@/')) {
    return path.join(PROJECT_ROOT, 'src', specifier.slice(2));
  }

  return path.resolve(path.dirname(importerPath), specifier);
}

describe('Architecture boundaries', () => {
  it('src/shared must not import from src/renderer', async () => {
    const sharedFiles = (await listFilesRecursively(SHARED_ROOT)).filter((filePath) =>
      /\.(ts|tsx|js|jsx)$/.test(filePath),
    );

    const violations: Array<{ filePath: string; specifier: string }> = [];

    for (const filePath of sharedFiles) {
      const text = await fs.readFile(filePath, 'utf8');
      const specifiers = extractImportSpecifiers(text);

      for (const specifier of specifiers) {
        const resolved = resolveImportPath(specifier, filePath);
        if (!resolved) continue;

        const normalizedResolved = path.normalize(resolved);
        if (normalizedResolved.startsWith(RENDERER_ROOT + path.sep) || normalizedResolved === RENDERER_ROOT) {
          violations.push({
            filePath: path.relative(PROJECT_ROOT, filePath),
            specifier,
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

