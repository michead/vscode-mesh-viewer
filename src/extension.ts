import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');

const DEFAULT_MATERIAL = {
  __default__: {
    Ka: [0, 0, 0],
    Kd: [0.5, 0.5, 0.5],
    Ks: [0.005, 0.005, 0.005],
    Ns: 10
  }
};

function parseMaterial(materials, mtl) {
  const materialName = mtl[0].trim().split(' ')[1];
  let material = {};
  let i = 1;
  while ( i < mtl.length && !/^newmtl/.test(mtl[i].trim())) {
    const [...tokens] = mtl[i].split(' ');
    if (tokens.length > 1) {
      switch (tokens[0]) {
        case 'Ka':
        case 'Kd':
        case 'Ks':
          material = {
            ...material,
            [tokens[0]]: [
              parseFloat(tokens[1]),
              parseFloat(tokens[2]),
              parseFloat(tokens[3])
            ]
          };
          break;
        case 'Ns':
          material = {
            ...material,
            [tokens[0]]: parseFloat(tokens[1])
          };
          break;
        default:
          // Attribute unrecongnized or currently not supported
          break;
      }
    }
    i++;
  }
  materials[materialName] = material;
  return i;
}

function mtlToMaterialObj(mtl) {
  const materials = {};
  const lines = mtl.split('\n');
  for (let i = 0; i < lines.length;) {
    while (!/^newmtl/.test(lines[i].trim())) {
      i++;
    }
    i += parseMaterial(materials, lines.splice(i));
  }
  return materials;
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('extension.openMeshPreview', (selectedItem) => {
      const fsPath = selectedItem.fsPath as string;
      const previewUri = vscode.Uri.parse(`mesh-preview://${fsPath}`);

      if (!fs.existsSync(fsPath)) {
        vscode.window.showErrorMessage('Cannot open .obj file.');
        return;
      }

      fs.readFile(fsPath, (err, data) => {
        if (err) {
          vscode.window.showErrorMessage(`Error encountered while reading .obj file: ${err.message}`);
          return;
        }

        const materials = {};
        Object.assign(materials, DEFAULT_MATERIAL);

        const lines = data.toString('utf-8').split('\n');
        for (const l of lines) {
          const line = l.trim();
          if (/^mtllib/.test(line)) {
            const mtlPath = path.resolve(path.dirname(fsPath), line.split(' ')[1]);
            if (fs.existsSync(mtlPath)) {
              Object.assign(materials, mtlToMaterialObj(fs.readFileSync(mtlPath).toString('utf-8')));
            }
          }
        }

        vscode.workspace.registerTextDocumentContentProvider('mesh-preview', {
          provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): string {
            return fs.readFileSync(path.resolve(__dirname, '../../index.html'))
              .toString('utf-8')
              .replace('${mesh}', data.toString('utf-8'))
              .replace('${material}', JSON.stringify(materials))
              .replace(/\${outPath}/g, __dirname);
          }
        });

        vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Active, 'Mesh Preview', {
          allowScripts: true,
          allowSvgs: true
        })
        // tslint:disable-next-line:no-empty
        .then(() => {}, (reason) => {
          vscode.window.showErrorMessage(reason);
        });
      });
    });

    context.subscriptions.push(disposable);
}

// tslint:disable-next-line:no-empty
export function deactivate() {}
