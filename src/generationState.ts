// File: generationState.ts
// Location: src/generationState.ts

import * as path from 'path';
import { readFile } from 'fs/promises';
import * as vscode from 'vscode';

import { fallbackIgnoreRules, isIgnoredByRules, parseGitignore } from './gitignore';
import { GitignoreRule, TreeGenerationOptions } from './types';
import { normalizePosixPath } from './utils/pathUtils';

export class GenerationState {
  private readonly gitignoreCache = new Map<string, GitignoreRule[]>();
  private readonly folderHasGitignoreCache = new Map<string, boolean>();

  public useFallbackIgnore = false;

  constructor(
    private readonly rootUri: vscode.Uri,
    private readonly options: TreeGenerationOptions
  ) {}

  async initialize(): Promise<void> {
    if (!this.options.respectGitignore) {
      this.useFallbackIgnore = false;
      return;
    }

    const hasGitignore = await this.detectAnyGitignore(this.rootUri, 1);
    this.useFallbackIgnore = !hasGitignore;
  }

  async getRulesForDirectory(dirUri: vscode.Uri, dirRelPath: string): Promise<GitignoreRule[]> {
    if (!this.options.respectGitignore || this.useFallbackIgnore) {
      return [];
    }

    const cacheKey = normalizePosixPath(dirUri.fsPath);
    if (this.gitignoreCache.has(cacheKey)) {
      return this.gitignoreCache.get(cacheKey) ?? [];
    }

    const gitignorePath = path.join(dirUri.fsPath, '.gitignore');
    try {
      const content = await readFile(gitignorePath, 'utf8');
      const rules = parseGitignore(content, dirRelPath);
      this.gitignoreCache.set(cacheKey, rules);
      this.folderHasGitignoreCache.set(cacheKey, true);
      return rules;
    } catch {
      this.gitignoreCache.set(cacheKey, []);
      this.folderHasGitignoreCache.set(cacheKey, false);
      return [];
    }
  }

  shouldIgnore(relPath: string, isDirectory: boolean, activeRules: GitignoreRule[]): boolean {
    if (!this.options.respectGitignore) {
      return false;
    }

    if (this.useFallbackIgnore) {
      return isIgnoredByRules(relPath, isDirectory, fallbackIgnoreRules);
    }

    return isIgnoredByRules(relPath, isDirectory, activeRules);
  }

  private async detectAnyGitignore(dirUri: vscode.Uri, depth: number): Promise<boolean> {
    if (depth > this.options.maxDepth) {
      return false;
    }

    const cacheKey = normalizePosixPath(dirUri.fsPath);
    if (this.folderHasGitignoreCache.has(cacheKey) && this.folderHasGitignoreCache.get(cacheKey)) {
      return true;
    }

    let entries: [string, vscode.FileType][] = [];
    try {
      entries = await vscode.workspace.fs.readDirectory(dirUri);
    } catch {
      return false;
    }

    const foundHere = entries.some(([name]) => name === '.gitignore');
    if (foundHere) {
      this.folderHasGitignoreCache.set(cacheKey, true);
      return true;
    }

    for (const [name, type] of entries) {
      if (type !== vscode.FileType.Directory) {
        continue;
      }

      const nextUri = vscode.Uri.joinPath(dirUri, name);
      if (await this.detectAnyGitignore(nextUri, depth + 1)) {
        return true;
      }
    }

    this.folderHasGitignoreCache.set(cacheKey, false);
    return false;
  }
}
