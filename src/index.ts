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
let sceneCenter = [0, 0, 0];
let meshVertexBuffer;
let meshIndexBuffer;
let modelMatUniform;
let viewMatUniform;
let projMatUniform;
let positionAttributeLocation;
let bWireframe = false;
let lMouseBtnDown = false;
let rMouseBtnDown = false;
let cameraPhi    = 0;
let cameraTheta  = 0;
let cameraArmLen = 25;
let cameraTarget = [0, 0, 0];
let cameraUp     = [0, 1, 0];
let cameraPos    = [0, 0, cameraArmLen];
let oldMouseX = 0;
let oldMouseY = 0;

document.body.addEventListener('keypress', (evt: KeyboardEvent) => {
  switch (evt.keyCode) {
    case 87:  // W
    case 119: // w
      bWireframe = !bWireframe;
      break;
  }
});

document.body.addEventListener('mousedown', (evt: MouseEvent) => {
  switch (evt.which) {
    case 1:
      if (!rMouseBtnDown) {
        lMouseBtnDown = true;
      }
      break;
    case 3:
      if (!lMouseBtnDown) {
        rMouseBtnDown = true;
      }
      break;
  }
});

document.body.addEventListener('mouseup', (evt: MouseEvent) => {
  switch (evt.which) {
    case 1:
      lMouseBtnDown = false;
      break;
    case 3:
      rMouseBtnDown = false;
      break;
  }
});

window.addEventListener('resize', (evt: Event) => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
});

document.body.addEventListener('mousemove', (evt: MouseEvent) => {
  if (lMouseBtnDown) {
    const deltaX = evt.clientX - oldMouseX;
    const deltaY = evt.clientY - oldMouseY;
    
    cameraPhi   += deltaX * 0.01;
    cameraTheta += deltaY * 0.01;
  }
  oldMouseX = evt.clientX;
  oldMouseY = evt.clientY;
});

function initGL(): void {
  gl = canvas.getContext('webgl', { antialias: true });
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.lineWidth(1);
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
  const faces    = [];

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

function computeCenter() {
  mesh.vertices.forEach((vertex) => {
    sceneCenter[0] += vertex[0];
    sceneCenter[1] += vertex[1];
    sceneCenter[2] += vertex[2];
  });
  sceneCenter[0] /= mesh.vertices.length;
  sceneCenter[1] /= mesh.vertices.length;
  sceneCenter[2] /= mesh.vertices.length;
}

function initBuffers() {
  const vertices = [];
  const indices  = [];
  mesh.vertices.forEach((vertex) => {
    vertices.push(vertex[0]);
    vertices.push(vertex[1]);
    vertices.push(vertex[2]);
  });
  mesh.faces.forEach((face) => {
    indices.push(face[0]);
    indices.push(face[1]);
    indices.push(face[2]);
  });
  meshVertexBuffer = gl.createBuffer();
  meshIndexBuffer  = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
  positionAttributeLocation = gl.getAttribLocation(shaderProgram, "position");
}

function updateCamera() {
  cameraPos = [
    cameraTarget[0] + cameraArmLen * Math.sin(cameraTheta) * Math.cos(cameraPhi),
    cameraTarget[1] + cameraArmLen * Math.sin(cameraTheta) * Math.sin(cameraPhi),
    cameraTarget[2] + cameraArmLen * Math.cos(cameraTheta)
  ];
}

function updateUniforms() {
  const modelMat = mat4.create();
  const viewMat  = mat4.create();
  const projMat  = mat4.create();
  mat4.identity(modelMat);
  mat4.translate(modelMat, modelMat, sceneCenter.map((c) => -c));
  mat4.lookAt(viewMat, cameraPos, cameraTarget, cameraUp);
  mat4.perspective(projMat, 45, canvas.width / canvas.height, 0.1, 100);
  modelMatUniform = gl.getUniformLocation(shaderProgram, "modelMat");
  viewMatUniform  = gl.getUniformLocation(shaderProgram, "viewMat");
  projMatUniform  = gl.getUniformLocation(shaderProgram, "projMat");
  gl.uniformMatrix4fv(modelMatUniform, false, modelMat);
  gl.uniformMatrix4fv(viewMatUniform, false, viewMat);
  gl.uniformMatrix4fv(projMatUniform, false, projMat);
}

function draw() {
  requestAnimationFrame(draw);
  updateCamera();
  updateUniforms();
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshIndexBuffer);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
  if (bWireframe) {
    for (let i = 0; i < mesh.faces.length; i++) {
      gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, 3 * i);
    }
  } else {
    gl.drawElements(gl.TRIANGLES, mesh.faces.length * 3, gl.UNSIGNED_SHORT, 0);
  }
}

initGL();
initShaders();
parseMesh();
computeCenter();
initBuffers();
draw();
