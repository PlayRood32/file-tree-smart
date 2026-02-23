// File: pathUtils.ts
// Location: src/utils/pathUtils.ts

export function normalizeRelativePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\//, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
}

export function normalizePosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

export function globToRegex(input: string): string {
  const normalized = normalizeRelativePath(input);
  let regex = '';

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];

    if (char === '*') {
      const next = normalized[i + 1];
      if (next === '*') {
        const nextNext = normalized[i + 2];
        if (nextNext === '/') {
          regex += '(?:.*\\/)?';
          i += 2;
        } else {
          regex += '.*';
          i += 1;
        }
      } else {
        regex += '[^/]*';
      }
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      continue;
    }

    if (char === '[') {
      const closingIndex = normalized.indexOf(']', i + 1);
      if (closingIndex > i) {
        const rawClass = normalized.slice(i + 1, closingIndex).replace(/\\/g, '\\\\');
        regex += `[${rawClass}]`;
        i = closingIndex;
        continue;
      }
    }

    if (char === '/') {
      regex += '\\/';
      continue;
    }

    regex += escapeRegex(char);
  }

  return regex;
}

export function wildcardKeyToRegex(key: string): RegExp {
  const normalized = normalizeRelativePath(key);
  const regexBody = globToRegex(normalized);
  return new RegExp(`^${regexBody}$`, 'i');
}
