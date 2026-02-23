// File: gitignore.ts
// Location: src/gitignore.ts

import { FALLBACK_IGNORE_SET } from './constants/ignorePatterns';
import { GitignoreRule } from './types';
import { escapeRegex, globToRegex, normalizeRelativePath } from './utils/pathUtils';

export function parseGitignore(content: string, sourceDirRel: string): GitignoreRule[] {
  const lines = content.split(/\r?\n/);
  const rules: GitignoreRule[] = [];

  for (const rawLine of lines) {
    const parsed = parseIgnorePattern(rawLine, sourceDirRel);
    if (parsed) {
      rules.push(parsed);
    }
  }

  return rules;
}

export function parseIgnorePattern(rawLine: string, sourceDirRel: string): GitignoreRule | undefined {
  let line = rawLine.replace(/\r$/, '');
  if (!line.trim()) {
    return undefined;
  }

  if (line.startsWith('\\#')) {
    line = line.slice(1);
  } else if (line.startsWith('#')) {
    return undefined;
  }

  let negated = false;
  if (line.startsWith('\\!')) {
    line = line.slice(1);
  } else if (line.startsWith('!')) {
    negated = true;
    line = line.slice(1);
  }

  line = line.trim();
  if (!line) {
    return undefined;
  }

  let directoryOnly = false;
  if (line.endsWith('/')) {
    directoryOnly = true;
    line = line.slice(0, -1);
  }

  if (!line) {
    return undefined;
  }

  let anchored = false;
  if (line.startsWith('/')) {
    anchored = true;
    line = line.slice(1);
  }

  if (!line) {
    return undefined;
  }

  const regex = compileIgnoreRuleRegex(line, sourceDirRel, anchored, directoryOnly);

  return {
    regex,
    negated,
    directoryOnly,
    anchored,
    sourceDirRel,
  };
}

function compileIgnoreRuleRegex(
  pattern: string,
  sourceDirRel: string,
  anchored: boolean,
  directoryOnly: boolean
): RegExp {
  const normalizedPattern = normalizeRelativePath(pattern);
  const sourcePrefix = normalizeRelativePath(sourceDirRel);
  const escapedSourcePrefix = sourcePrefix ? `${escapeRegex(sourcePrefix)}\\/` : '';
  const containsSlash = normalizedPattern.includes('/');
  const body = globToRegex(normalizedPattern);

  let prefix = `^${escapedSourcePrefix}`;
  if (!anchored && !containsSlash) {
    prefix += '(?:.*\\/)?';
  }

  const suffix = directoryOnly ? '(?:\\/.*)$' : '$';
  return new RegExp(`${prefix}${body}${suffix}`);
}

export function isIgnoredByRules(relPath: string, isDirectory: boolean, rules: GitignoreRule[]): boolean {
  const normalizedRelPath = normalizeRelativePath(relPath);
  const normalizedTestPath = isDirectory ? `${normalizedRelPath}/` : normalizedRelPath;
  let ignored = false;

  for (const rule of rules) {
    if (rule.regex.test(normalizedTestPath)) {
      ignored = !rule.negated;
    }
  }

  return ignored;
}

export const fallbackIgnoreRules: GitignoreRule[] = Array.from(FALLBACK_IGNORE_SET)
  .map((pattern) => parseIgnorePattern(pattern, ''))
  .filter((rule): rule is GitignoreRule => Boolean(rule));
