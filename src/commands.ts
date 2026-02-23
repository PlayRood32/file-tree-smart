// File: commands.ts
// Location: src/commands.ts

import * as vscode from 'vscode';

import {
  COMMAND_GENERATE_NO_ICONS,
  COMMAND_GENERATE_PROMPT,
  COMMAND_GENERATE_WITH_ICONS,
  EXTENSION_NAMESPACE,
} from './constants/extensionConstants';
import { resolveTargetFolder } from './folderResolver';
import { GenerationState } from './generationState';
import { buildTreeLines } from './treeBuilder';
import { formatMarkdownOutput, showMarkdownDocument } from './output';
import { TreeGenerationOptions } from './types';

interface ModePickItem extends vscode.QuickPickItem {
  withIcons: boolean;
}

export function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_GENERATE_WITH_ICONS, async (resource?: vscode.Uri) => {
      await runGenerate(resource, true);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_GENERATE_NO_ICONS, async (resource?: vscode.Uri) => {
      await runGenerate(resource, false);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_GENERATE_PROMPT, async (resource?: vscode.Uri) => {
      const pickedMode = await vscode.window.showQuickPick<ModePickItem>(
        [
          {
            label: '🌳 Generate Markdown Tree (with icons)',
            withIcons: true,
          },
          {
            label: '📄 Generate Markdown Tree (no icons)',
            withIcons: false,
          },
        ],
        {
          placeHolder: 'Choose tree generation mode',
          ignoreFocusOut: true,
        }
      );

      if (!pickedMode) {
        return;
      }

      await runGenerate(resource, pickedMode.withIcons);
    })
  );
}

async function runGenerate(resource: vscode.Uri | undefined, forcedWithIcons?: boolean): Promise<void> {
  const targetFolder = await resolveTargetFolder(resource);
  if (!targetFolder) {
    return;
  }

  const options = getGenerationOptions(forcedWithIcons);

  try {
    const state = new GenerationState(targetFolder, options);
    await state.initialize();

    const rootRules = await state.getRulesForDirectory(targetFolder, '');
    const lines = await buildTreeLines({
      currentDirUri: targetFolder,
      rootUri: targetFolder,
      prefix: '',
      depth: 1,
      options,
      state,
      activeRules: rootRules,
    });

    const treeLines = lines.length > 0 ? lines : ['└── (empty folder)'];
    const markdown = formatMarkdownOutput(targetFolder, treeLines);
    await showMarkdownDocument(markdown);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    void vscode.window.showErrorMessage(`Failed to generate Markdown tree: ${message}`);
  }
}

function getGenerationOptions(forcedWithIcons?: boolean): TreeGenerationOptions {
  const config = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);

  return {
    withIcons: forcedWithIcons ?? config.get<boolean>('defaultWithIcons', true),
    maxDepth: Math.max(1, config.get<number>('maxDepth', 12)),
    showHiddenFiles: config.get<boolean>('showHiddenFiles', false),
    respectGitignore: config.get<boolean>('respectGitignore', true),
  };
}
