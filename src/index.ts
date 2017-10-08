const canvas = document.getElementById('mesh-preview-root') as HTMLCanvasElement;
const objData = document.getElementById('mesh-preview-data').nodeValue;
const vertShader = document.getElementById('vert-shader').nodeValue;
const fragShader = document.getElementById('frag-shader').nodeValue;

let gl;

type vec3 = {
  x: Number;
  y: Number;
  z: Number;
}

type vec4 = vec3 | {
  w: number;
}

type Mesh = {
  positions: vec4;
}

function initGL(canvas: HTMLCanvasElement): void {
  gl = canvas.getContext('webgl');
  gl.viewportWidth = canvas.width;
  gl.viewportHeight = canvas.height;
}

function initShaders(vert: string, frag: string): void {
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertShader, vert);
  gl.shaderSource(fragShader, frag);

  const shaderProgram = gl.createShaderProgram();
  gl.attachShader(vertShader);
  gl.attachShader(fragShader);
  gl.linkProgram(shaderProgram);

  gl.useProgram(shaderProgram);
}

function parseMesh(meshStr: string): Mesh {
  const lines = meshStr.split('\n');

  for (const line of lines) {
    // TODO: Process line
  }

  return {
    positions: {} as any
  };
}

initGL(canvas);
initShaders(vertShader, fragShader);

const mesh = parseMesh(objData);
