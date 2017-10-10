const canvas  = document.getElementById('mesh-preview-canvas') as HTMLCanvasElement;
const objData = document.getElementById('mesh-preview-obj').innerText;
const vert    = document.getElementById('mesh-preview-vert-shader').innerText;
const frag    = document.getElementById('mesh-preview-frag-shader').innerText;

declare var mat4;

class Mesh {
  vertices: number[][];
  faces:    number[][];
}

let gl: WebGLRenderingContext;
let shaderProgram;
let mesh;
let meshVertexBuffer;
let modelViewMatUniform;
let projMatUniform;
let positionAttributeLocation;

function initGL(): void {
  gl = canvas.getContext('webgl', { antialias: true });
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
}

function initShaders(): void {
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertShader, vert);
  gl.shaderSource(fragShader, frag);

  [vertShader, fragShader].forEach(shader => {
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Error encountered while compiling shader: ${gl.getShaderInfoLog(shader)}`);
    }
  });

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertShader);
  gl.attachShader(shaderProgram, fragShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw new Error(`Error encountered while linking shaders: ${gl.getProgramInfoLog(shaderProgram)}`);
  }
  gl.useProgram(shaderProgram);
}

function parseMesh(): void {
  const lines = objData.split('\n');
  const vertices = [];
  const faces = [];

  for (const line of lines) {
    const [type, ...rest] = line.trim().split(' ');
    switch (type) {
      case 'v':
      const [x, y, z] = rest.map(n => parseFloat(n));
      vertices.push([x, y, z]);
      break;
      case 'f':
      const [a, b, c] = rest.map(n => parseInt(n) - 1);
      faces.push([a, b, c])
      break;
    }
  }

  mesh = {
    vertices,
    faces
  };
}

function initBuffers() {
  const vertices = [];
  mesh.vertices.forEach((vertex) => {
    vertices.push(vertex[0]);
    vertices.push(vertex[1]);
    vertices.push(vertex[2]);
  });
  meshVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  positionAttributeLocation = gl.getAttribLocation(shaderProgram, "position");
}

function initUniforms() {
  const modelViewMat = mat4.create();
  const projMat      = mat4.create();
  mat4.identity(modelViewMat);
  mat4.translate(modelViewMat, modelViewMat, [0, 0, -5]);
  mat4.perspective(projMat, 45, canvas.width / canvas.height, 0.1, 100);
  modelViewMatUniform = gl.getUniformLocation(shaderProgram, "modelViewMat");
  projMatUniform      = gl.getUniformLocation(shaderProgram, "projMat");
  gl.uniformMatrix4fv(modelViewMatUniform, false, modelViewMat);
  gl.uniformMatrix4fv(projMatUniform, false, projMat);
}

function draw() {
  requestAnimationFrame(draw);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBuffer);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, mesh.vertices.length);
}

initGL();
initShaders();
parseMesh();
initBuffers();
initUniforms();
draw();
