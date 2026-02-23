// File: types.ts
// Location: src/types.ts

import * as vscode from 'vscode';

export interface TreeGenerationOptions {
  withIcons: boolean;
  maxDepth: number;
  showHiddenFiles: boolean;
  respectGitignore: boolean;
}

export interface GitignoreRule {
  regex: RegExp;
  negated: boolean;
  directoryOnly: boolean;
  anchored: boolean;
  sourceDirRel: string;
}

export interface DirectoryEntry {
  name: string;
  uri: vscode.Uri;
  type: vscode.FileType;
  relPath: string;
  isDirectory: boolean;
}

export interface IconPatternRule {
  regex: RegExp;
  icon: string;
}
