/**
 * Workspace Boundary Guardrail Tests
 *
 * Enforces the monorepo dependency graph by scanning source files for
 * cross-package imports that violate allowed boundaries.
 *
 * Dependency graph is read from each package.json "dependencies" entry
 * with a workspace:* version.
 *
 * Any import not in this graph is a violation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const PACKAGES_DIR = path.resolve(import.meta.dirname, '..', 'packages');

const ALL_PACKAGES = ['policy-engine', 'ucp-types', 'mcp-server', 'insights', 'simulation'];

/**
 * Read allowed workspace imports from each package's package.json.
 *
 * The package manifests are the source of truth for the dependency graph;
 * this test verifies source imports stay within that declared graph.
 */
function readAllowedImports(pkg: string): string[] {
  const manifestPath = path.join(PACKAGES_DIR, pkg, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
    dependencies?: Record<string, string>;
  };

  return Object.entries(manifest.dependencies ?? {})
    .filter(
      ([name, version]) => name.startsWith('@guardrail-sim/') && version.startsWith('workspace:')
    )
    .map(([name]) => name.replace('@guardrail-sim/', ''));
}

interface Violation {
  file: string;
  line: number;
  text: string;
  importedPackage: string;
}

/**
 * Recursively collect all .ts/.tsx files in a directory,
 * skipping node_modules, dist, and test directories.
 */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'test', '__tests__'].includes(entry.name)) continue;
      results.push(...collectSourceFiles(fullPath));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extract @guardrail-sim/* imports from a file's source text.
 * Matches: from '@guardrail-sim/...', require('@guardrail-sim/...'), import('@guardrail-sim/...')
 */
function findWorkspaceImports(
  content: string
): { line: number; text: string; packageName: string }[] {
  const imports: { line: number; text: string; packageName: string }[] = [];
  const lines = content.split('\n');
  const importPattern = /(?:from\s+|require\s*\(\s*|import\s*\(\s*)['"]@guardrail-sim\/([^'"/]+)/;

  for (let i = 0; i < lines.length; i++) {
    const match = importPattern.exec(lines[i]);
    if (match) {
      imports.push({
        line: i + 1,
        text: lines[i].trim(),
        packageName: match[1],
      });
    }
  }
  return imports;
}

describe('Workspace Boundaries', () => {
  for (const pkg of ALL_PACKAGES) {
    const srcDir = path.join(PACKAGES_DIR, pkg, 'src');
    if (!fs.existsSync(srcDir)) continue;

    const allowed = readAllowedImports(pkg);
    const denied = ALL_PACKAGES.filter((p) => p !== pkg && !allowed.includes(p));

    it(`${pkg}: only imports from allowed packages [${allowed.join(', ') || 'none'}]`, () => {
      const files = collectSourceFiles(srcDir);
      const violations: Violation[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const imports = findWorkspaceImports(content);
        for (const imp of imports) {
          if (denied.includes(imp.packageName)) {
            violations.push({
              file: path.relative(PACKAGES_DIR, file),
              line: imp.line,
              text: imp.text,
              importedPackage: imp.packageName,
            });
          }
        }
      }

      if (violations.length > 0) {
        const report = violations
          .map(
            (v) =>
              `  ${v.file}:${v.line} — imports @guardrail-sim/${v.importedPackage}\n    ${v.text}`
          )
          .join('\n');
        assert.fail(
          `\n${pkg} has ${violations.length} boundary violation(s):\n${report}\n\nAllowed imports: ${allowed.length > 0 ? allowed.map((a) => `@guardrail-sim/${a}`).join(', ') : '(none)'}`
        );
      }
    });
  }
});
