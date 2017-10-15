import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');

const DEFAULT_MATERIAL = {
  Ka: [0, 0, 0],
  Kd: [0.5, 0.5, 0.5],
  Ks: [0.005, 0.005, 0.005],
  Ns: 10
};

function materialObjToMtl(obj) {
  let str = '';
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      if (Array.isArray(obj[k])) {
        str = str.concat(`${k} ${obj[k].join(' ')}`);
      } else {
        str = str.concat(`${k} ${obj[k]}`);
      }
    }
  }
  return str;
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('extension.openMeshPreview', (selectedItem) => {
      const fsPath = selectedItem.fsPath as string;
      const previewUri = vscode.Uri.parse(`mesh-preview://${fsPath}`);
      
      if (!fs.existsSync(fsPath)) {
        console.error('Cannot open .obj file.');
        return;
      }

      let mtl;
      const mtlPath = fsPath.replace(/.obj$/i, '.mtl');
      if (fs.existsSync(mtlPath)) {
        mtl = fs.readFileSync(mtlPath);
      } else {
        mtl = materialObjToMtl(DEFAULT_MATERIAL);
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
              .replace('${material}', mtl.toString('utf-8'))
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