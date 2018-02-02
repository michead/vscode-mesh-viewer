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

function imageTemplate(materialName, data, ext) {
  return `<image id="${materialName}" src="data:image/${ext};base64, ${data}"></image>`;
}

function htmlImageElements(materials, baseDir) {
  const imageElements = [];
  for (const m in materials) {
    if (materials.hasOwnProperty(m)) {
      const material = materials[m];
      if (material.map_Kd) {
        const fullPath = path.resolve(baseDir, material.map_Kd);
        const data     = fs.readFileSync(fullPath, 'base64');
        const ext      = material.map_Kd.substring(material.map_Kd.lastIndexOf('.') + 1);
        imageElements.push(imageTemplate(`${m}_map_Kd`, data, ext));
      }
    }
  }
  return imageElements;
}

function parseMaterial(materials, mtl) {
  const materialName = mtl[0].trim().split(/\s+/)[1];
  let material = {};
  let i = 1;
  while ( i < mtl.length && !/^newmtl/.test(mtl[i].trim())) {
    const [...tokens] = mtl[i].split(/\s+/);
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
        case 'map_Kd':
          material = {
            ...material,
            [tokens[0]]: tokens[1]
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
  const lines = mtl.split('\n').map((l) => l.trim());
  for (let i = 0; i < lines.length;) {
    while (!/^newmtl/.test(lines[i])) {
      i++;
    }
    i += parseMaterial(materials, lines.slice(i));
  }
  return materials;
}

export function activate(context: vscode.ExtensionContext) {
    const disposable   = vscode.commands.registerCommand('extension.openMeshPreview', (selectedItem) => {
      const fsPath     = selectedItem.fsPath as string;
      const fsDirname  = path.dirname(fsPath);
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
            const mtlPath = path.resolve(fsDirname, line.split(' ')[1]);
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
              .replace('${materials}', JSON.stringify(materials))
              .replace('${images}', htmlImageElements(materials, fsDirname).join(''))
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
