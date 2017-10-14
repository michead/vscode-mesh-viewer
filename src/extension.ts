import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('extension.openMeshPreview', (selectedItem) => {
      const fsPath = selectedItem.fsPath;
      const previewUri = vscode.Uri.parse(`mesh-preview://${fsPath}`);
      
      if (!fs.existsSync(fsPath)) {
        console.error('Cannot open .obj file.');
        return;
      }

      fs.readFile(fsPath, (err, data) => {
        if (err) {
          console.error('Error encountered while reading .obj file: ', err);
          return;
        }

        vscode.workspace.registerTextDocumentContentProvider('mesh-preview', {
          provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): string {
            return fs.readFileSync(path.resolve(__dirname, '../../index.html'))
              .toString('utf-8')
              .replace('${mesh}', data.toString('utf-8'))
              .replace(/\${outPath}/g, __dirname);
          }
        });

        vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Active, 'Mesh Preview', {
          allowScripts: true,
          allowSvgs: true
        })
          .then((success) => {
          }, (reason) => {
            vscode.window.showErrorMessage(reason);
          });
      });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
}