import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');
import { Disposable } from 'vscode';
import ContentProvider from './ContentProvider';

export function activate(context: vscode.ExtensionContext) {
    const contentProvider = new ContentProvider();
    const disposable = vscode.commands.registerCommand('extension.openMeshPreview', (selectedItem) => {
      const filepath = selectedItem.fsPath;
      const filename = path.basename(filepath);
      const previewUri = vscode.Uri.parse(`mesh-preview://${filepath}`);
      vscode.workspace.registerTextDocumentContentProvider('mesh-preview', contentProvider);
      vscode.commands.executeCommand(
        'vscode.previewHtml',
        previewUri,
        vscode.ViewColumn.Active,
        `${filename} (Rendered)`, {
          allowScripts: true,
          allowSvgs: true
        }
      )
      // tslint:disable-next-line:no-empty
      .then(() => {}, (reason) => {
        vscode.window.showErrorMessage(reason);
      });
    });

    context.subscriptions.push(disposable);
}

// tslint:disable-next-line:no-empty
export function deactivate() {}
