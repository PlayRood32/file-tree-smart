// File: treeBuilder.ts
// Location: src/treeBuilder.ts

import * as path from 'path';
import * as vscode from 'vscode';

import { GenerationState } from './generationState';
import { getIcon } from './icons';
import { DirectoryEntry, GitignoreRule, TreeGenerationOptions } from './types';
import { normalizeRelativePath } from './utils/pathUtils';

interface BuildTreeLinesArgs {
  currentDirUri: vscode.Uri;
  rootUri: vscode.Uri;
  prefix: string;
  depth: number;
  options: TreeGenerationOptions;
  state: GenerationState;
  activeRules: GitignoreRule[];
}

export async function buildTreeLines(args: BuildTreeLinesArgs): Promise<string[]> {
  const { currentDirUri, rootUri, prefix, depth, options, state, activeRules } = args;

  let rawEntries: [string, vscode.FileType][] = [];
  try {
    rawEntries = await vscode.workspace.fs.readDirectory(currentDirUri);
  } catch {
    return [];
  }

  const entries: DirectoryEntry[] = rawEntries.map(([name, type]) => {
    const uri = vscode.Uri.joinPath(currentDirUri, name);
    const relPath = normalizeRelativePath(path.relative(rootUri.fsPath, uri.fsPath));
    return {
      name,
      uri,
      type,
      relPath,
      isDirectory: (type & vscode.FileType.Directory) !== 0,
    };
  });

  const visibleEntries = entries.filter((entry) => {
    if (entry.name === '.gitignore') {
      return false;
    }

    if (!options.showHiddenFiles && entry.name.startsWith('.')) {
      return false;
    }

    if (state.shouldIgnore(entry.relPath, entry.isDirectory, activeRules)) {
      return false;
    }

    return true;
  });

  visibleEntries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  if (visibleEntries.length === 0) {
    return [`${prefix}└── (empty folder)`];
  }

  const lines: string[] = [];

  for (let i = 0; i < visibleEntries.length; i += 1) {
    const entry = visibleEntries[i];
    const isLast = i === visibleEntries.length - 1;
    const branch = isLast ? '└──' : '├──';
    const icon = getIcon(entry.name, entry.relPath, entry.isDirectory, options.withIcons);
    lines.push(`${prefix}${branch} ${icon}${entry.name}`);

    if (!entry.isDirectory || depth >= options.maxDepth) {
      continue;
    }

    let childRules = activeRules;
    if (options.respectGitignore && !state.useFallbackIgnore) {
      const childDirRules = await state.getRulesForDirectory(entry.uri, entry.relPath);
      if (childDirRules.length > 0) {
        childRules = [...activeRules, ...childDirRules];
      }
    }

    const childPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
    const childLines = await buildTreeLines({
      currentDirUri: entry.uri,
      rootUri,
      prefix: childPrefix,
      depth: depth + 1,
      options,
      state,
      activeRules: childRules,
    });

    lines.push(...childLines);
  }

  return lines;
}
