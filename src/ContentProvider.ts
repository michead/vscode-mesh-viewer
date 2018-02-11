import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');

export default class ContentProvider implements vscode.TextDocumentContentProvider {
  private static DEFAULT_MATERIAL = {
    __default__: {
      Ka: [0, 0, 0],
      Kd: [0.5, 0.5, 0.5],
      Ks: [0.005, 0.005, 0.005],
      Ns: 10,
      d: 1
    }
  };

  private static imageTemplate(id, data, ext) {
    return `<image style="display:none;" id="${id}" src="data:image/${ext};base64, ${data}"></image>`;
  }

  private static htmlImageElements(materials, baseDir) {
    const imageElements = [];
    for (const m in materials) {
      if (materials.hasOwnProperty(m)) {
        const material = materials[m];
        [
          'map_Ka',
          'map_Kd',
          'map_Ks',
          'map_Ns',
          'map_d',
        ].filter((prop) => !!material[prop]).forEach((prop) => {
          const fullPath = path.resolve(baseDir, material[prop]);
          const data     = fs.readFileSync(fullPath, 'base64');
          const ext      = material[prop].substring(material[prop].lastIndexOf('.') + 1);
          imageElements.push(ContentProvider.imageTemplate(`${m}_${prop}`, data, ext));
        });
      }
    }
    return imageElements;
  }

  private static parseMaterial(materials, mtl) {
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
          case 'd':
            material = {
              ...material,
              [tokens[0]]: parseFloat(tokens[1])
            };
            break;
          case 'Tr':
            material = {
              ...material,
              d: 1 - parseFloat(tokens[1])
            };
            break;
          case 'map_Ka':
          case 'map_Kd':
          case 'map_Ks':
          case 'map_Ns':
          case 'map_d':
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

  private static mtlToMaterialObj(mtl) {
    const materials = {};
    const lines = mtl.split('\n').map((l) => l.trim());
    for (let i = 0; i < lines.length;) {
      while (!/^newmtl/.test(lines[i])) {
        i++;
      }
      i += ContentProvider.parseMaterial(materials, lines.slice(i));
    }
    return materials;
  }
  public provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): string {
    const data = fs.readFileSync(uri.authority);
    const dirname = path.dirname(uri.authority);
    const materials = {};
    Object.assign(materials, ContentProvider.DEFAULT_MATERIAL);
    const lines = data.toString('utf-8').split('\n');
    for (const l of lines) {
      const line = l.trim();
      if (/^mtllib/.test(line)) {
        const mtlPath = path.resolve(dirname, line.split(' ')[1]);
        if (fs.existsSync(mtlPath)) {
          Object.assign(materials, ContentProvider.mtlToMaterialObj(fs.readFileSync(mtlPath).toString('utf-8')));
        }
      }
    }
    return fs.readFileSync(path.resolve(__dirname, '../../index.html'))
      .toString('utf-8')
      .replace('${mesh}', data.toString('utf-8'))
      .replace('${materials}', JSON.stringify(materials))
      .replace('${textures}', ContentProvider.htmlImageElements(materials, dirname).join(''))
      .replace(/\${outPath}/g, __dirname);
  }
}
