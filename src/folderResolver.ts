// File: folderResolver.ts
// Location: src/folderResolver.ts

import * as vscode from 'vscode';

export async function resolveTargetFolder(resource?: vscode.Uri): Promise<vscode.Uri | undefined> {
  if (resource) {
    if (await isDirectory(resource)) {
      return resource;
    }

    void vscode.window.showErrorMessage('The selected resource is not a folder.');
    return undefined;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    void vscode.window.showErrorMessage('No workspace folder is open.');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    workspaceFolders.map((folder: vscode.WorkspaceFolder) => ({
      label: folder.name,
      description: folder.uri.fsPath,
      folder,
    })),
    {
      placeHolder: 'Select a workspace folder',
      ignoreFocusOut: true,
    }
  );

  return picked?.folder.uri;
}

async function isDirectory(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.Directory) !== 0;
  } catch {
    return false;
  }
}
