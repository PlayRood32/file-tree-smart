// File: icons.ts
// Location: src/icons.ts

import { iconMap } from './constants/iconMap';
import { IconPatternRule } from './types';
import { normalizeRelativePath, wildcardKeyToRegex } from './utils/pathUtils';

const iconPatternRules: IconPatternRule[] = Object.entries(iconMap)
  .filter(([key]) => key.includes('*') || key.includes('/'))
  .map(([key, icon]) => ({
    regex: wildcardKeyToRegex(key),
    icon,
  }));

const extensionKeysByLength: string[] = Object.keys(iconMap)
  .filter((key) => key.startsWith('.'))
  .sort((a, b) => b.length - a.length);

export function getIcon(fileName: string, relPath: string, isDirectory: boolean, withIcons: boolean): string {
  if (!withIcons) {
    return '';
  }

  if (isDirectory) {
    return iconMap.folder ?? '📁 ';
  }

  const exactMatch = iconMap[fileName] ?? iconMap[fileName.toLowerCase()];
  if (exactMatch) {
    return exactMatch;
  }

  const normalizedRelPath = normalizeRelativePath(relPath);
  for (const rule of iconPatternRules) {
    if (rule.regex.test(normalizedRelPath)) {
      return rule.icon;
    }
  }

  const lowerName = fileName.toLowerCase();
  for (const extensionKey of extensionKeysByLength) {
    if (lowerName.endsWith(extensionKey.toLowerCase())) {
      return iconMap[extensionKey];
    }
  }

  return '📄 ';
}
